import winstonLoggerInjectable from "../../common/winston-logger.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import closeRendererLogFileInjectable from "./close-renderer-log-file.injectable";
import type { DiContainer } from "@ogre-tools/injectable";
import type winston from "winston";
import { SendMessageToChannel, sendMessageToChannelInjectionToken } from "../../common/utils/channel/message-to-channel-injection-token";
import rendererLogFileIdInjectable from "./renderer-log-file-id.injectable";
import ipcLogTransportInjectable from "./ipc-transport.injectable";
import type IpcLogTransport from "./ipc-transport";

describe("close renderer file logging", () => {
  let di: DiContainer;
  let sendIpcMock: SendMessageToChannel;
  let winstonMock: winston.Logger;
  let ipcTransportMock: IpcLogTransport;

  beforeEach(() => {
    di = getDiForUnitTesting({ doGeneralOverrides: false });
    sendIpcMock = jest.fn();
    winstonMock = {
      remove: jest.fn(),
    } as any as winston.Logger;
    ipcTransportMock = { name: "ipc-renderer-transport" } as IpcLogTransport;

    di.override(winstonLoggerInjectable, () => winstonMock);
    di.override(sendMessageToChannelInjectionToken, () => sendIpcMock);
    di.override(rendererLogFileIdInjectable, () => "some-log-id");
    di.override(ipcLogTransportInjectable, () => ipcTransportMock);
  });

  it("sends the ipc close message with correct log id", () => {
    const closeLog = di.inject(closeRendererLogFileInjectable);
    closeLog();

    expect(sendIpcMock).toHaveBeenCalledWith(
      { id: "close-ipc-file-logger-channel" },
      "some-log-id"
    );
  });

  it("removes the transport to prevent further logging to closed file", () => {
    const closeLog = di.inject(closeRendererLogFileInjectable);
    closeLog();

    expect(winstonMock.remove).toHaveBeenCalledWith({
      name: "ipc-renderer-transport",
    });
  });
});
