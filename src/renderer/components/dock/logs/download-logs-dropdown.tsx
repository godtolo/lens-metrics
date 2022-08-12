/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./download-logs-dropdown.module.scss";

import React, { useState } from "react";
import { Icon } from "../../icon";
import { Menu, MenuItem } from "../../menu";

interface DownloadLogsDropdownProps {
  downloadVisibleLogs: () => void;
  downloadAllLogs: () => Promise<any>;
}

export function DownloadLogsDropdown({ downloadAllLogs, downloadVisibleLogs }: DownloadLogsDropdownProps) {
  const [waiting, setWaiting] = useState(false);
  const [opened, setOpened] = useState(false);
  
  const toggle = () => {
    setOpened(!opened);
  };

  const downloadLogs = async (download: () => Promise<void>) => {
    setWaiting(true);

    try {
      await download();
    } finally {
      setWaiting(false);
    }
  };

  return (
    <>
      <button
        data-testid="download-logs-dropdown"
        id="download-logs-dropdown"
        className={styles.dropdown}
        disabled={waiting}
      >
        Download
        <Icon material="arrow_drop_down" smallest/>
      </button>
      <Menu
        usePortal
        htmlFor="download-logs-dropdown"
        isOpen={opened}
        close={toggle}
        open={toggle}
      >
        <MenuItem
          onClick={downloadVisibleLogs}
          data-testid="download-visible-logs"
        >
          Visible logs
        </MenuItem>
        <MenuItem
          onClick={() => downloadLogs(downloadAllLogs)}
          data-testid="download-all-logs"
        >
          All logs
        </MenuItem>
      </Menu>
    </>
  );
}
