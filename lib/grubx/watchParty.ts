import type { GrubXEventPayload } from "@/types/grubx";

export const onPlayerStateChange = (
  payload: GrubXEventPayload,
  sync: {
    play?: (payload: GrubXEventPayload) => void;
    pause?: (payload: GrubXEventPayload) => void;
    seek?: (payload: GrubXEventPayload) => void;
  } = {},
) => {
  if (payload.data.event === "play") {
    sync.play?.(payload);
  }

  if (payload.data.event === "pause") {
    sync.pause?.(payload);
  }

  if (payload.data.event === "seeked") {
    sync.seek?.(payload);
  }
};
