import { handleRequest } from "./ipc";
import { ClusterId, ClusterStore } from "./cluster-store";
import { appEventBus } from "./event-bus";
import { ResourceApplier } from "../main/resource-applier";
import { ipcMain, IpcMainInvokeEvent } from "electron";
import { clusterFrameMap } from "./cluster-frames";

export const clusterActivateHandler = "cluster:activate";
export const clusterSetFrameIdHandler = "cluster:set-frame-id";
export const clusterRefreshHandler = "cluster:refresh";
export const clusterDisconnectHandler = "cluster:disconnect";
export const clusterKubectlApplyAllHandler = "cluster:kubectl-apply-all";
export const clusterKubectlDeleteAllHandler = "cluster:kubectl-delete-all";

if (ipcMain) {
  handleRequest(clusterActivateHandler, (event, clusterId: ClusterId, force = false) => {
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) {
      return cluster.activate(force);
    }
  });

  handleRequest(clusterSetFrameIdHandler, (event: IpcMainInvokeEvent, clusterId: ClusterId) => {
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) {
      clusterFrameMap.set(cluster.id, { frameId: event.frameId, processId: event.processId });

      return cluster.pushState();
    }
  });

  handleRequest(clusterRefreshHandler, (event, clusterId: ClusterId) => {
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) return cluster.refresh({ refreshMetadata: true });
  });

  handleRequest(clusterDisconnectHandler, (event, clusterId: ClusterId) => {
    appEventBus.emit({name: "cluster", action: "stop"});
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) {
      cluster.disconnect();
      clusterFrameMap.delete(cluster.id);
    }
  });

  handleRequest(clusterKubectlApplyAllHandler, async (event, clusterId: ClusterId, resources: string[], extraArgs: string[]) => {
    appEventBus.emit({name: "cluster", action: "kubectl-apply-all"});
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) {
      const applier = new ResourceApplier(cluster);

      try {
        const stdout = await applier.kubectlApplyAll(resources, extraArgs);

        return { stdout };
      } catch (error: any) {
        return { stderr: error };
      }
    } else {
      throw `${clusterId} is not a valid cluster id`;
    }
  });

  handleRequest(clusterKubectlDeleteAllHandler, async (event, clusterId: ClusterId, resources: string[], extraArgs: string[]) => {
    appEventBus.emit({name: "cluster", action: "kubectl-delete-all"});
    const cluster = ClusterStore.getInstance().getById(clusterId);

    if (cluster) {
      const applier = new ResourceApplier(cluster);

      try {
        const stdout = await applier.kubectlDeleteAll(resources, extraArgs);

        return { stdout };
      } catch (error: any) {
        return { stderr: error };
      }
    } else {
      throw `${clusterId} is not a valid cluster id`;
    }
  });
}
