/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { join, nth, reduce, concat } from "@k8slens/utilities/src/iter";

describe("iter", () => {
  describe("reduce", () => {
    it("can reduce a value", () => {
      expect(reduce([1, 2, 3], (acc: number[], current: number) => [current, ...acc], [0])).toEqual([3, 2, 1, 0]);
    });

    it("can reduce an empty iterable", () => {
      expect(reduce([], (acc: number[], current: number) => [acc[0] + current], [])).toEqual([]);
    });
  });

  describe("join", () => {
    it("should not prefix the output by the seperator", () => {
      expect(join(["a", "b", "c"].values(), " ")).toBe("a b c");
    });

    it("should return empty string if iterator is empty", () => {
      expect(join([].values(), " ")).toBe("");
    });

    it("should return just first entry if iterator is of size 1", () => {
      expect(join(["d"].values(), " ")).toBe("d");
    });
  });

  describe("nth", () => {
    it("should return undefined past the end of the iterator", () => {
      expect(nth(["a"], 123)).toBeUndefined();
    });

    it("should by 0-indexing the index", () => {
      expect(nth(["a", "b"], 0)).toBe("a");
    });
  });

  describe("concat", () => {
    it("should yield undefined for empty args", () => {
      const iter = concat();

      expect(iter.next()).toEqual({ done: true });
    });

    it("should yield undefined for only empty args", () => {
      const iter = concat([].values(), [].values(), [].values(), [].values());

      expect(iter.next()).toEqual({ done: true });
    });

    it("should yield all of the first and then all of the second", () => {
      const iter = concat([1, 2, 3].values(), [4, 5, 6].values());

      expect(iter.next()).toEqual({ done: false, value: 1 });
      expect(iter.next()).toEqual({ done: false, value: 2 });
      expect(iter.next()).toEqual({ done: false, value: 3 });
      expect(iter.next()).toEqual({ done: false, value: 4 });
      expect(iter.next()).toEqual({ done: false, value: 5 });
      expect(iter.next()).toEqual({ done: false, value: 6 });
      expect(iter.next()).toEqual({ done: true });
    });
  });
});
