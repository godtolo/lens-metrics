/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainer } from "@ogre-tools/injectable";
import "@testing-library/jest-dom/extend-expect";
import type { RenderResult } from "@testing-library/react";
import { computed } from "mobx";
import type { IComputedValue } from "mobx/dist/internal";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { noop } from "../../../../utils";
import type { ApplicationBuilder } from "../../../test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../test-utils/get-application-builder";
import extensionsPreferenceNavigationItemsInjectable from "../extension-preference-navigation-items.injectable";
import generalPreferenceNavigationItemsInjectable from "../general-preference-navigation-items.injectable";
import type { PreferenceNavigationItem } from "../preference-navigation-items.injectable";

describe.only("preferences - navigation block with links", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();
  });

  describe("given in preferences, when rendered", () => {
    let renderer: RenderResult;
    let di: DiContainer;

    describe("when general navigation items passed", () => {
      beforeEach(async () => {
        const generalNavItems: IComputedValue<PreferenceNavigationItem[]> = computed(() => [
          {
            id: "general",
            label: "General",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 0,
            parent: "",
          },
          {
            id: "proxy",
            label: "Proxy",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 1,
            parent: "",
          },
        ]);

        applicationBuilder.beforeApplicationStart(({ rendererDi }) => {
          rendererDi.override(
            generalPreferenceNavigationItemsInjectable,
            () => generalNavItems,
          );
        });

        applicationBuilder.beforeRender(() => {
          applicationBuilder.preferences.navigate();
        });

        di = getDiForUnitTesting({ doGeneralOverrides: true });

        renderer = await applicationBuilder.render();
      });

      const links = ["General", "Proxy"];

      it.each(links)("renders link with text content %s", (link) => {
        expect(renderer.container).toHaveTextContent(link);
      });

      it("does not show custom settings block", () => {
        expect(renderer.queryByTestId("extension-settings")).not.toBeInTheDocument();
      });
    });

    describe("when general + extension navigation items passed", () => {
      beforeEach(async () => {
        const generalNavItems: IComputedValue<PreferenceNavigationItem[]> = computed(() => [
          {
            id: "general",
            label: "General",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 0,
            parent: "",
          },
          {
            id: "proxy",
            label: "Proxy",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 1,
            parent: "",
          },
        ]);
  
        const extensionNavItems: IComputedValue<PreferenceNavigationItem[]> = computed(() => [
          {
            id: "extension-preferences-navigation-item-lensapp-node-menu",
            label: "lensapp-node-menu",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 0,
            parent: "extensions",
          },
          {
            id: "extension-preferences-navigation-item-lensapp-pod-menu",
            label: "lensapp-pod-menu",
            isActive: computed(() => false),
            isVisible: computed(() => true),
            navigate: () => noop,
            orderNumber: 0,
            parent: "extensions",
          },
          {
            id: "extension-preferences-navigation-item-metrics-plugin",
            label: "metrics-plugin",
            isActive: computed(() => false),
            isVisible: computed(() => false),
            navigate: () => noop,
            orderNumber: 0,
            parent: "extensions",
          },
        ]);
  
        applicationBuilder.beforeApplicationStart(({ rendererDi }) => {
          rendererDi.override(
            generalPreferenceNavigationItemsInjectable,
            () => generalNavItems,
          );
  
          rendererDi.override(
            extensionsPreferenceNavigationItemsInjectable,
            () => extensionNavItems,
          );
        });
  
        applicationBuilder.beforeRender(() => {
          applicationBuilder.preferences.navigate();
        });
  
        di = getDiForUnitTesting({ doGeneralOverrides: true });
  
        renderer = await applicationBuilder.render();
      });

      const generalLinks = ["General", "Proxy"];
  
      it.each(generalLinks)("renders general link with text content %s", (link) => {
        expect(renderer.container).toHaveTextContent(link);
      });
  
      it("shows custom settings block", () => {
        expect(renderer.queryByTestId("extension-settings")).toBeInTheDocument();
      });

      const extensionLinks = ["lensapp-node-menu", "lensapp-pod-menu"];

      it.each(extensionLinks)("shows extension navigation item %s", (link) => {
        expect(renderer.getByTestId(`tab-link-for-extension-preferences-navigation-item-${link}`)).toBeInTheDocument();
      });
  
      it("renders extension navigation items inside custom settings block", () => {
        const settingsBlock = renderer.getByTestId("extension-settings");
  
        expect(settingsBlock).toHaveTextContent("lensapp-node-menu");
      });
    });
  });
});
