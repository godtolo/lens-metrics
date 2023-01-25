/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "https";
import type { RequestInit } from "@k8slens/node-fetch";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import fetchInjectable from "../fetch/fetch.injectable";
import loggerInjectable from "../logger.injectable";
import type { JsonApiConfig, JsonApiData, JsonApiDependencies, JsonApiParams } from "./json-api";
import { JsonApi } from "./json-api";

export type CreateJsonApi = <Data = JsonApiData, Params extends JsonApiParams<Data> = JsonApiParams<Data>>(config: JsonApiConfig, reqInit?: RequestInit) => JsonApi<Data, Params>;

const createJsonApiInjectable = getInjectable({
  id: "create-json-api",
  instantiate: (di): CreateJsonApi => {
    const deps: JsonApiDependencies = {
      fetch: di.inject(fetchInjectable),
      logger: di.inject(loggerInjectable),
    };
    const lensProxyCert = di.inject(lensProxyCertificateInjectable);

    return (config, reqInit) => {
      if (!config.getRequestOptions) {
        config.getRequestOptions = async () => {
          const agent = new Agent({
            ca: lensProxyCert.get().cert,
          });
  
          return {
            agent,
          };
        };
      }

      return new JsonApi(deps, config, reqInit);
    };
  },
});

export default createJsonApiInjectable;
