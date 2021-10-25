/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import "./info-panel.scss";
import React, { Component, ReactNode } from "react";
import { makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { cssNames, isReactNode } from "../../utils";
import { Button } from "../button";
import { Icon } from "../icon";
import { Spinner } from "../spinner";
import { dockStore, TabId } from "./dock.store";
import { Notifications } from "../notifications";
import { DockTabContext, DockTabContextValue } from "./dock-tab-context";

export interface InfoPanelProps {
  tabId: TabId;
  submit?: () => Promise<ReactNode | string>;
  className?: string;
  error?: React.ReactNode;
  controls?: ReactNode;
  submitLabel?: ReactNode;
  submittingMessage?: ReactNode;
  disableSubmit?: boolean;
  showButtons?: boolean
  showSubmitClose?: boolean;
  showInlineInfo?: boolean;
  showNotifications?: boolean;
  showStatusPanel?: boolean;
}

const defaultProps: Partial<InfoPanelProps> = {
  submitLabel: "Submit",
  submittingMessage: "Submitting..",
  showButtons: true,
  showSubmitClose: true,
  showInlineInfo: true,
  showNotifications: true,
  showStatusPanel: true,
};

@observer
export class InfoPanel extends Component<InfoPanelProps> {
  static defaultProps = defaultProps as object;
  static contextType = DockTabContext;
  declare context: DockTabContextValue;

  get error() {
    return this.props.error ?? this.context.error;
  }

  @observable waiting = false;

  constructor(props: InfoPanelProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => this.props.tabId, () => {
        this.waiting = false;
      })
    ]);
  }

  submit = async () => {
    const { showNotifications } = this.props;

    this.waiting = true;

    try {
      const result = await this.props.submit();

      if (showNotifications) Notifications.ok(result);
    } catch (error) {
      const errorMessage = isReactNode(error) ? error : String(error);

      if (showNotifications) Notifications.error(errorMessage);
    } finally {
      this.waiting = false;
    }
  };

  submitAndClose = async () => {
    await this.submit();
    this.close();
  };

  close = () => {
    dockStore.closeTab(this.props.tabId);
  };

  renderErrorIcon(): React.ReactNode {
    if (!this.error || !this.props.showInlineInfo) {
      return null;
    }

    return (
      <div className="error">
        <Icon material="error_outline" tooltip={this.error}/>
      </div>
    );
  }

  render() {
    const { className, controls, submitLabel, disableSubmit, error, submittingMessage, showButtons, showSubmitClose, showStatusPanel } = this.props;
    const { submit, close, submitAndClose, waiting } = this;
    const isDisabled = !!(disableSubmit || waiting || error);

    return (
      <div className={cssNames("InfoPanel flex gaps align-center", className)}>
        <div className="controls">
          {controls}
        </div>
        {showStatusPanel && (
          <div className="flex gaps align-center">
            {waiting ? <><Spinner/> {submittingMessage}</> : this.renderErrorIcon()}
          </div>
        )}
        {showButtons && (
          <>
            <Button plain label="Cancel" onClick={close}/>
            <Button
              active
              outlined={showSubmitClose}
              primary={!showSubmitClose}// one button always should be primary (blue)
              label={submitLabel}
              onClick={submit}
              disabled={isDisabled}
            />
            {showSubmitClose && (
              <Button
                primary active
                label={`${submitLabel} & Close`}
                onClick={submitAndClose}
                disabled={isDisabled}
              />
            )}
          </>
        )}
      </div>
    );
  }
}
