import type { GrubXEventName, GrubXEventPayload } from "@/types/grubx";

export const GRUBX_EVENT_NAME = "grubx:event";

export const GRUBX_SUPPORTED_EVENTS = new Set<GrubXEventName>([
  "play",
  "pause",
  "seeked",
  "ended",
  "timeupdate",
  "mediaReady",
  "providerSwitch",
  "popupToggle",
]);

export const isGrubXEventPayload = (payload: unknown): payload is GrubXEventPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<GrubXEventPayload>;
  return (
    candidate.type === "GRUBX_EVENT" &&
    typeof candidate.provider === "string" &&
    typeof candidate.data?.event === "string" &&
    GRUBX_SUPPORTED_EVENTS.has(candidate.data.event as GrubXEventName)
  );
};

export const dispatchGrubXEvent = (payload: GrubXEventPayload) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<GrubXEventPayload>(GRUBX_EVENT_NAME, { detail: payload }));
};

export const registerGrubXEventBridge = (onEvent?: (payload: GrubXEventPayload) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onMessage = (event: MessageEvent) => {
    if (!isGrubXEventPayload(event.data)) {
      return;
    }

    dispatchGrubXEvent(event.data);
    onEvent?.(event.data);
  };

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
};

export const subscribeToGrubXEvents = (listener: (payload: GrubXEventPayload) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onEvent = (event: Event) => listener((event as CustomEvent<GrubXEventPayload>).detail);
  window.addEventListener(GRUBX_EVENT_NAME, onEvent);
  return () => window.removeEventListener(GRUBX_EVENT_NAME, onEvent);
};
