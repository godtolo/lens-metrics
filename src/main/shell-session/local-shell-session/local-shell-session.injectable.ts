/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { LocalShellSession } from "./local-shell-session";
import type { Cluster } from "../../../common/cluster/cluster";
import type WebSocket from "ws";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellEnvModifiersInjectable from "../shell-env-modifier/shell-env-modifier.injectable";

interface InstantiationParameter {
  webSocket: WebSocket;
  cluster: Cluster;
  tabId: string;
}

const localShellSessionInjectable = getInjectable({
  instantiate: (di, { cluster, tabId, webSocket }: InstantiationParameter) => {
    const createKubectl = di.inject(createKubectlInjectable);
    const shellEnvModifiers = di.inject(shellEnvModifiersInjectable);

    const kubectl = createKubectl(cluster.version);

    return new LocalShellSession(kubectl, shellEnvModifiers.get(), webSocket, cluster, tabId);
  },

  lifecycle: lifecycleEnum.transient,
});

export default localShellSessionInjectable;
