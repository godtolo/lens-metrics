/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import clusterStoreInjectable from "../../common/cluster-store/cluster-store.injectable";
import loggerInjectable from "../../common/logger.injectable";
import catalogEntityRegistryInjectable from "../catalog/entity-registry.injectable";
import clustersThatAreBeingDeletedInjectable from "./are-being-deleted.injectable";
import { ClusterManager } from "./manager";
import updateEntityMetadataInjectable from "./update-entity-metadata.injectable";
import updateEntitySpecInjectable from "./update-entity-spec.injectable";
import visibleClusterInjectable from "./visible-cluster.injectable";

const clusterManagerInjectable = getInjectable({
  id: "cluster-manager",

  instantiate: (di) => new ClusterManager({
    store: di.inject(clusterStoreInjectable),
    catalogEntityRegistry: di.inject(catalogEntityRegistryInjectable),
    clustersThatAreBeingDeleted: di.inject(clustersThatAreBeingDeletedInjectable),
    visibleCluster: di.inject(visibleClusterInjectable),
    logger: di.inject(loggerInjectable),
    updateEntityMetadata: di.inject(updateEntityMetadataInjectable),
    updateEntitySpec: di.inject(updateEntitySpecInjectable),
  }),
});

export default clusterManagerInjectable;
