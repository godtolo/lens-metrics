/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { InstalledExtension } from "./extension-discovery/extension-discovery";
import { action, computed, makeObservable, observable } from "mobx";
import type { PackageJson } from "type-fest";
import { disposer } from "@k8slens/utilities";
import type { LensExtensionDependencies } from "./lens-extension-set-dependencies";
import type { ProtocolHandlerRegistration } from "../common/protocol-handler/registration";

export type LensExtensionId = string; // path to manifest (package.json)
export type LensExtensionConstructor = new (...args: ConstructorParameters<typeof LensExtension>) => LensExtension;

export interface LensExtensionManifest extends PackageJson {
  name: string;
  version: string;
  main?: string; // path to %ext/dist/main.js
  renderer?: string; // path to %ext/dist/renderer.js
  /**
   * Supported Lens version engine by extension could be defined in `manifest.engines.lens`
   * Only MAJOR.MINOR version is taken in consideration.
   */
  engines: {
    lens: string; // "semver"-package format
    npm?: string;
    node?: string;
  };

  // Specify extension name used for persisting data.
  // Useful if extension is renamed but the data should not be lost.
  storeName?: string;
}

export const lensExtensionDependencies = Symbol("lens-extension-dependencies");
export const Disposers = Symbol("disposers");

export class LensExtension<
  /**
   * @ignore
   */
  Dependencies extends LensExtensionDependencies = LensExtensionDependencies,
> {
  readonly id: LensExtensionId;
  readonly manifest: LensExtensionManifest;
  readonly manifestPath: string;
  readonly isBundled: boolean;

  get sanitizedExtensionId() {
    return sanitizeExtensionName(this.name);
  }

  protocolHandlers: ProtocolHandlerRegistration[] = [];

  @observable private _isEnabled = false;

  @computed get isEnabled() {
    return this._isEnabled;
  }

  /**
   * @ignore
   */
  [Disposers] = disposer();

  constructor({ id, manifest, manifestPath, isBundled }: InstalledExtension) {
    makeObservable(this);

    // id is the name of the manifest
    this.id = id;

    this.manifest = manifest;
    this.manifestPath = manifestPath;
    this.isBundled = !!isBundled;
  }

  get name() {
    return this.manifest.name;
  }

  get version() {
    return this.manifest.version;
  }

  get description() {
    return this.manifest.description;
  }

  // Name of extension for persisting data
  get storeName() {
    return this.manifest.storeName || this.name;
  }

  /**
   * @ignore
   */
  readonly [lensExtensionDependencies]!: Dependencies;

  /**
   * getExtensionFileFolder returns the path to an already created folder. This
   * folder is for the sole use of this extension.
   *
   * Note: there is no security done on this folder, only obfuscation of the
   * folder name.
   */
  async getExtensionFileFolder(): Promise<string> {
    // storeName is read from the manifest and has a fallback to the manifest name, which equals id
    return this[lensExtensionDependencies].fileSystemProvisionerStore.requestDirectory(this.storeName);
  }

  @action
  async enable() {
    if (this._isEnabled) {
      return;
    }

    this._isEnabled = true;
    this[lensExtensionDependencies].logger.info(`[EXTENSION]: enabled ${this.name}@${this.version}`);
  }

  @action
  async disable() {
    if (!this._isEnabled) {
      return;
    }

    this._isEnabled = false;

    try {
      await this.onDeactivate();
      this[Disposers]();
      this[lensExtensionDependencies].logger.info(`[EXTENSION]: disabled ${this.name}@${this.version}`);
    } catch (error) {
      this[lensExtensionDependencies].logger.error(`[EXTENSION]: disabling ${this.name}@${this.version} threw an error: ${error}`);
    }
  }

  async activate(): Promise<void> {
    return this.onActivate();
  }

  protected onActivate(): Promise<void> | void {
    return;
  }

  protected onDeactivate(): Promise<void> | void {
    return;
  }
}

export function sanitizeExtensionName(name: string) {
  return name.replace("@", "").replace("/", "--");
}

export function getSanitizedPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
} // normalize multi-slashes (e.g. coming from page.id)

export function extensionDisplayName(name: string, version: string) {
  return `${name}@${version}`;
}
