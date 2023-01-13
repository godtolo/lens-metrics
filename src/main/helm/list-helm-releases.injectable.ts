/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import execHelmInjectable from "./exec-helm/exec-helm.injectable";
import { isObject, toCamelCase } from "../../common/utils";

export type ListHelmReleases = (pathToKubeconfig: string, namespace?: string) => Promise<Record<string, any>[]>;

const listHelmReleasesInjectable = getInjectable({
  id: "list-helm-releases",
  instantiate: (di): ListHelmReleases => {
    const execHelm = di.inject(execHelmInjectable);

    return async (pathToKubeconfig, namespace) => {
      const args = [
        "ls",
        "--all",
        "--output", "json",
      ];

      if (namespace) {
        args.push("-n", namespace);
      } else {
        args.push("--all-namespaces");
      }

      args.push("--kubeconfig", pathToKubeconfig);

      const helmResult = await execHelm(args);

      if (!helmResult.callWasSuccessful) {
        throw helmResult.error;
      }

      const output = JSON.parse(helmResult.response);

      if (!Array.isArray(output) || output.length == 0) {
        return [];
      }

      return output.filter(isObject).map(toCamelCase);
    };
  },
});

export default listHelmReleasesInjectable;
