import path from "path";
import packageInfo from "../../package.json";
import { Menu, Tray } from "electron";
import { autorun } from "mobx";
import { showAbout } from "./menu";
import { checkForUpdates } from "./app-updater";
import { WindowManager } from "./window-manager";
import { clusterStore } from "../common/cluster-store";
import { workspaceStore } from "../common/workspace-store";
import { preferencesURL } from "../renderer/components/+preferences/preferences.route";
import { clusterViewURL } from "../renderer/components/cluster-manager/cluster-view.route";
import logger from "./logger";
import { isDevelopment, isWindows } from "../common/vars";
import { exitApp } from "./exit-app";

const TRAY_LOG_PREFIX = "[TRAY]";

// note: instance of Tray should be saved somewhere, otherwise it disappears
export let tray: Tray;

export function getTrayIcon(): string {
  return path.resolve(
    __static,
    isDevelopment ? "../build/tray" : "icons", // copied within electron-builder extras
    "trayIconTemplate.png"
  );
}

export function initTray(windowManager: WindowManager) {
  const icon = getTrayIcon();

  tray = new Tray(icon);
  tray.setToolTip(packageInfo.description);
  tray.setIgnoreDoubleClickEvents(true);

  if (isWindows) {
    tray.on("click", () => {
      windowManager
        .ensureMainWindow()
        .catch(error => logger.error(`${TRAY_LOG_PREFIX}: Failed to open lens`, { error }));
    });
  }

  const disposers = [
    autorun(() => {
      try {
        const menu = createTrayMenu(windowManager);

        tray.setContextMenu(menu);
      } catch (error) {
        logger.error(`${TRAY_LOG_PREFIX}: building failed`, { error });
      }
    }),
  ];

  return () => {
    disposers.forEach(disposer => disposer());
    tray?.destroy();
    tray = null;
  };
}

function createTrayMenu(windowManager: WindowManager): Menu {
  return Menu.buildFromTemplate([
    {
      label: "Open Lens",
      click() {
        windowManager
          .ensureMainWindow()
          .catch(error => logger.error(`${TRAY_LOG_PREFIX}: Failed to open lens`, { error }));
      },
    },
    {
      label: "Preferences",
      click() {
        windowManager
          .navigate(preferencesURL())
          .catch(error => logger.error(`${TRAY_LOG_PREFIX}: Failed to nativate to Preferences`, { error }));
      },
    },
    {
      label: "Clusters",
      submenu: workspaceStore.enabledWorkspacesList
        .map(workspace => [workspace, clusterStore.getByWorkspaceId(workspace.id)] as const)
        .map(([workspace, clusters]) => ({
          label: workspace.name,
          toolTip: workspace.description,
          enabled: clusters.length > 0,
          submenu: clusters.map(({ id: clusterId, name: label, online, workspace }) => ({
            checked: online,
            type: "checkbox",
            label,
            toolTip: clusterId,
            click() {
              workspaceStore.setActive(workspace);
              windowManager
                .navigate(clusterViewURL({ params: { clusterId } }))
                .catch(error => logger.error(`${TRAY_LOG_PREFIX}: Failed to nativate to cluster`, { clusterId, error }));
            }
          }))
        })),
    },
    {
      label: "Check for updates",
      click() {
        checkForUpdates()
          .then(() => windowManager.ensureMainWindow());
      },
    },
    {
      label: "About Lens",
      click() {
        windowManager.ensureMainWindow()
          .then(showAbout)
          .catch(error => logger.error(`${TRAY_LOG_PREFIX}: Failed to show Lens About view`, { error }));
      },
    },
    { type: "separator" },
    {
      label: "Quit App",
      click() {
        exitApp();
      }
    }
  ]);
}
