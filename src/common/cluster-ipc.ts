import { createIpcChannel } from "./ipc";
import { ClusterId, clusterStore } from "./cluster-store";
import { tracker } from "./tracker";

export const clusterIpc = {
  activate: createIpcChannel({
    channel: "cluster:activate",
    handle: async (clusterId: ClusterId = clusterStore.activeClusterId) => {
      return clusterStore.getById(clusterId)?.activate();
    },
  }),

  disconnect: createIpcChannel({
    channel: "cluster:disconnect",
    handle: (clusterId: ClusterId = clusterStore.activeClusterId) => {
      tracker.event("cluster", "stop");
      return clusterStore.getById(clusterId)?.disconnect();
    },
  }),

  installFeature: createIpcChannel({
    channel: "cluster:install-feature",
    handle: async (clusterId: ClusterId, feature: string, config?: any) => {
      tracker.event("cluster", "install", feature);
      const cluster = clusterStore.getById(clusterId);

      if (cluster) {
        await cluster.installFeature(feature, config)
      } else {
        throw `${clusterId} is not a valid cluster id`;
      }
    }
  }),

  uninstallFeature: createIpcChannel({
    channel: "cluster:uninstall-feature",
    handle: (clusterId: ClusterId, feature: string) => {
      tracker.event("cluster", "uninstall", feature);
      return clusterStore.getById(clusterId)?.uninstallFeature(feature)
    }
  }),

  upgradeFeature: createIpcChannel({
    channel: "cluster:upgrade-feature",
    handle: (clusterId: ClusterId, feature: string, config?: any) => {
      tracker.event("cluster", "upgrade", feature);
      return clusterStore.getById(clusterId)?.upgradeFeature(feature, config)
    }
  }),
}