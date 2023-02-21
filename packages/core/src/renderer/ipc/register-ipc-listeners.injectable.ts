/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { defaultHotbarCells } from "../../common/hotbars/types";
import { hotbarTooManyItemsChannel } from "../../common/ipc/hotbar";
import showErrorNotificationInjectable from "../components/notifications/show-error-notification.injectable";
import ipcRendererInjectable from "../utils/channel/ipc-renderer.injectable";

const registerIpcListenersInjectable = getInjectable({
  id: "register-ipc-listeners",

  instantiate: (di) => {
    const ipcRenderer = di.inject(ipcRendererInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return () => {
      ipcRenderer.on(hotbarTooManyItemsChannel, () => {
        showErrorNotification(`Cannot have more than ${defaultHotbarCells} items pinned to a hotbar`);
      });
    };
  },
});

export default registerIpcListenersInjectable;
