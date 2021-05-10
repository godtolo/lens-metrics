// Helper for working with storages (e.g. window.localStorage, NodeJS/file-system, etc.)

import { action, comparer, makeObservable, observable, toJS, when, } from "mobx";
import produce, { Draft } from "immer";
import { isEqual, isFunction, isPlainObject } from "lodash";
import logger from "../../main/logger";

export interface StorageAdapter<T> {
  [metadata: string]: any;
  getItem(key: string): T | Promise<T>;
  setItem(key: string, value: T): void;
  removeItem(key: string): void;
  onChange?(change: { key: string, value: T, oldValue?: T }): void;
}

export interface StorageHelperOptions<T> {
  autoInit?: boolean; // start preloading data immediately, default: true
  storage: StorageAdapter<T>;
  defaultValue: T;
}

export class StorageHelper<T> {
  static logPrefix = "[StorageHelper]:";
  readonly storage: StorageAdapter<T>;

  private data = observable.box<T>(undefined, {
    deep: true,
    equals: comparer.structural,
  });

  @observable initialized = false;

  get whenReady() {
    return when(() => this.initialized);
  }

  get defaultValue(): T {
    // return as-is since options.defaultValue might be a getter too
    return this.options.defaultValue;
  }

  constructor(readonly key: string, private options: StorageHelperOptions<T>) {
    makeObservable(this);

    const { storage, autoInit = true } = options;

    this.storage = storage;

    this.data.observe_(({ newValue, oldValue }) => {
      this.onChange(newValue as T, oldValue as T);
    });

    if (autoInit) {
      this.init();
    }
  }

  private onData = (data: T): void => {
    const notEmpty = data != null;
    const notDefault = !this.isDefaultValue(data);

    if (notEmpty && notDefault) {
      this.merge(data);
    }

    this.initialized = true;
  };

  private onError = (error: any): void => {
    logger.error(`${StorageHelper.logPrefix} loading error: ${error}`, this);
  };

  @action
  init({ force = false } = {}) {
    if (this.initialized && !force) {
      return;
    }

    try {
      const data = this.storage.getItem(this.key);

      if (data instanceof Promise) {
        data.then(this.onData, this.onError);
      } else {
        this.onData(data);
      }
    } catch (error) {
      this.onError(error);
    }
  }

  isDefaultValue(value: T): boolean {
    return isEqual(value, this.defaultValue);
  }

  protected onChange(value: T, oldValue?: T) {
    if (!this.initialized) return;

    try {
      if (value == null) {
        this.storage.removeItem(this.key);
      } else {
        this.storage.setItem(this.key, value);
      }

      this.storage.onChange?.({ value, oldValue, key: this.key });
    } catch (error) {
      logger.error(`${StorageHelper.logPrefix} updating storage: ${error}`, this, { value, oldValue });
    }
  }

  get(): T {
    return this.data.get() ?? this.defaultValue;
  }

  @action
  set(value: T) {
    if (this.isDefaultValue(value)) {
      this.reset();
    } else {
      this.data.set(value);
    }
  }

  @action
  reset() {
    this.data.set(undefined);
  }

  @action
  merge(value: Partial<T> | ((draft: Draft<T>) => Partial<T> | void)) {
    const nextValue = produce(this.toJSON(), (state: Draft<T>) => {
      const newValue = isFunction(value) ? value(state) : value;

      return isPlainObject(newValue)
        ? Object.assign(state, newValue) // partial updates for returned plain objects
        : newValue;
    });

    this.set(nextValue as T);
  }

  toJSON(): T {
    return toJS(this.get());
  }
}
