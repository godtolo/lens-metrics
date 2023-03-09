/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "../../common/ipc/cluster";
import type { IObservableValue, ObservableSet } from "mobx";
import { action, makeObservable, observe, reaction, toJS } from "mobx";
import type { Cluster } from "../../common/cluster/cluster";
import { isErrnoException } from "../../common/utils";
import { isKubernetesCluster, KubernetesCluster, LensKubernetesClusterStatus } from "../../common/catalog-entities/kubernetes-cluster";
import { ipcMainOn } from "../../common/ipc";
import { once } from "lodash";
import type { ClusterStore } from "../../common/cluster-store/cluster-store";
import type { ClusterId } from "../../common/cluster-types";
import type { CatalogEntityRegistry } from "../catalog";
import type { Logger } from "../../common/logger";
import type { UpdateEntityMetadata } from "./update-entity-metadata.injectable";
import type { UpdateEntitySpec } from "./update-entity-spec.injectable";

const logPrefix = "[CLUSTER-MANAGER]:";

const lensSpecificClusterStatuses: Set<string> = new Set(Object.values(LensKubernetesClusterStatus));

interface Dependencies {
  readonly store: ClusterStore;
  readonly catalogEntityRegistry: CatalogEntityRegistry;
  readonly clustersThatAreBeingDeleted: ObservableSet<ClusterId>;
  readonly visibleCluster: IObservableValue<ClusterId | null>;
  readonly logger: Logger;
  readonly updateEntityMetadata: UpdateEntityMetadata;
  readonly updateEntitySpec: UpdateEntitySpec;
}

export class ClusterManager {
  constructor(private readonly dependencies: Dependencies) {
    makeObservable(this);
  }

  init = once(() => {
    // reacting to every cluster's state change and total amount of items
    reaction(
      () => this.dependencies.store.clustersList.map(c => c.getState()),
      () => this.updateCatalog(this.dependencies.store.clustersList),
      { fireImmediately: false },
    );

    // reacting to every cluster's preferences change and total amount of items
    reaction(
      () => this.dependencies.store.clustersList.map(c => toJS(c.preferences)),
      () => this.updateCatalog(this.dependencies.store.clustersList),
      { fireImmediately: false },
    );

    reaction(
      () => this.dependencies.catalogEntityRegistry.filterItemsByPredicate(isKubernetesCluster),
      entities => this.syncClustersFromCatalog(entities),
    );

    reaction(() => [
      this.dependencies.catalogEntityRegistry.filterItemsByPredicate(isKubernetesCluster),
      this.dependencies.visibleCluster.get(),
    ] as const, ([entities, visibleCluster]) => {
      for (const entity of entities) {
        if (entity.getId() === visibleCluster) {
          entity.status.active = true;
        } else {
          entity.status.active = false;
        }
      }
    });

    observe(this.dependencies.clustersThatAreBeingDeleted, change => {
      if (change.type === "add") {
        this.updateEntityStatus(this.dependencies.catalogEntityRegistry.findById(change.newValue) as KubernetesCluster);
      }
    });

    ipcMainOn("network:offline", this.onNetworkOffline);
    ipcMainOn("network:online", this.onNetworkOnline);
  });

  @action
  protected updateCatalog(clusters: Cluster[]) {
    this.dependencies.logger.debug("[CLUSTER-MANAGER]: updating catalog from cluster store");

    for (const cluster of clusters) {
      this.updateEntityFromCluster(cluster);
    }
  }

  protected updateEntityFromCluster(cluster: Cluster) {
    const index = this.dependencies.catalogEntityRegistry.items.findIndex((entity) => entity.getId() === cluster.id);

    if (index === -1) {
      return;
    }

    const entity = this.dependencies.catalogEntityRegistry.items[index] as KubernetesCluster;

    this.updateEntityStatus(entity, cluster);

    this.dependencies.updateEntityMetadata(entity, cluster);
    this.dependencies.updateEntitySpec(entity, cluster);

    this.dependencies.catalogEntityRegistry.items.splice(index, 1, entity);
  }

  @action
  protected updateEntityStatus(entity: KubernetesCluster, cluster?: Cluster) {
    if (this.dependencies.clustersThatAreBeingDeleted.has(entity.getId())) {
      entity.status.phase = LensKubernetesClusterStatus.DELETING;
      entity.status.enabled = false;
    } else {
      entity.status.phase = (() => {
        if (!cluster) {
          this.dependencies.logger.silly(`${logPrefix} setting entity ${entity.getName()} to DISCONNECTED, reason="no cluster"`);

          return LensKubernetesClusterStatus.DISCONNECTED;
        }

        if (cluster.accessible) {
          this.dependencies.logger.silly(`${logPrefix} setting entity ${entity.getName()} to CONNECTED, reason="cluster is accessible"`);

          return LensKubernetesClusterStatus.CONNECTED;
        }

        if (!cluster.disconnected) {
          this.dependencies.logger.silly(`${logPrefix} setting entity ${entity.getName()} to CONNECTING, reason="cluster is not disconnected"`);

          return LensKubernetesClusterStatus.CONNECTING;
        }

        // Extensions are not allowed to use the Lens specific status phases
        if (!lensSpecificClusterStatuses.has(entity?.status?.phase)) {
          this.dependencies.logger.silly(`${logPrefix} not clearing entity ${entity.getName()} status, reason="custom string"`);

          return entity.status.phase;
        }

        this.dependencies.logger.silly(`${logPrefix} setting entity ${entity.getName()} to DISCONNECTED, reason="fallthrough"`);

        return LensKubernetesClusterStatus.DISCONNECTED;
      })();

      entity.status.enabled = true;
    }
  }

  @action
  protected syncClustersFromCatalog(entities: KubernetesCluster[]) {
    for (const entity of entities) {
      const cluster = this.dependencies.store.getById(entity.getId());

      if (!cluster) {
        const model = {
          id: entity.getId(),
          kubeConfigPath: entity.spec.kubeconfigPath,
          contextName: entity.spec.kubeconfigContext,
          accessibleNamespaces: entity.spec.accessibleNamespaces ?? [],
        };

        try {
          /**
           * Add the bare minimum of data to ClusterStore. And especially no
           * preferences, as those might be configured by the entity's source
           */
          this.dependencies.store.addCluster(model);
        } catch (error) {
          if (isErrnoException(error) && error.code === "ENOENT" && error.path === entity.spec.kubeconfigPath) {
            this.dependencies.logger.warn(`${logPrefix} kubeconfig file disappeared`, model);
          } else {
            this.dependencies.logger.error(`${logPrefix} failed to add cluster: ${error}`, model);
          }
        }
      } else {
        cluster.kubeConfigPath = entity.spec.kubeconfigPath;
        cluster.contextName = entity.spec.kubeconfigContext;

        if (entity.spec.accessibleNamespaces) {
          cluster.accessibleNamespaces.replace(entity.spec.accessibleNamespaces);
        }

        if (entity.spec.metrics) {
          const { source, prometheus } = entity.spec.metrics;

          if (source !== "local" && prometheus) {
            const { type, address } = prometheus;

            if (type) {
              cluster.preferences.prometheusProvider = { type };
            }

            if (address) {
              cluster.preferences.prometheus = address;
            }
          }
        }

        this.updateEntityFromCluster(cluster);
      }
    }
  }

  protected onNetworkOffline = () => {
    this.dependencies.logger.info(`${logPrefix} network is offline`);
    this.dependencies.store.clustersList.forEach((cluster) => {
      if (!cluster.disconnected) {
        cluster.online = false;
        cluster.accessible = false;
        cluster.refreshConnectionStatus().catch((e) => e);
      }
    });
  };

  protected onNetworkOnline = () => {
    this.dependencies.logger.info(`${logPrefix} network is online`);
    this.dependencies.store.clustersList.forEach((cluster) => {
      if (!cluster.disconnected) {
        cluster.refreshConnectionStatus().catch((e) => e);
      }
    });
  };

  stop() {
    this.dependencies.store.clusters.forEach((cluster: Cluster) => {
      cluster.disconnect();
    });
  }
}

export function catalogEntityFromCluster(cluster: Cluster) {
  return new KubernetesCluster({
    metadata: {
      uid: cluster.id,
      name: cluster.name,
      source: "local",
      labels: {
        ...cluster.labels,
      },
      distro: cluster.distribution,
      kubeVersion: cluster.version,
    },
    spec: {
      kubeconfigPath: cluster.kubeConfigPath,
      kubeconfigContext: cluster.contextName,
      icon: {},
    },
    status: {
      phase: cluster.disconnected
        ? LensKubernetesClusterStatus.DISCONNECTED
        : LensKubernetesClusterStatus.CONNECTED,
      reason: "",
      message: "",
      active: !cluster.disconnected,
    },
  });
}
