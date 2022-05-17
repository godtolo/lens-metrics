/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./styles.module.scss";

import React, { useState } from "react";
import { Menu, MenuItem } from "../menu";
import uniqueId from "lodash/uniqueId";
import { noop } from "lodash";
import { cssNames } from "../../utils";
import type { IconProps } from "../icon";
import { Icon } from "../icon";

interface UpdateButtonProps {
  warningLevel?: "light" | "medium" | "high";
  update: () => void;
}

export function UpdateButton({ warningLevel, update }: UpdateButtonProps) {
  const id = uniqueId("update_button_");
  const menuIconProps: IconProps = { material: "update", small: true };
  const [opened, setOpened] = useState(false);

  const onKeyDown = (evt: React.KeyboardEvent<HTMLButtonElement>) => {
    if (evt.code == "Space") {
      evt.preventDefault();
      toggle();
    }
  };

  const toggle = () => {
    setOpened(!opened);
  };

  if (!warningLevel) {
    return null;
  }

  return (
    <>
      <button
        data-testid="update-button"
        id="update-lens-button"
        className={cssNames(styles.updateButton, {
          [styles.warningHigh]: warningLevel === "high",
          [styles.warningMedium]: warningLevel === "medium",
        })}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        Update
        <Icon material="arrow_drop_down" className={styles.icon}/>
      </button>
      <Menu
        usePortal
        htmlFor="update-lens-button"
        isOpen={opened}
        close={toggle}
        open={noop}
      >
        <MenuItem icon={menuIconProps} onClick={update} data-testid="update-lens-menu-item">
          Relaunch to Update Lens
        </MenuItem>
      </Menu>
    </>
  );
}
