const getNodeConfig = require("./get-node-config");
const getReactConfigFor = require("./get-react-config");
const path = require("path");
const {
  map,
  isEqual,
  keys,
  fromPairs,
  toPairs,
  reject,
  values,
  nth,
  filter,
} = require("lodash/fp");
const { pipeline } = require("@ogre-tools/fp");

module.exports = (
  packageJson,

  dependencies = {
    resolvePath: path.resolve,
    workingDirectory: process.cwd(),
    getReactConfig: getReactConfigFor()
  }
) => {
  if (!packageJson.lensMultiExportConfig) {
    throw new Error(
      `Tried to get multi export config for package "${packageJson.name}" but configuration is missing.`
    );
  }

  const validBuildTypes = ["node", "react"];

  const invalidBuildTypes = pipeline(
    packageJson.lensMultiExportConfig,
    values,
    map((config) => config.buildType),
    reject((buildType) => validBuildTypes.includes(buildType))
  );

  if (invalidBuildTypes.length > 0) {
    throw new Error(
      `Tried to get multi export config for package "${
        packageJson.name
      }" but build types "${invalidBuildTypes.join(
        '", "'
      )}" were not any of "${validBuildTypes.join('", "')}".`
    );
  }

  const exportsWithMissingEntrypoint = pipeline(
    packageJson.lensMultiExportConfig,
    toPairs,
    filter(([, config]) => !config.entrypoint),
    map(nth(0))
  );

  if (exportsWithMissingEntrypoint.length > 0) {
    throw new Error(
      `Tried to get multi export config for package "${
        packageJson.name
      }" but entrypoint was missing for "${exportsWithMissingEntrypoint.join(
        '", "'
      )}".`
    );
  }

  const expectedExports = pipeline(
    packageJson.lensMultiExportConfig,
    keys,
    map(toExpectedExport),
    fromPairs
  );

  if (!isEqual(expectedExports, packageJson.exports)) {
    throw new Error(
      `Tried to get multi export config but exports of package.json for "${
        packageJson.name
      }" did not match exactly:\n\n${JSON.stringify(expectedExports, null, 2)}`
    );
  }

  const toExportSpecificWebpackConfig =
    toExportSpecificWebpackConfigFor(dependencies);

  return pipeline(
    packageJson.lensMultiExportConfig,
    toPairs,
    map(toExportSpecificWebpackConfig)
  );
};

const toExpectedExport = (externalImportPath) => {
  const posixJoinForPackageJson = path.posix.join;

  const entrypointPath = `./${posixJoinForPackageJson(
    "./dist",
    externalImportPath,
    "index.js"
  )}`;

  return [
    externalImportPath,
    {
      types: `./${posixJoinForPackageJson(
        "./dist",
        externalImportPath,
        "index.d.ts"
      )}`,

      default: entrypointPath,
      import: entrypointPath,
      require: entrypointPath,
    },
  ];
};

const toExportSpecificWebpackConfigFor =
  (dependencies) =>
  ([externalImportPath, { buildType, entrypoint }]) => {
    const outputDirectory = dependencies.resolvePath(
      dependencies.workingDirectory,
      "dist",
      externalImportPath
    );

    return buildType === "node"
      ? getNodeConfig({
          entrypointFilePath: entrypoint,
          outputDirectory,
        })
      : dependencies.getReactConfig({
          entrypointFilePath: entrypoint,
          outputDirectory,
        });
  };
