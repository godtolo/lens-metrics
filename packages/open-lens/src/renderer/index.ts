import "@k8slens/core/styles";
import { createContainer } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { createApp, RendererApi } from "@k8slens/core/renderer";
import { CommonApi } from "@k8slens/core/common";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";

const di = createContainer("renderer");
const app = createApp({
  di,
  mode: process.env.NODE_ENV || "development"
});

runInAction(() => {
  autoRegister({
    di,
    requireContexts: [
      require.context("./", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
      require.context("../common", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
    ],
  });
});

app.start();

export {
  React,
  ReactDOM,
  ReactRouter,
  ReactRouterDom,
  Mobx,
  MobxReact,
} from "@k8slens/core/renderer";

export const LensExtensions = {
  Renderer: RendererApi,
  Common: CommonApi,
};
