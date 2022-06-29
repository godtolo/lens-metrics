/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import React from "react";
import { AutoUpdateComponent } from "./auto-update-status-bar-item";
import { statusBarItemInjectionToken } from "./status-bar-item-injection-token";

const autoUpdateStatusBarItemInjectable = getInjectable({
  id: "quit-app-separator-tray-item",

  instantiate: () => ({
    component: () => <AutoUpdateComponent data-testid="auto-update-component" />,
    position: "left" as const,
    visible: computed(() => true),
  }),

  injectionToken: statusBarItemInjectionToken,
});

export default autoUpdateStatusBarItemInjectable;
