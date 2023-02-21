/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { hasTypedProperty, isObject, isString, listTarEntries, readFileFromTar } from "../../../../common/utils";
import path from "path";
import { manifestFilename } from "../../../../common/vars";
import type { LensExtensionManifest } from "../../../../features/extensions/common/installed-extension";

export async function validatePackage(filePath: string): Promise<LensExtensionManifest> {
  const tarFiles = await listTarEntries(filePath);

  // tarball from npm contains single root folder "package/*"
  const firstFile = tarFiles[0];

  if (!firstFile) {
    throw new Error(`invalid extension bundle, ${manifestFilename} not found`);
  }

  const rootFolder = path.normalize(firstFile).split(path.sep)[0];
  const packedInRootFolder = tarFiles.every(entry => entry.startsWith(rootFolder));
  const manifestLocation = packedInRootFolder
    ? path.join(rootFolder, manifestFilename)
    : manifestFilename;

  if (!tarFiles.includes(manifestLocation)) {
    throw new Error(`invalid extension bundle, ${manifestFilename} not found`);
  }

  const manifest = await readFileFromTar({
    tarPath: filePath,
    filePath: manifestLocation,
    parseJson: true,
  });

  if (
    isObject(manifest)
    && (
      hasTypedProperty(manifest, "main", isString)
      || hasTypedProperty(manifest, "renderer", isString)
    )
  ) {
    return manifest as unknown as LensExtensionManifest;
  }

  throw new Error(`${manifestFilename} must specify "main" and/or "renderer" fields`);
}
