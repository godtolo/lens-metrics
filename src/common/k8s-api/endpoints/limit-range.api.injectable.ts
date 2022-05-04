/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { createStoresAndApisInjectionToken } from "../create-stores-apis.token";
import { LimitRangeApi } from "./limit-range.api";

const limitRangeApiInjectable = getInjectable({
  id: "limit-range-api",
  instantiate: (di) => {
    assert(di.inject(createStoresAndApisInjectionToken), "limitRangeApi is only available in certain environments");

    return new LimitRangeApi();
  },
});

export default limitRangeApiInjectable;
