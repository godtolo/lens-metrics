/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensExtensionId } from "../lens-extension";
import { action, computed, makeObservable, observable } from "mobx";
import { toJS } from "../../common/utils";
import type { BaseStoreDependencies } from "../../common/base-store/base-store";
import { BaseStore } from "../../common/base-store/base-store";

export interface LensExtensionsStoreModel {
  extensions: Record<LensExtensionId, LensExtensionState>;
}

export interface LensExtensionState {
  enabled?: boolean;
  name: string;
}

export class ExtensionsStore extends BaseStore<LensExtensionsStoreModel> {
  constructor(deps: BaseStoreDependencies) {
    super(deps, {
      configName: "lens-extensions",
    });
    makeObservable(this);
    this.load();
  }

  @computed
  get enabledExtensions() {
    return Array.from(this.state.values())
      .filter(({ enabled }) => enabled)
      .map(({ name }) => name);
  }

  readonly state = observable.map<LensExtensionId, LensExtensionState>();

  isEnabled(id: LensExtensionId): boolean {
    return this.state.get(id)?.enabled ?? false;
  }

  @action
  protected fromStore({ extensions }: LensExtensionsStoreModel) {
    this.state.merge(extensions);
  }

  toJSON(): LensExtensionsStoreModel {
    return toJS({
      extensions: Object.fromEntries(this.state),
    });
  }
}
