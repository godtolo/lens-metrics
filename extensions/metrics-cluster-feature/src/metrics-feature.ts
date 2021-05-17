/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Catalog, K8sApi } from "@k8slens/extensions";
import semver from "semver";
import * as path from "path";

export interface MetricsConfiguration {
  // Placeholder for Metrics config structure
  prometheus: {
    enabled: boolean;
  };
  persistence: {
    enabled: boolean;
    storageClass: string;
    size: string;
  };
  nodeExporter: {
    enabled: boolean;
  };
  kubeStateMetrics: {
    enabled: boolean;
  };
  retention: {
    time: string;
    size: string;
  };
  alertManagers: string[];
  replicas: number;
  storageClass: string;
}

export interface MetricsStatus {
  installed: boolean;
  canUpgrade: boolean;
}

export class MetricsFeature {
  name = "lens-metrics";
  latestVersion = "v2.26.0-lens1";

  protected stack: K8sApi.ResourceStack;

  constructor(protected cluster: Catalog.KubernetesCluster) {
    this.stack = new K8sApi.ResourceStack(cluster, this.name);
  }

  get resourceFolder() {
    return path.join(__dirname, "../resources/");
  }

  async install(config: MetricsConfiguration): Promise<string> {
    // Check if there are storageclasses
    const storageClassApi = K8sApi.forCluster(this.cluster, K8sApi.StorageClass);
    const scs = await storageClassApi.list();

    config.persistence.enabled = scs.some(sc => (
      sc.metadata?.annotations?.["storageclass.kubernetes.io/is-default-class"] === "true" ||
      sc.metadata?.annotations?.["storageclass.beta.kubernetes.io/is-default-class"] === "true"
    ));

    return this.stack.kubectlApplyFolder(this.resourceFolder, config, ["--prune"]);
  }

  async upgrade(config: MetricsConfiguration): Promise<string> {
    return this.install(config);
  }

  async getStatus(): Promise<MetricsStatus> {
    const status: MetricsStatus = { installed: false, canUpgrade: false};

    try {
      const statefulSet = K8sApi.forCluster(this.cluster, K8sApi.StatefulSet);
      const prometheus = await statefulSet.get({name: "prometheus", namespace: "lens-metrics"});

      if (prometheus?.kind) {
        const currentVersion = prometheus.spec.template.spec.containers[0].image.split(":")[1];

        status.installed = true;
        status.canUpgrade = semver.lt(currentVersion, this.latestVersion, true);
      } else {
        status.installed = false;
      }
    } catch(e) {
      if (e?.error?.code === 404) {
        status.installed = false;
      }
    }

    return status;
  }

  async uninstall(config: MetricsConfiguration): Promise<string> {
    return this.stack.kubectlDeleteFolder(this.resourceFolder, config);
  }
}
