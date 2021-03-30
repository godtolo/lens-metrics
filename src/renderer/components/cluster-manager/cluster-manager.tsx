import "./cluster-manager.scss";

import React from "react";
import { Redirect, Route, Switch } from "react-router";
import { comparer, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import { LandingPage, landingRoute, landingURL } from "../+landing-page";
import { Preferences, preferencesRoute } from "../+preferences";
import { AddCluster, addClusterRoute } from "../+add-cluster";
import { ClusterView } from "./cluster-view";
import { ClusterSettings, clusterSettingsRoute } from "../+cluster-settings";
import { clusterViewRoute } from "./cluster-view.route";
import { clusterStore } from "../../../common/cluster-store";
import { hasLoadedView, initView, lensViews, refreshViews } from "./lens-views";
import { globalPageRegistry } from "../../../extensions/registries/page-registry";
import { Extensions, extensionsRoute } from "../+extensions";
import { getMatchedClusterId } from "../../navigation";
import { HotbarMenu } from "../hotbar/hotbar-menu";

@observer
export class ClusterManager extends React.Component {
  componentDidMount() {
    const getMatchedCluster = () => clusterStore.getById(getMatchedClusterId());

    disposeOnUnmount(this, [
      reaction(getMatchedClusterId, initView, {
        fireImmediately: true
      }),
      reaction(() => [
        getMatchedClusterId(), // refresh when active cluster-view changed
        hasLoadedView(getMatchedClusterId()), // refresh when cluster's webview loaded
        getMatchedCluster()?.available, // refresh on disconnect active-cluster
        getMatchedCluster()?.ready, // refresh when cluster ready-state change
      ], refreshViews, {
        fireImmediately: true,
        equals: comparer.shallow,
      }),
    ]);
  }

  componentWillUnmount() {
    lensViews.clear();
  }

  get startUrl() {
    return landingURL();
  }

  render() {
    return (
      <div className="ClusterManager">
        <main>
          <div id="lens-views"/>
          <Switch>
            <Route component={LandingPage} {...landingRoute} />
            <Route component={Preferences} {...preferencesRoute} />
            <Route component={Extensions} {...extensionsRoute} />
            <Route component={AddCluster} {...addClusterRoute} />
            <Route component={ClusterView} {...clusterViewRoute} />
            <Route component={ClusterSettings} {...clusterSettingsRoute} />
            {globalPageRegistry.getItems().map(({ url, components: { Page } }) => {
              return <Route key={url} path={url} component={Page}/>;
            })}
            <Redirect exact to={this.startUrl}/>
          </Switch>
        </main>
        <HotbarMenu/>
        <BottomBar/>
      </div>
    );
  }
}
