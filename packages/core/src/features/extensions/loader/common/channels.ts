/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "../../../../common/utils/channel/message-channel-listener-injection-token";
import type { RequestChannel } from "../../../../common/utils/channel/request-channel-listener-injection-token";
import type { InstalledExtension } from "../../../../extensions/common-api";
import type { LensExtensionId } from "../../../../extensions/lens-extension";

export const loadedExtensionsChannel: RequestChannel<void, [LensExtensionId, InstalledExtension][]> = {
  id: "loaded-extensions",
};

export const extensionStateUpdateChannel: MessageChannel<[LensExtensionId, InstalledExtension]> = {
  id: "add-extension",
};

export const removeExtensionChannel: MessageChannel<LensExtensionId> = {
  id: "remove-extension",
};

export const bundledExtensionsLoadedChannel: MessageChannel<void> = {
  id: "bundled-extensions-loaded",
};
