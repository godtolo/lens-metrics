/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { beforeQuitOfBackEndInjectionToken } from "../../runnable-tokens/before-quit-of-back-end-injection-token";
import setupLensProxyStartableStoppableInjectable from "./startable-stoppable.injectable";

const stopSettingUpLensProxyInjectable = getInjectable({
  id: "stop-setting-up-lens-proxy",
  instantiate: (di) => {
    const setupLensProxyStartableStoppable = di.inject(setupLensProxyStartableStoppableInjectable);

    return {
      id: "stop-setting-up-lens-proxy",
      run: () => {
        setupLensProxyStartableStoppable.stop();
      },
    };
  },
  injectionToken: beforeQuitOfBackEndInjectionToken,
});

export default stopSettingUpLensProxyInjectable;
