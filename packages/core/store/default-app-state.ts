import { defaultViewports } from "../components/ViewportControls/default-viewports";
import { PrivateAppState } from "../types/Internal";

export const defaultAppState: PrivateAppState = {
  data: { content: [], root: {}, zones: {} },
  ui: {
    leftSideBarVisible: true,
    rightSideBarVisible: true,
    arrayState: {},
    itemSelector: null,
    componentList: {},
    isDragging: false,
    previewMode: "edit",
    viewports: {
      current: {
        width: defaultViewports[0].width,
        height: defaultViewports[0].height || "auto",
      },
      options: [],
      controlsVisible: true,
    },
    field: { focus: null },
  },
  indexes: {
    nodes: {},
    zones: {},
  },
};
