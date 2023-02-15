/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ObservableMap } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";

import { getOrInsertWithAsync } from "../../../common/utils";
import randomBytesInjectable from "../../../common/utils/random-bytes.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import directoryForExtensionDataInjectable from "./directory-for-extension-data.injectable";
import ensureDirInjectable from "../../../common/fs/ensure-dir.injectable";
import getHashInjectable from "./get-hash.injectable";

export type EnsureHashedDirectoryForExtension = (extensionName: string, registeredExtensions: ObservableMap<string, string>) => Promise<string>;

const ensureHashedDirectoryForExtensionInjectable = getInjectable({
  id: "ensure-hashed-directory-for-extension",

  instantiate: (di): EnsureHashedDirectoryForExtension => {
    const randomBytes = di.inject(randomBytesInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const directoryForExtensionData = di.inject(directoryForExtensionDataInjectable);
    const ensureDirectory = di.inject(ensureDirInjectable);
    const getHash = di.inject(getHashInjectable);

    return async (extensionName, registeredExtensions) => {
      const dirPath = await getOrInsertWithAsync(registeredExtensions, extensionName, async () => {
        const salt = (await randomBytes(32)).toString("hex");
        const hashedName = getHash(`${extensionName}/${salt}`);

        return joinPaths(directoryForExtensionData, hashedName);
      });

      await ensureDirectory(dirPath);

      return dirPath;
    };
  },
});

export default ensureHashedDirectoryForExtensionInjectable;
