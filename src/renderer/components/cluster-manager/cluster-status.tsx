import type { KubeAuthProxyLog } from "../../../main/kube-auth-proxy";

import "./cluster-status.scss"
import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { ipcRenderer } from "electron";
import { autorun, computed, observable } from "mobx";
import { clusterIpc } from "../../../common/cluster-ipc";
import { Icon } from "../icon";
import { Button } from "../button";
import { cssNames } from "../../utils";
import { navigate } from "../../navigation";
import { Cluster } from "../../../main/cluster";

@observer
export class ClusterStatus extends React.Component {
  @observable authOutput: KubeAuthProxyLog[] = [];
  @observable isReconnecting = false;

  // fixme
  @computed get cluster(): Cluster {
    return null;
  }

  @computed get hasErrors(): boolean {
    return this.authOutput.some(({ error }) => error) || !!this.cluster.failureReason;
  }

  @disposeOnUnmount
  autoRedirectToMain = autorun(() => {
    if (this.cluster.accessible && !this.hasErrors) {
      navigate("/");
    }
  })

  async componentDidMount() {
    if (this.cluster.disconnected) {
      return;
    }
    this.authOutput = [{ data: "Connecting..." }];
    ipcRenderer.on(`kube-auth:${this.cluster.id}`, (evt, res: KubeAuthProxyLog) => {
      this.authOutput.push({
        data: res.data.trimRight(),
        error: res.error,
      });
    })
    await this.refreshClusterState();
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners(`kube-auth:${this.cluster.id}`);
  }

  async refreshClusterState() {
    return clusterIpc.activate.invokeFromRenderer();
  }

  reconnect = async () => {
    this.authOutput = [{ data: "Reconnecting..." }];
    this.isReconnecting = true;
    await this.refreshClusterState();
    this.isReconnecting = false;
  }

  render() {
    const { authOutput, cluster, hasErrors } = this;
    const isDisconnected = !!cluster.disconnected;
    const failureReason = cluster.failureReason;
    const isError = hasErrors || isDisconnected;
    return (
      <div className="ClusterStatus flex column gaps">
        {isError && (
          <Icon
            material="cloud_off"
            className={cssNames({ error: hasErrors })}
          />
        )}
        <h2>
          {cluster.contextName}
        </h2>
        {!isDisconnected && (
          <pre className="kube-auth-out">
            {authOutput.map(({ data, error }, index) => {
              return <p key={index} className={cssNames({ error })}>{data}</p>
            })}
          </pre>
        )}
        {failureReason && (
          <div className="failure-reason error">{failureReason}</div>
        )}
        {isError && (
          <Button
            primary
            label="Reconnect"
            className="box center"
            onClick={this.reconnect}
            waiting={this.isReconnecting}
          />
        )}
      </div>
    )
  }
}
