/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Runnable } from "@k8slens/run-many";
import type { DiContainerForInjection, Injectable, InjectionToken } from "@ogre-tools/injectable";
import { getInjectionToken, getInjectable } from "@ogre-tools/injectable";
import assert from "assert";

export interface CreateInitializableStateArgs<T> {
  id: string;
  init: (di: DiContainerForInjection) => Promise<T> | T;
  injectionToken?: InjectionToken<InitializableState<T>, void>;
}

export interface InitializableState<T> {
  get: () => T;
  init: () => Promise<void>;
}

type InitializableStateValue<T> =
  | { set: false }
  | { set: true; value: T } ;

export interface Initializable<T> {
  readonly rootId: string;
  readonly stateToken: InjectionToken<T, void>;
}

export const getInitializable = <T>(rootId: string): Initializable<T> => ({
  rootId,
  stateToken: getInjectionToken<T>({
    id: `${rootId}-state-token`,
  }),
});

type InitState<T> = { set: true; value: T } | { set: false };

export type ImplInitializableInjectionTokensArgs<T> = {
  token: Initializable<T>;
  init: (di: DiContainerForInjection) => T | Promise<T>;
} & (
  {
    phase: InjectionToken<Runnable<void>, void>;
    runAfter?: Injectable<Runnable<void>, Runnable<void>, void>[];
  }
  |
  {
    runAfter: Injectable<Runnable<void>, Runnable<void>, void>;
    phase?: undefined;
  }
);

export const getInjectablesForInitializable = <T>({
  init,
  token: {
    rootId,
    stateToken,
  },
  ...rest
}: ImplInitializableInjectionTokensArgs<T>) => {
  let state: InitState<T> = { set: false };

  const stateInjectable = getInjectable({
    id: `${rootId}-state`,
    instantiate: () => {
      assert(state.set, `Tried to inject "${rootId}" before initialization was complete`);

      return state.value;
    },
    injectionToken: stateToken,
  });
  const initializationInjectable = getInjectable({
    id: `${rootId}-initialization`,
    instantiate: (di) => ({
      run: async () => {
        state = {
          set: true,
          value: await init(di),
        };
      },
      runAfter: rest.runAfter,
    }),
    injectionToken: (() => {
      if (rest.runAfter && !Array.isArray(rest.runAfter)) {
        return rest.runAfter.injectionToken;
      }

      return rest.phase;
    })(),
  });

  return {
    stateInjectable,
    initializationInjectable,
  };
};

export function createInitializableState<T>(args: CreateInitializableStateArgs<T>): Injectable<InitializableState<T>, unknown, void> {
  const { id, init, injectionToken } = args;

  return getInjectable({
    id,
    instantiate: (di) => {
      let box: InitializableStateValue<T> = {
        set: false,
      };
      let initCalled = false;

      return {
        init: async () => {
          if (initCalled) {
            throw new Error(`Cannot initialize InitializableState(${id}) more than once`);
          }

          initCalled = true;
          box = {
            set: true,
            value: await init(di),
          };
        },
        get: () => {
          if (!initCalled) {
            throw new Error(`InitializableState(${id}) has not been initialized yet`);
          }

          if (box.set === false) {
            throw new Error(`InitializableState(${id}) has not finished initializing`);
          }

          return box.value;
        },
      };
    },
    injectionToken,
  });
}
