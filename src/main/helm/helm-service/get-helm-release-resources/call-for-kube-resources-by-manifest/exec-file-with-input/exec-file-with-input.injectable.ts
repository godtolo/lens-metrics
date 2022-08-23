/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { AsyncResult } from "../../../../../../common/utils/async-result";
import nonPromiseExecFileInjectable from "./non-promise-exec-file.injectable";
import { isNumber } from "../../../../../../common/utils";
import assert from "assert";
import type { ChildProcess } from "child_process";

export type ExecFileWithInput = (options: {
  filePath: string;
  commandArguments: string[];
  input: string;
}) => Promise<AsyncResult<string, unknown>>;

const execFileWithInputInjectable = getInjectable({
  id: "exec-file-with-input",

  instantiate: (di): ExecFileWithInput => {
    const execFile = di.inject(nonPromiseExecFileInjectable);

    return async ({ filePath, commandArguments, input }) =>
      new Promise((resolve) => {
        let execution: ChildProcess;

        try {
          execution = execFile(filePath, commandArguments);
        } catch (e) {
          resolve({ callWasSuccessful: false, error: e });

          return;
        }

        assert(execution.stdout, "stdout is not defined");
        assert(execution.stderr, "stderr is not defined");
        assert(execution.stdin, "stdin is not defined");

        let stdout = "";
        let stderr = "";

        execution.stdout.on("data", (data) => {
          stdout += data;
        });

        execution.stderr.on("data", (data) => {
          stderr += data;
        });

        execution.on("error", (error) =>
          resolve({ callWasSuccessful: false, error }),
        );

        execution.on("exit", (code, signal) => {
          if (!isNumber(code)) {
            resolve({
              callWasSuccessful: false,
              error: "Exited without exit code",
            });

            return;
          }

          if (code !== 0) {
            resolve({
              callWasSuccessful: false,
              error: stderr ? stderr : `Failed with error: ${signal}`,
            });

            return;
          }

          resolve({ callWasSuccessful: true, response: stdout });
        });

        execution.stdin.end(input);
      });
  },
});

export default execFileWithInputInjectable;
