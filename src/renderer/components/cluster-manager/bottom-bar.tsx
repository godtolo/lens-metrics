import "./bottom-bar.scss";

import React from "react";
import { observer } from "mobx-react";
import { StatusBarRegistration, statusBarRegistry } from "../../../extensions/registries";

@observer
export class BottomBar extends React.Component {
  renderRegisteredItem(registration: StatusBarRegistration) {
    const { item } = registration;

    if (item) {
      return typeof item === "function" ? item() : item;
    }

    return <registration.components.Item />;
  }

  renderRegisteredItems() {
    const items = statusBarRegistry.getItems();

    if (!Array.isArray(items)) {
      return;
    }

    return (
      <div className="extensions box grow flex gaps justify-flex-end">
        {items.map((registration, index) => {
          if (!registration?.item && !registration?.components?.Item) {
            return;
          }

          return (
            <div className="flex align-center gaps item" key={index}>
              {this.renderRegisteredItem(registration)}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    return (
      <div className="BottomBar flex gaps">
        {this.renderRegisteredItems()}
      </div>
    );
  }
}
