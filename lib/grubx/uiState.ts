import type { GrubXPopupState } from "@/types/grubx";

export const UI_STATE: { popups: GrubXPopupState } = {
  popups: {
    enabled: true,
    ads: false,
    serverSwitch: true,
    nextEpisode: true,
    overlays: true,
  },
};

export const togglePopups = () => {
  UI_STATE.popups.enabled = !UI_STATE.popups.enabled;
  return UI_STATE.popups;
};

export const toggleOverlays = () => {
  UI_STATE.popups.overlays = !UI_STATE.popups.overlays;
  return UI_STATE.popups;
};

export const toggleServerSwitch = () => {
  UI_STATE.popups.serverSwitch = !UI_STATE.popups.serverSwitch;
  return UI_STATE.popups;
};
