/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import populateApplicationMenuInjectable from "./main/populate-application-menu.injectable";
import { advanceFakeTime, useFakeTime } from "../../common/test-utils/use-fake-time";
import { getCompositePaths } from "../../common/utils/composite/get-composite-paths/get-composite-paths";
import { getInjectable } from "@ogre-tools/injectable";
import applicationMenuItemInjectionToken from "./main/menu-items/application-menu-item-injection-token";
import { runInAction } from "mobx";
import loggerInjectable from "../../common/logger.injectable";
import type { Logger } from "../../common/logger";

describe("handling-of-orphan-application-menu-items, given orphan menu item", () => {
  let builder: ApplicationBuilder;
  let populateApplicationMenuMock: jest.Mock;
  let logErrorMock: jest.Mock;

  beforeEach(async () => {
    useFakeTime();

    populateApplicationMenuMock = jest.fn();
    logErrorMock = jest.fn();

    builder = getApplicationBuilder();

    builder.beforeApplicationStart((mainDi) => {
      const someOrphanMenuItemInjectable = getInjectable({
        id: "some-orphan-menu-item",
        instantiate: () => ({
          kind: "sub-menu" as const,
          id: "some-item-id",
          // Note: unknown id makes this item an orphan.
          parentId: "some-unknown-parent-id",
          orderNumber: 0,
          label: "irrelevant",
        }),

        injectionToken: applicationMenuItemInjectionToken,
      });

      runInAction(() => {
        mainDi.register(someOrphanMenuItemInjectable);
      });

      mainDi.override(loggerInjectable, () => ({ error: logErrorMock }) as unknown as Logger);

      mainDi.override(
        populateApplicationMenuInjectable,
        () => populateApplicationMenuMock,
      );
    });

    await builder.startHidden();
  });

  describe("given some time passes", () => {
    let applicationMenuPaths: string[];

    beforeEach(() => {
      advanceFakeTime(100);

      applicationMenuPaths = getCompositePaths(
        populateApplicationMenuMock.mock.calls[0][0],
      );
    });

    it("keeps showing the other application menu items without throwing", () => {
      expect(applicationMenuPaths.length).toBeGreaterThan(0);
    });

    it("does not show orphan application menu item", () => {
      expect(applicationMenuPaths.find(x => x.endsWith("some-item-id")));
    });

    it("logs about bad menu item", () => {
      expect(logErrorMock).toHaveBeenCalledWith('[MENU]: cannot render menu item for missing parentIds: "some-unknown-parent-id"');
    });
  });
});
