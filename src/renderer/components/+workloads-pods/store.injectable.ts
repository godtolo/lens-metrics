/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import podApiInjectable from "../../../common/k8s-api/endpoints/pod.api.injectable";
import createStoresAndApisInjectable from "../../create-stores-apis.injectable";
import apiManagerInjectable from "../kube-object-menu/dependencies/api-manager.injectable";
import { PodStore } from "./store";

const podStoreInjectable = getInjectable({
  id: "pod-store",
  instantiate: (di) => {
    assert(di.inject(createStoresAndApisInjectable), "podStore is only available in certain environements");

    const api = di.inject(podApiInjectable);
    const apiManager = di.inject(apiManagerInjectable);
    const store = new PodStore(api);

    apiManager.registerStore(store);

    return store;
  },
});

export default podStoreInjectable;
