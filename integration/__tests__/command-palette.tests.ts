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

import { Page } from "playwright";
import * as utils from "../helpers/utils";

describe("Lens command palette", () => {
  let window: Page, cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ window, cleanup } = await utils.start());
    await utils.clickWelcomeButton(window);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("menu", () => {
    it("opens command dialog from keyboard shortcut", async () => {
      await window.keyboard.press("Meta+Shift+p");
      await window.waitForSelector(".Select__option >> text=Hotbar: Switch");
    }, 10*60*1000);
  });
});
