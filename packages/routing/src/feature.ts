import { getFeature } from "@k8slens/feature-core";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";
import { reactApplicationFeature } from "@k8slens/react-application";

export const routingFeature = getFeature({
  id: "routing",

  register: (di) => {
    autoRegister({
      di,
      targetModule: module,
      getRequireContexts: () => [
        require.context("./", true, /\.injectable\.(ts|tsx)$/),
      ],
    });
  },

  dependencies: [reactApplicationFeature],
});
