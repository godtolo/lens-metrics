import "./kube-object-status-icon.scss";

import React from "react";
import { Icon } from "../icon";
import { cssNames, formatDuration } from "../../utils";
import { KubeObject, KubeObjectStatus, KubeObjectStatusLevel } from "../../..//extensions/renderer-api/k8s-api";
import { kubeObjectStatusRegistry } from "../../../extensions/registries";

interface BaseProps {
  statuses?: KubeObjectStatus[];
  object?: KubeObject;
}

interface StatusProps extends BaseProps {
  statuses: KubeObjectStatus[];
  object?: undefined;
}

interface ObjectProps extends BaseProps {
  statuses?: undefined;
  object: KubeObject;
}

function statusClassName(level: number): string {
  switch (level) {
    case KubeObjectStatusLevel.INFO:
      return "info";
    case KubeObjectStatusLevel.WARNING:
      return "warning";
    case KubeObjectStatusLevel.CRITICAL:
      return "error";
  }
}

function statusTitle(level: KubeObjectStatusLevel): string {
  switch (level) {
    case KubeObjectStatusLevel.INFO:
      return "Info";
    case KubeObjectStatusLevel.WARNING:
      return "Warning";
    case KubeObjectStatusLevel.CRITICAL:
      return "Critical";
  }
}

function getAge(timestamp: string) {
  return timestamp
    ? formatDuration(Date.now() - new Date(timestamp).getTime(), true)
    : "";
}

interface SplitStatusesByLevel {
  maxLevel: string,
  criticals: KubeObjectStatus[];
  warnings: KubeObjectStatus[];
  infos: KubeObjectStatus[];
}

/**
 * This fuction returns the class level for corresponding to the highest status level
 * and the statuses split by their levels.
 * @param src a list of status items
 */
function splitByLevel(src: KubeObjectStatus[]): SplitStatusesByLevel {
  const parts = new Map(Object.values(KubeObjectStatusLevel).map(v => [v, []]));

  src.forEach(status => parts.get(status.level).push(status));

  const criticals = parts.get(KubeObjectStatusLevel.CRITICAL);
  const warnings = parts.get(KubeObjectStatusLevel.WARNING);
  const infos = parts.get(KubeObjectStatusLevel.INFO);
  const maxLevel = statusClassName(criticals[0]?.level ?? warnings[0]?.level ?? infos[0].level);

  return { maxLevel, criticals, warnings, infos };
}

export class KubeObjectStatusIcon extends React.Component<StatusProps | ObjectProps> {
  renderStatuses(statuses: KubeObjectStatus[], level: number) {
    const filteredStatuses = statuses.filter((item) => item.level == level);

    return filteredStatuses.length > 0 && (
      <div className={cssNames("level", statusClassName(level))}>
        <span className="title">
          {statusTitle(level)}
        </span>
        {
          filteredStatuses.map((status, index) => (
            <div key={`kube-resource-status-${level}-${index}`} className={cssNames("status", "msg")}>
              - {status.text} <span className="age"> · {getAge(status.timestamp)}</span>
            </div>
          ))
        }
      </div>
    );
  }

  resolveStatusesFromProps() {
    if (this.props.statuses) {
      return this.props.statuses;
    }

    return kubeObjectStatusRegistry.getItemsForObject(this.props.object);
  }

  render() {
    const statuses = this.resolveStatusesFromProps();

    if (statuses.length === 0) {
      return null;
    }

    const { maxLevel, criticals, warnings, infos } = splitByLevel(statuses);

    return (
      <Icon
        material={maxLevel}
        className={cssNames("KubeObjectStatusIcon", maxLevel)}
        tooltip={{
          children: (
            <div className="KubeObjectStatusTooltip">
              {this.renderStatuses(criticals, KubeObjectStatusLevel.CRITICAL)}
              {this.renderStatuses(warnings, KubeObjectStatusLevel.WARNING)}
              {this.renderStatuses(infos, KubeObjectStatusLevel.INFO)}
            </div>
          )
        }}
      />
    );
  }
}
