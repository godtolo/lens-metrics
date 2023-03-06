#!/usr/bin/env node
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import assert from "assert";
import chalk from "chalk";
import child_process, { spawn } from "child_process";
import { readFile } from "fs/promises";
import inquirer from "inquirer";
import { createInterface, ReadLine } from "readline";
import semver from "semver";
import { promisify } from "util";

type SemVer = semver.SemVer;

const { SemVer } = semver;
const exec = promisify(child_process.exec);
const execFile = promisify(child_process.execFile);

async function pipeExecFile(file: string, args: string[], opts?: { stdin: string }) {
  const p = execFile(file, args);

  p.child.stdout?.pipe(process.stdout);
  p.child.stderr?.pipe(process.stderr);

  if (opts) {
    p.child.stdin?.end(opts.stdin);
  }

  await p;
}

interface GithubPrData {
  author: {
    login: string;
  };
  labels: {
    id: string;
    name: string;
    description: string;
    color: string;
  }[];
  mergeCommit: {
    oid: string;
  };
  mergedAt: string;
  milestone: {
    number: number;
    title: string;
    description: string;
    dueOn: null | string;
  };
  number: number;
  title: string;
}

interface ExtendedGithubPrData extends Omit<GithubPrData, "mergedAt"> {
  mergedAt: Date;
}

async function getCurrentBranch(): Promise<string> {
  return (await exec("git branch --show-current")).stdout.trim();
}

async function getAbsolutePathToRepoRoot(): Promise<string> {
  return (await exec("git rev-parse --show-toplevel")).stdout.trim();
}

async function fetchAllGitTags(): Promise<string[]> {
  await execFile("git", ["fetch", "--tags", "--force"]);

  const { stdout } = await exec("git tag --list", { encoding: "utf-8" });

  return stdout
    .split(/\r?\n/)
    .map(line => line.trim());
}

function bumpPackageVersions() {
  const bumpPackages = spawn("npm", ["run", "bump-version"], {
    stdio: "inherit"
  });
  const cleaners: (() => void)[] = [
    () => bumpPackages.stdout?.unpipe(),
    () => bumpPackages.stderr?.unpipe(),
  ];
  const cleanup = () => cleaners.forEach(clean => clean());

  return new Promise<void>((resolve, reject) => {
    const onExit = (code: number | null) => {
      cleanup();
      if (code) {
        reject(new Error(`"npm run bump-version" failed with code ${code}`));
      } else {
        resolve();
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    bumpPackages.once("error", onError);
    cleaners.push(() => bumpPackages.off("error", onError));

    bumpPackages.once("exit", onExit);
    cleaners.push(() => bumpPackages.off("exit", onExit));
  });
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function findClosestVersionTagLessThanVersion(tags: string[], version: SemVer): string {
  const lessThanTags = tags
    .map((value) => semver.parse(value))
    .filter(isDefined)
    .filter(version => !version.prerelease.includes("cron"))
    .sort(semver.rcompare)
    .filter(version => semver.lte(version, version));

  assert(lessThanTags.length > 0, `Cannot find version tag less than ${version.format()}`);

  return lessThanTags[0].format();
}

async function getCurrentVersionOfSubPackage(packageName: string): Promise<SemVer> {
  const packageJson = JSON.parse(await readFile(`./packages/${packageName}/package.json`, "utf-8"));

  return new SemVer(packageJson.version);
}

async function checkCurrentWorkingDirectory(): Promise<void> {
  const repoRoot = await getAbsolutePathToRepoRoot();

  if (process.cwd() !== repoRoot) {
    console.error("It looks like you are running this script from the 'scripts' directory. This script assumes it is run from the root of the git repo");
    process.exit(1);
  }
}

function formatSemverForMilestone(version: SemVer): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function formatVersionForPickingPrs(version: SemVer): string {
  if (version.prerelease.length > 0) {
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  return `${version.major}.${version.minor}.${version.patch+1}`;
}

async function createReleaseBranchAndCommit(prBase: string, version: SemVer, prBody: string): Promise<void> {
  const prBranch = `release/v${version.format()}`;

  await pipeExecFile("git", ["checkout", "-b", prBranch]);
  await pipeExecFile("git", ["add", "lerna.json", "packages/*/package.json"]);
  await pipeExecFile("git", ["commit", "-sm", `Release ${version.format()}`]);
  await pipeExecFile("git", ["push", "--set-upstream", "origin", prBranch]);

  await pipeExecFile("gh", [
    "pr",
    "create",
    "--base", prBase,
    "--title", `Release ${version.format()}`,
    "--label", "skip-changelog",
    "--label", "release",
    "--milestone", formatSemverForMilestone(version),
    "--body-file", "-",
  ], {
    stdin: prBody,
  });
}

function sortExtendedGithubPrData(left: ExtendedGithubPrData, right: ExtendedGithubPrData): number {
  const leftAge = left.mergedAt.valueOf();
  const rightAge = right.mergedAt.valueOf();

  if (leftAge === rightAge) {
    return 0;
  }

  if (leftAge > rightAge) {
    return 1;
  }

  return -1;
}

async function getRelevantPRs(previousReleasedVersion: string): Promise<ExtendedGithubPrData[]> {
  console.log("retrieving previous 200 PRs...");

  const milestone = formatVersionForPickingPrs(await getCurrentVersionOfSubPackage("core"));
  const getMergedPrsArgs = [
    "gh",
    "pr",
    "list",
    "--limit=500", // Should be big enough, if not we need to release more often ;)
    "--state=merged",
    "--base=master",
    "--json mergeCommit,title,author,labels,number,milestone,mergedAt",
  ];

  const mergedPrs = JSON.parse((await exec(getMergedPrsArgs.join(" "), { encoding: "utf-8" })).stdout) as GithubPrData[];
  const milestoneRelevantPrs = mergedPrs.filter(pr => pr.milestone?.title === milestone);
  const relevantPrsQuery = await Promise.all(
    milestoneRelevantPrs.map(async pr => ({
      pr,
      stdout: (await exec(`git tag v${previousReleasedVersion} --no-contains ${pr.mergeCommit.oid}`)).stdout,
    })),
  );

  return relevantPrsQuery
    .filter(query => query.stdout)
    .map(query => query.pr)
    .filter(pr => pr.labels.every(label => label.name !== "skip-changelog"))
    .map(pr => ({ ...pr, mergedAt: new Date(pr.mergedAt) } as ExtendedGithubPrData))
    .sort(sortExtendedGithubPrData);
}

function formatPrEntry(pr: ExtendedGithubPrData) {
  return `- ${pr.title} (**[#${pr.number}](https://github.com/lensapp/lens/pull/${pr.number})**) https://github.com/${pr.author.login}`;
}

const isEnhancementPr = (pr: ExtendedGithubPrData) => pr.labels.some(label => label.name === "enhancement");
const isBugfixPr = (pr: ExtendedGithubPrData) => pr.labels.some(label => label.name === "bug");

const cherryPickCommitWith = (rl: ReadLine) => async (commit: string) => {
  try {
    await pipeExecFile("git", ["cherry-pick", commit]);
  } catch {
    console.error(chalk.bold("Please resolve conflicts in a separate terminal and then press enter here..."));
    await new Promise<void>(resolve => rl.once("line", () => resolve()));
  }
};

async function pickWhichPRsToUse(prs: ExtendedGithubPrData[]): Promise<ExtendedGithubPrData[]> {
  const answers = await inquirer.prompt<{ commits: number[] }>({
    type: "checkbox",
    name: `commits`,
    message: "Pick which commits to use...",
    default: [],
    choices: prs.map(pr => ({
      checked: true,
      key: pr.number,
      name: `#${pr.number}: ${pr.title} (https://github.com/lensapp/lens/pull/${pr.number})`,
      value: pr.number,
      short: `#${pr.number}`,
    })),
    loop: false,
  });

  return prs.filter(pr => answers.commits.includes(pr.number));
}

function formatChangelog(previousReleasedVersion: string, prs: ExtendedGithubPrData[]): string {
  const enhancementPrLines: string[] = [];
  const bugPrLines: string[] = [];
  const maintenancePrLines: string[] = [];

  for (const pr of prs) {
    if (isEnhancementPr(pr)) {
      enhancementPrLines.push(formatPrEntry(pr));
    } else if (isBugfixPr(pr)) {
      bugPrLines.push(formatPrEntry(pr));
    } else {
      maintenancePrLines.push(formatPrEntry(pr));
    }
  }

  if (enhancementPrLines.length > 0) {
    enhancementPrLines.unshift("## 🚀 Features", "");
    enhancementPrLines.push("");
  }

  if (bugPrLines.length > 0) {
    bugPrLines.unshift("## 🐛 Bug Fixes", "");
    bugPrLines.push("");
  }

  if (maintenancePrLines.length > 0) {
    maintenancePrLines.unshift("## 🧰 Maintenance", "");
    maintenancePrLines.push("");
  }

  return [
    `## Changes since ${previousReleasedVersion}`,
    "",
    ...enhancementPrLines,
    ...bugPrLines,
    ...maintenancePrLines,
  ].join("\n");
}

async function cherryPickCommits(prs: ExtendedGithubPrData[]): Promise<void> {
  const rl = createInterface(process.stdin);
  const cherryPickCommit = cherryPickCommitWith(rl);

  for (const pr of prs) {
    await cherryPickCommit(pr.mergeCommit.oid);
  }

  rl.close();
}

async function pickRelevantPrs(prs: ExtendedGithubPrData[], isMasterBranch: boolean): Promise<ExtendedGithubPrData[]> {
  if (isMasterBranch) {
    return prs;
  }

  let selectedPrs: ExtendedGithubPrData[];

  do {
    selectedPrs = await pickWhichPRsToUse(prs);
  } while (selectedPrs.length === 0 && (console.warn("[WARNING]: must pick at least once commit"), true));

  await cherryPickCommits(selectedPrs);

  return selectedPrs;
}

async function createRelease(): Promise<void> {
  await checkCurrentWorkingDirectory();

  const currentK8slensCoreVersion = await getCurrentVersionOfSubPackage("core");
  const prBase = await getCurrentBranch();
  const isMasterBranch = prBase === "master";
  const tags = await fetchAllGitTags();
  const previousReleasedVersion = findClosestVersionTagLessThanVersion(tags, currentK8slensCoreVersion);

  if (isMasterBranch) {
    await bumpPackageVersions();
  }

  const relevantPrs = await getRelevantPRs(previousReleasedVersion);
  const selectedPrs = await pickRelevantPrs(relevantPrs, isMasterBranch);
  const prBody = formatChangelog(previousReleasedVersion, selectedPrs);

  if (!isMasterBranch) {
    await bumpPackageVersions();
  }

  const newK8slensCoreVersion = await getCurrentVersionOfSubPackage("core");

  await createReleaseBranchAndCommit(prBase, newK8slensCoreVersion, prBody);
}

await createRelease();
