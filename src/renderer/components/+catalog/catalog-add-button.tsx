/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./catalog-add-button.scss";
import React from "react";
import { SpeedDial, SpeedDialAction } from "@material-ui/lab";
import { Icon } from "../icon";
import { observer } from "mobx-react";
import { observable, makeObservable, action } from "mobx";
import { autoBind } from "../../../common/utils";
import type { CatalogCategory, CatalogEntityAddMenuContext, CatalogEntityAddMenu } from "../../api/catalog-entity";
import { EventEmitter } from "events";
import { navigate } from "../../navigation";
import type { CatalogCategoryRegistry } from "../../../common/catalog";
import { withInjectables } from "@ogre-tools/injectable-react";
import catalogCategoryRegistryInjectable from "../../../common/catalog/category-registry.injectable";

export interface CatalogAddButtonProps {
  category: CatalogCategory;
}

type CategoryId = string;

interface Dependencies {
  catalogCategoryRegistry: CatalogCategoryRegistry;
}

@observer
class NonInjectedCatalogAddButton extends React.Component<CatalogAddButtonProps & Dependencies> {
  @observable protected isOpen = false;
  @observable menuItems = new Map<CategoryId, CatalogEntityAddMenu[]>();

  constructor(props: CatalogAddButtonProps & Dependencies) {
    super(props);
    makeObservable(this);
    autoBind(this);
  }

  componentDidMount() {
    this.updateMenuItems();
  }

  componentDidUpdate(prevProps: CatalogAddButtonProps) {
    if (prevProps.category != this.props.category) {
      this.updateMenuItems();
    }
  }

  get categories() {
    return this.props.catalogCategoryRegistry.filteredItems;
  }

  @action
  updateMenuItems() {
    this.menuItems.clear();

    if (this.props.category) {
      this.updateCategoryItems(this.props.category);
    } else {
      // Show menu items from all categories
      this.categories.forEach(this.updateCategoryItems);
    }
  }

  updateCategoryItems = action((category: CatalogCategory) => {
    if (category instanceof EventEmitter) {
      const menuItems: CatalogEntityAddMenu[] = [];
      const context: CatalogEntityAddMenuContext = {
        navigate: (url: string) => navigate(url),
        menuItems,
      };

      category.emit("catalogAddMenu", context);
      this.menuItems.set(category.getId(), menuItems);
    }
  });

  getCategoryFilteredItems = (category: CatalogCategory) => {
    return category.filteredItems(this.menuItems.get(category.getId()) || []);
  };

  onOpen() {
    this.isOpen = true;
  }

  onClose() {
    this.isOpen = false;
  }

  onButtonClick() {
    const defaultAction = this.items.find(item => item.defaultAction)?.onClick;
    const clickAction = defaultAction || (this.items.length === 1 ? this.items[0].onClick : null);

    clickAction?.();
  }

  get items() {
    const { category } = this.props;

    return category ? this.getCategoryFilteredItems(category) :
      this.categories.map(this.getCategoryFilteredItems).flat();
  }

  render() {
    if (this.items.length === 0) {
      return null;
    }

    return (
      <SpeedDial
        className="CatalogAddButton"
        ariaLabel="SpeedDial CatalogAddButton"
        open={this.isOpen}
        onOpen={this.onOpen}
        onClose={this.onClose}
        icon={<Icon material="add" />}
        direction="up"
        onClick={this.onButtonClick}
      >
        {this.items.map((menuItem, index) => {
          return (
            <SpeedDialAction
              key={index}
              icon={<Icon material={menuItem.icon}/>}
              tooltipTitle={menuItem.title}
              onClick={(evt) => {
                evt.stopPropagation();
                menuItem.onClick();
              }}
              TooltipClasses={{
                popper: "catalogSpeedDialPopper",
              }}
            />
          );
        })}
      </SpeedDial>
    );
  }
}

export const CatalogAddButton = withInjectables<Dependencies, CatalogAddButtonProps>(NonInjectedCatalogAddButton, {
  getProps: (di, props) => ({
    ...props,
    catalogCategoryRegistry: di.inject(catalogCategoryRegistryInjectable),
  }),
});
