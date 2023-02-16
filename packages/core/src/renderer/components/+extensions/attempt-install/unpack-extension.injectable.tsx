/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import getExtensionDestFolderInjectable from "./get-extension-dest-folder.injectable";
import type { Disposer } from "../../../../common/utils";
import { noop } from "../../../../common/utils";
import { extensionDisplayName } from "../../../../extensions/lens-extension";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import path from "path";
import fse from "fs-extra";
import { when } from "mobx";
import React from "react";
import type { InstallRequestValidated } from "./create-temp-files-and-validate.injectable";
import extractTarInjectable from "../../../../common/fs/extract-tar.injectable";
import loggerInjectable from "../../../../common/logger.injectable";
import showInfoNotificationInjectable from "../../notifications/show-info-notification.injectable";
import showErrorNotificationInjectable from "../../notifications/show-error-notification.injectable";
import installedUserExtensionsInjectable from "../../../../features/extensions/common/user-extensions.injectable";
import enableExtensionInjectable from "../enable-extension.injectable";
import setExtensionAsInstallingInjectable from "../../../../features/extensions/installation-states/renderer/set-as-installing.injectable";
import clearExtensionAsInstallingInjectable from "../../../../features/extensions/installation-states/renderer/clear-as-installing.injectable";

export type UnpackExtension = (request: InstallRequestValidated, disposeDownloading?: Disposer) => Promise<void>;

const unpackExtensionInjectable = getInjectable({
  id: "unpack-extension",
  instantiate: (di): UnpackExtension => {
    const getExtensionDestFolder = di.inject(getExtensionDestFolderInjectable);
    const extractTar = di.inject(extractTarInjectable);
    const logger = di.inject(loggerInjectable);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const installedUserExtensions = di.inject(installedUserExtensionsInjectable);
    const enableExtension = di.inject(enableExtensionInjectable);
    const setExtensionAsInstalling = di.inject(setExtensionAsInstallingInjectable);
    const clearExtensionAsInstalling = di.inject(clearExtensionAsInstallingInjectable);

    return async (request, disposeDownloading) => {
      const {
        id,
        fileName,
        tempFile,
        manifest: { name, version },
      } = request;

      setExtensionAsInstalling(id);
      disposeDownloading?.();

      const displayName = extensionDisplayName(name, version);
      const extensionFolder = getExtensionDestFolder(name);
      const unpackingTempFolder = path.join(
        path.dirname(tempFile),
        `${path.basename(tempFile)}-unpacked`,
      );

      logger.info(`Unpacking extension ${displayName}`, { fileName, tempFile });

      try {
      // extract to temp folder first
        await fse.remove(unpackingTempFolder).catch(noop);
        await fse.ensureDir(unpackingTempFolder);
        await extractTar(tempFile, { cwd: unpackingTempFolder });

        // move contents to extensions folder
        const unpackedFiles = await fse.readdir(unpackingTempFolder);
        let unpackedRootFolder = unpackingTempFolder;

        if (unpackedFiles.length === 1) {
        // check if %extension.tgz was packed with single top folder,
        // e.g. "npm pack %ext_name" downloads file with "package" root folder within tarball
          unpackedRootFolder = path.join(unpackingTempFolder, unpackedFiles[0]);
        }

        await fse.ensureDir(extensionFolder);
        await fse.move(unpackedRootFolder, extensionFolder, { overwrite: true });

        // wait for the loader has actually install it
        await when(() => installedUserExtensions.get().has(id));

        // Enable installed extensions by default.
        enableExtension(id);

        showInfoNotification((
          <p>
            {"Extension "}
            <b>{displayName}</b>
            {" successfully installed!"}
          </p>
        ));
      } catch (error) {
        const message = getMessageFromError(error);

        logger.info(
          `[EXTENSION-INSTALLATION]: installing ${request.fileName} has failed: ${message}`,
          { error },
        );
        showErrorNotification((
          <p>
            {"Installing extension "}
            <b>{displayName}</b>
            {" has failed: "}
            <em>{message}</em>
          </p>
        ));
      } finally {
        // Remove install state once finished
        clearExtensionAsInstalling(id);

        // clean up
        fse.remove(unpackingTempFolder).catch(noop);
        fse.unlink(tempFile).catch(noop);
      }
    };
  },
});

export default unpackExtensionInjectable;
