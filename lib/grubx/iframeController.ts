import type { GrubXControlMessage } from "@/types/grubx";

const postControlMessage = (iframe: HTMLIFrameElement | null, message: GrubXControlMessage) => {
  iframe?.contentWindow?.postMessage(message, "*");
};

export const createGrubXIframeController = (getIframe: () => HTMLIFrameElement | null) => ({
  play() {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "play" });
  },
  pause() {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "pause" });
  },
  seek(time: number) {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "seek", time });
  },
  setVolume(value: number) {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "setVolume", value });
  },
  mute(muted: boolean) {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "mute", muted });
  },
  getStatus() {
    postControlMessage(getIframe(), { type: "GRUBX_CONTROL", action: "getStatus" });
  },
});

export type GrubXIframeController = ReturnType<typeof createGrubXIframeController>;
