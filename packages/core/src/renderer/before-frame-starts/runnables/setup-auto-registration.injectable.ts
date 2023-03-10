/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import autoRegistrationEmitterInjectable from "../../../common/k8s-api/api-manager/auto-registration-emitter.injectable";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import { CustomResourceStore } from "../../../common/k8s-api/api-manager/resource.store";
import type { CustomResourceDefinition } from "../../../common/k8s-api/endpoints";
import type { KubeApiDependencies } from "../../../common/k8s-api/kube-api";
import { KubeApi } from "../../../common/k8s-api/kube-api";
import { KubeObject } from "../../../common/k8s-api/kube-object";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";
import type { KubeObjectStoreDependencies } from "../../../common/k8s-api/kube-object.store";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import loggerInjectable from "../../../common/logger.injectable";
import maybeKubeApiInjectable from "../../../common/k8s-api/maybe-kube-api.injectable";

const setupAutoRegistrationInjectable = getInjectable({
  id: "setup-auto-registration",
  instantiate: (di) => ({
    run: () => {
      const autoRegistrationEmitter = di.inject(autoRegistrationEmitterInjectable);
      const beforeApiManagerInitializationCrds: CustomResourceDefinition[] = [];
      const beforeApiManagerInitializationApis: KubeApi[] = [];
      const kubeApiDependencies: KubeApiDependencies = {
        logger: di.inject(loggerInjectable),
        maybeKubeApi: di.inject(maybeKubeApiInjectable),
      };
      const kubeObjectStoreDependencies: KubeObjectStoreDependencies = {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectable),
      };
      let initialized = false;

      const autoInitCustomResourceStore = (crd: CustomResourceDefinition) => {
        const objectConstructor = class extends KubeObject {
          static readonly kind = crd.getResourceKind();
          static readonly namespaced = crd.isNamespaced();
          static readonly apiBase = crd.getResourceApiBase();
        };

        const api = (() => {
          const rawApi = apiManager.getApi(objectConstructor.apiBase);

          if (rawApi) {
            return rawApi;
          }

          const api = new KubeApi(kubeApiDependencies, { objectConstructor });

          apiManager.registerApi(api);

          return api;
        })();

        if (!apiManager.getStore(api)) {
          apiManager.registerStore(new CustomResourceStore(kubeObjectStoreDependencies, api));
        }
      };
      const autoInitKubeApi = (api: KubeApi) => {
        apiManager.registerApi(api);
      };

      autoRegistrationEmitter
        .on("customResourceDefinition", (crd) => {
          if (initialized) {
            autoInitCustomResourceStore(crd);
          } else {
            beforeApiManagerInitializationCrds.push(crd);
          }
        })
        .on("kubeApi", (api) => {
          if (initialized) {
            autoInitKubeApi(api);
          } else {
            beforeApiManagerInitializationApis.push(api);
          }
        });

      // NOTE: this MUST happen after the event emitter listeners are registered
      const apiManager = di.inject(apiManagerInjectable);

      beforeApiManagerInitializationCrds.forEach(autoInitCustomResourceStore);
      beforeApiManagerInitializationApis.forEach(autoInitKubeApi);
      initialized = true;
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default setupAutoRegistrationInjectable;
