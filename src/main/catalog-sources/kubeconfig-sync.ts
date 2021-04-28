import { action, observable, IComputedValue, computed, ObservableMap, runInAction } from "mobx";
import { CatalogEntity, catalogEntityRegistry } from "../../common/catalog";
import { watch } from "chokidar";
import fs from "fs";
import * as uuid from "uuid";
import stream from "stream";
import { Disposer, ExtendedObservableMap, iter, Singleton } from "../../common/utils";
import logger from "../logger";
import { KubeConfig } from "@kubernetes/client-node";
import { loadConfigFromString, splitConfig, validateKubeConfig } from "../../common/kube-helpers";
import { Cluster } from "../cluster";
import { catalogEntityFromCluster } from "../cluster-manager";
import { UserStore } from "../../common/user-store";
import { ClusterStore, UpdateClusterModel } from "../../common/cluster-store";

const logPrefix = "[KUBECONFIG-SYNC]:";

export class KubeconfigSyncManager extends Singleton {
  protected sources = observable.map<string, [IComputedValue<CatalogEntity[]>, Disposer]>();
  protected syncing = false;
  protected syncListDisposer?: Disposer;

  protected static readonly syncName = "lens:kube-sync";

  @action
  startSync(port: number): void {
    if (this.syncing) {
      return;
    }

    this.syncing = true;

    logger.info(`${logPrefix} starting requested syncs`);

    catalogEntityRegistry.addComputedSource(KubeconfigSyncManager.syncName, computed(() => (
      Array.from(iter.flatMap(
        this.sources.values(),
        ([entities]) => entities.get()
      ))
    )));

    // This must be done so that c&p-ed clusters are visible
    this.startNewSync(ClusterStore.storedKubeConfigFolder, port);

    for (const filePath of UserStore.getInstance().syncKubeconfigEntries.keys()) {
      this.startNewSync(filePath, port);
    }

    this.syncListDisposer = UserStore.getInstance().syncKubeconfigEntries.observe(change => {
      switch (change.type) {
        case "add":
          this.startNewSync(change.name, port);
          break;
        case "delete":
          this.stopOldSync(change.name);
          break;
      }
    });
  }

  @action
  stopSync() {
    this.syncListDisposer?.();

    for (const filePath of this.sources.keys()) {
      this.stopOldSync(filePath);
    }

    catalogEntityRegistry.removeSource(KubeconfigSyncManager.syncName);
    this.syncing = false;
  }

  @action
  protected startNewSync(filePath: string, port: number): void {
    if (this.sources.has(filePath)) {
      // don't start a new sync if we already have one
      return void logger.debug(`${logPrefix} already syncing file/folder`, { filePath });
    }

    this.sources.set(filePath, watchFileChanges(filePath, port));

    logger.info(`${logPrefix} starting sync of file/folder`, { filePath });
    logger.debug(`${logPrefix} ${this.sources.size} files/folders watched`, { files: Array.from(this.sources.keys()) });
  }

  @action
  protected stopOldSync(filePath: string): void {
    if (!this.sources.delete(filePath)) {
      // already stopped
      return void logger.debug(`${logPrefix} no syncing file/folder to stop`, { filePath });
    }

    logger.info(`${logPrefix} stopping sync of file/folder`, { filePath });
    logger.debug(`${logPrefix} ${this.sources.size} files/folders watched`, { files: Array.from(this.sources.keys()) });
  }
}

// exported for testing
export function configToModels(config: KubeConfig, filePath: string): UpdateClusterModel[] {
  const validConfigs = [];

  for (const contextConfig of splitConfig(config)) {
    const error = validateKubeConfig(contextConfig, contextConfig.currentContext);

    if (error) {
      logger.debug(`${logPrefix} context failed validation: ${error}`, { context: contextConfig.currentContext, filePath });
    } else {
      validConfigs.push({
        kubeConfigPath: filePath,
        contextName: contextConfig.currentContext,
      });
    }
  }

  return validConfigs;
}

type RootSourceValue = [Cluster, CatalogEntity];
type RootSource = ObservableMap<string, RootSourceValue>;

// exported for testing
export function computeDiff(contents: string, source: RootSource, port: number, filePath: string): void {
  runInAction(() => {
    try {
      const rawModels = configToModels(loadConfigFromString(contents), filePath);
      const models = new Map(rawModels.map(m => [m.contextName, m]));

      logger.debug(`${logPrefix} File now has ${models.size} entries`, { filePath });

      for (const [contextName, value] of source) {
        const model = models.get(contextName);

        // remove and disconnect clusters that were removed from the config
        if (!model) {
          value[0].disconnect();
          source.delete(contextName);
          logger.debug(`${logPrefix} Removed old cluster from sync`, { filePath, contextName });
          continue;
        }

        // TODO: For the update check we need to make sure that the config itself hasn't changed.
        // Probably should make it so that cluster keeps a copy of the config in its memory and
        // diff against that

        // or update the model and mark it as not needed to be added
        value[0].updateModel(model);
        models.delete(contextName);
        logger.debug(`${logPrefix} Updated old cluster from sync`, { filePath, contextName });
      }

      for (const [contextName, model] of models) {
        // add new clusters to the source
        try {
          const cluster = new Cluster({ ...model, id: uuid.v4() });

          if (!cluster.apiUrl) {
            throw new Error("Cluster constructor failed, see above error");
          }

          const entity = catalogEntityFromCluster(cluster);

          entity.metadata.labels.KUBECONFIG_SYNC = filePath;
          source.set(contextName, [cluster, entity]);

          logger.debug(`${logPrefix} Added new cluster from sync`, { filePath, contextName });
        } catch (error) {
          logger.warn(`${logPrefix} Failed to create cluster from model: ${error}`, { filePath, contextName });
        }
      }
    } catch (error) {
      logger.warn(`${logPrefix} Failed to compute diff: ${error}`, { filePath });
      source.clear(); // clear source if we have failed so as to not show outdated information
    }
  });
}

function diffChangedConfig(filePath: string, source: RootSource, port: number): Disposer {
  logger.debug(`${logPrefix} file changed`, { filePath });

  // TODO: replace with an AbortController with fs.readFile when we upgrade to Node 16 (after it comes out)
  const fileReader = fs.createReadStream(filePath, {
    mode: fs.constants.O_RDONLY,
  });
  const readStream: stream.Readable = fileReader;
  const bufs: Buffer[] = [];
  let closed = false;

  readStream
    .on("data", chunk => bufs.push(chunk))
    .on("close", () => closed = true)
    .on("end", () => {
      if (!closed) {
        computeDiff(Buffer.concat(bufs).toString("utf-8"), source, port, filePath);
      }
    });

  return () => {
    closed = true;
    fileReader.close(); // This may not close the stream.
    // Artificially marking end-of-stream, as if the underlying resource had
    // indicated end-of-file by itself, allows the stream to close.
    // This does not cancel pending read operations, and if there is such an
    // operation, the process may still not be able to exit successfully
    // until it finishes.
    fileReader.push(null);
    fileReader.read(0);

    readStream.removeAllListeners("data");
    readStream.removeAllListeners("close");
    readStream.removeAllListeners("end");
  };
}

function watchFileChanges(filePath: string, port: number): [IComputedValue<CatalogEntity[]>, Disposer] {
  const watcher = watch(filePath, {
    followSymlinks: true,
    depth: 0, // shallow
    disableGlobbing: true,
    alwaysStat: false,
    ignoreInitial: false,
  });
  const rootSource = new ExtendedObservableMap<string, ObservableMap<string, RootSourceValue>>(observable.map);
  const derivedSource = computed(() => Array.from(iter.flatMap(rootSource.values(), from => iter.map(from.values(), child => child[1]))));
  const stoppers = new Map<string, Disposer>();

  watcher
    .on("change", (childFilePath) => {
      stoppers.get(childFilePath)();
      stoppers.set(childFilePath, diffChangedConfig(childFilePath, rootSource.getOrDefault(childFilePath), port));
    })
    .on("add", (childFilePath) => {
      stoppers.set(childFilePath, diffChangedConfig(childFilePath, rootSource.getOrDefault(childFilePath), port));
    })
    .on("unlink", (childFilePath) => {
      stoppers.get(childFilePath)();
    });

  return [derivedSource, () => watcher.close()];
}
