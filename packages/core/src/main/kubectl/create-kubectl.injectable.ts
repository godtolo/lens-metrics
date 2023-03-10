/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { KubectlDependencies } from "./kubectl";
import { Kubectl } from "./kubectl";
import directoryForKubectlBinariesInjectable from "../../common/app-paths/directory-for-kubectl-binaries/directory-for-kubectl-binaries.injectable";
import userStoreInjectable from "../../common/user-store/user-store.injectable";
import kubectlDownloadingNormalizedArchInjectable from "./normalized-arch.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import kubectlBinaryNameInjectable from "./binary-name.injectable";
import bundledKubectlBinaryPathInjectable from "./bundled-binary-path.injectable";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import bundledKubectlVersionInjectable from "../../common/vars/bundled-kubectl-version.injectable";
import kubectlVersionMapInjectable from "./version-map.injectable";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import getBasenameOfPathInjectable from "../../common/path/get-basename.injectable";
import loggerInjectable from "../../common/logger.injectable";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import unlinkInjectable from "../../common/fs/unlink.injectable";

export type CreateKubectl = (version: string) => Kubectl;

const createKubectlInjectable = getInjectable({
  id: "create-kubectl",

  instantiate: (di): CreateKubectl => {
    const dependencies: KubectlDependencies = {
      userStore: di.inject(userStoreInjectable),
      directoryForKubectlBinaries: di.inject(directoryForKubectlBinariesInjectable),
      normalizedDownloadArch: di.inject(kubectlDownloadingNormalizedArchInjectable),
      normalizedDownloadPlatform: di.inject(normalizedPlatformInjectable),
      kubectlBinaryName: di.inject(kubectlBinaryNameInjectable),
      bundledKubectlBinaryPath: di.inject(bundledKubectlBinaryPathInjectable),
      baseBundeledBinariesDirectory: di.inject(baseBundledBinariesDirectoryInjectable),
      bundledKubectlVersion: di.inject(bundledKubectlVersionInjectable),
      kubectlVersionMap: di.inject(kubectlVersionMapInjectable),
      logger: di.inject(loggerInjectable),
      getDirnameOfPath: di.inject(getDirnameOfPathInjectable),
      joinPaths: di.inject(joinPathsInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      execFile: di.inject(execFileInjectable),
      unlink: di.inject(unlinkInjectable),
    };

    return (version) => new Kubectl(dependencies, version);
  },
});

export default createKubectlInjectable;
