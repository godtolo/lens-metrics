/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { applicationInformationToken } from "@k8slens/application";
import { getInjectable } from "@ogre-tools/injectable";
import { bundledExtensionInjectionToken } from "../../../../../../common/library";
import { object } from "../../../../../../common/utils";
import buildSemanticVersionInjectable from "../../../../../../common/vars/build-semantic-version.injectable";

const specificVersionsInjectable = getInjectable({
  id: "specific-versions",
  instantiate: (di) => {
    const buildSemanticVersion = di.inject(buildSemanticVersionInjectable);
    const bundledExtensions = di.injectMany(bundledExtensionInjectionToken);
    const applicationInformation = di.inject(applicationInformationToken);

    if (buildSemanticVersion.get().prerelease[0] === "latest") {
      return [];
    }

    const corePackageVersions = object.entries(applicationInformation.dependencies)
      .filter(([name]) => name.startsWith("@k8slens/"))
      .map(([name, version]) => `${name}: ${version}`);
    const bundledExtensionVersions = bundledExtensions
      .map(ext => `${ext.manifest.name}: ${ext.manifest.version}`);

    return [
      ...corePackageVersions,
      ...bundledExtensionVersions,
    ];
  },
});

export default specificVersionsInjectable;
