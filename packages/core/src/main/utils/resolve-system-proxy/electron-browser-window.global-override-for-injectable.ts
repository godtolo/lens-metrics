/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@k8slens/test-utils";
import type { BrowserWindow, Session, WebContents } from "electron";
import electronBrowserWindowInjectable from "./electron-browser-window.injectable";

export default getGlobalOverride(
  electronBrowserWindowInjectable, 
  () => () => ({
    webContents: {
      session: {
        resolveProxy: () => "DIRECT",
      } as unknown as Session,
    } as unknown as WebContents,
  } as unknown as BrowserWindow),
);
