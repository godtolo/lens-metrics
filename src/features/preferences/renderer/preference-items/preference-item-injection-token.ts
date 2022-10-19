/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type React from "react";

export type PreferenceItemComponent = React.ComponentType<{
  children: React.ReactElement;
}>;

export type PreferencePageComponent = React.ComponentType<{
  children: React.ReactElement;
  item: PreferencePage;
}>;

export interface PreferenceTab {
  kind: "tab";
  id: string;
  parentId: string;
  pathId: string;
  label: string;
  orderNumber: number;
  isShown?: IComputedValue<boolean> | boolean;
}

export interface PreferenceTabGroup {
  kind: "tab-group";
  id: string;
  parentId: "preference-tabs";
  label: string;
  orderNumber: number;
  isShown?: IComputedValue<boolean> | boolean;
  iconName?: string;
}

export interface PreferencePage {
  kind: "page";
  id: string;
  parentId: string;
  isShown?: IComputedValue<boolean> | boolean;
  childrenSeparator?: () => React.ReactElement;
  Component: PreferencePageComponent;
}

export interface PreferenceGroup {
  kind: "group";
  id: string;
  parentId: string;
  isShown?: IComputedValue<boolean> | boolean;
  childrenSeparator?: () => React.ReactElement;
}

export interface PreferenceItem {
  kind: "item";
  Component: PreferenceItemComponent;
  id: string;
  parentId: string;
  orderNumber: number;
  isShown?: IComputedValue<boolean> | boolean;
  childrenSeparator?: () => React.ReactElement;
}

export type PreferenceTypes = PreferenceTabGroup | PreferenceTab | PreferenceItem | PreferencePage | PreferenceGroup;

export const preferenceItemInjectionToken = getInjectionToken<PreferenceTypes>({
  id: "preference-item-injection-token",
});

