import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { act, RenderResult } from "@testing-library/react";
import type { CheckForPlatformUpdates } from "../../main/application-update/check-for-platform-updates/check-for-platform-updates.injectable";
import checkForPlatformUpdatesInjectable from "../../main/application-update/check-for-platform-updates/check-for-platform-updates.injectable";
import type { DownloadPlatformUpdate } from "../../main/application-update/download-platform-update/download-platform-update.injectable";
import downloadPlatformUpdateInjectable from "../../main/application-update/download-platform-update/download-platform-update.injectable";
import publishIsConfiguredInjectable from "../../main/application-update/publish-is-configured.injectable";
import periodicalCheckForUpdateWarningInjectable from "../../main/application-update/update-warning-level/periodical-check-for-update-warning.injectable";
import electronUpdaterIsActiveInjectable from "../../main/electron-app/features/electron-updater-is-active.injectable";
import closeWindowInjectable from "../../renderer/components/layout/top-bar/close-window.injectable";
import goBackInjectable from "../../renderer/components/layout/top-bar/go-back.injectable";
import goForwardInjectable from "../../renderer/components/layout/top-bar/go-forward.injectable";
import maximizeWindowInjectable from "../../renderer/components/layout/top-bar/maximize-window.injectable";
import openAppContextMenuInjectable from "../../renderer/components/layout/top-bar/open-app-context-menu.injectable";
import toggleMaximizeWindowInjectable from "../../renderer/components/layout/top-bar/toggle-maximize-window.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import restartAndInstallUpdateInjectable from "../../renderer/components/update-button/restart-and-install-update.injectable";

function daysToMilliseconds(days: number) {
  return Math.round(days * 24 * 60 * 60 * 1000);
}

describe("encourage user to update when sufficient time passed since update was downloaded", () => {
  let applicationBuilder: ApplicationBuilder;
  let checkForPlatformUpdatesMock: AsyncFnMock<CheckForPlatformUpdates>;
  let downloadPlatformUpdateMock: AsyncFnMock<DownloadPlatformUpdate>;
  let restartAndInstallUpdate: jest.MockedFunction<() => void>;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();

    applicationBuilder.beforeApplicationStart(({ mainDi, rendererDi }) => {
      checkForPlatformUpdatesMock = asyncFn();
      downloadPlatformUpdateMock = asyncFn();

      mainDi.override(
        checkForPlatformUpdatesInjectable,
        () => checkForPlatformUpdatesMock,
      );

      mainDi.override(
        downloadPlatformUpdateInjectable,
        () => downloadPlatformUpdateMock,
      );

      mainDi.override(electronUpdaterIsActiveInjectable, () => true);
      mainDi.override(publishIsConfiguredInjectable, () => true);

      mainDi.unoverride(periodicalCheckForUpdateWarningInjectable);
      mainDi.permitSideEffects(periodicalCheckForUpdateWarningInjectable);

      rendererDi.override(restartAndInstallUpdateInjectable, () => restartAndInstallUpdate = jest.fn());

      // TODO: Remove below lines when TopBar are free from side-effects
      rendererDi.unoverride(openAppContextMenuInjectable);
      rendererDi.unoverride(goBackInjectable);
      rendererDi.unoverride(goForwardInjectable);
      rendererDi.unoverride(closeWindowInjectable);
      rendererDi.unoverride(maximizeWindowInjectable);
      rendererDi.unoverride(toggleMaximizeWindowInjectable);

      rendererDi.permitSideEffects(openAppContextMenuInjectable);
      rendererDi.permitSideEffects(goBackInjectable);
      rendererDi.permitSideEffects(goForwardInjectable);
      rendererDi.permitSideEffects(closeWindowInjectable);
      rendererDi.permitSideEffects(maximizeWindowInjectable);
      rendererDi.permitSideEffects(toggleMaximizeWindowInjectable);
    })
  });

  describe("when started", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      rendered = await applicationBuilder.render();
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("does not show update button yet", () => {
      const button = rendered.queryByTestId("update-button");

      expect(button).toBeNull();
    });

    describe("given the update check", () => {
      let processCheckingForUpdatesPromise: Promise<void>;

      beforeEach(async () => {
        // TODO: initiate update check process automatically, not from tray
        processCheckingForUpdatesPromise = applicationBuilder.tray.click("check-for-updates");
      });

      describe("when update downloaded", () => {
        beforeEach(async () => {
          await checkForPlatformUpdatesMock.resolve({
            updateWasDiscovered: true,
            version: "some-version",
          });
          await downloadPlatformUpdateMock.resolve({ downloadWasSuccessful: true });
          await processCheckingForUpdatesPromise;
        });

        it("shows update button to help user to update", () => {
          const button = rendered.queryByTestId("update-button");
  
          expect(button).toBeInTheDocument();
        })

        it("has soft emotional indication in the button", () => {
          const button = rendered.getByTestId("update-button");

          expect(button).toHaveAttribute("data-warning-level", "light")
        })

        describe("when button is clicked", () => {
          it("shows dropdown with update item", () => {
            const button = rendered.queryByTestId("update-button");

            act(() => button?.click());

            expect(rendered.getByTestId("update-lens-menu-item")).toBeInTheDocument();
          })

          it("when selected update now, restarts the application to update", () => {
            const button = rendered.queryByTestId("update-button");

            act(() => button?.click());

            const updateMenuItem = rendered.getByTestId("update-lens-menu-item");

            act(() => updateMenuItem?.click());

            expect(restartAndInstallUpdate).toBeCalled();
          })

          describe("when dropdown closed without clicking update item", () => {
            it("does not restart the application to update", async () => {
              const button = rendered.queryByTestId("update-button");

              act(() => button?.click());
              
              act(() => button?.click());

              expect(restartAndInstallUpdate).not.toBeCalled();
            })
          })
        })

        describe("given just enough time passes for medium update encouragement", () => {
          beforeAll(() => {
            jest.useFakeTimers();
          })

          it("has medium emotional indication in the button", () => {
            const button = rendered.getByTestId("update-button");

            jest.advanceTimersByTime(daysToMilliseconds(22));

            expect(button).toHaveAttribute("data-warning-level", "medium")
          })

          afterAll(() => {
            jest.useRealTimers();
          })
        })

        describe("given just enough time passes for severe update encouragement", () => {
          beforeAll(() => {
            jest.useFakeTimers();
          })

          it("has severe emotional indication in the button", () => {
            const button = rendered.getByTestId("update-button");

            jest.advanceTimersByTime(daysToMilliseconds(26));

            expect(button).toHaveAttribute("data-warning-level", "high")
          })

          afterAll(() => {
            jest.useRealTimers();
          })
        })
      });
    });
  });
});