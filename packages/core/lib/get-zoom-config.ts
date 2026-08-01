import { getBox } from "css-box-model";
import { AppState } from "../types";

const RESET_ZOOM_SMALLER_THAN_FRAME = true;

export const getZoomConfig = (
  uiViewport: AppState["ui"]["viewports"]["current"],
  frame: HTMLElement,
  zoom: number
) => {
  const box = getBox(frame);

  const { width: frameWidth, height: frameHeight } = box.contentBox;

  const viewportHeight =
    uiViewport.height === "auto" ? frameHeight : uiViewport.height;

  // #883: When an explicit (non-"auto") height is set alongside the width, both dimensions have
  // concrete target values (e.g. 1920×1080). Render the preview at its ACTUAL size and let the
  // canvas scroll on both axes, instead of auto-fitting the width to the frame while the height
  // overflows — the inconsistent mix reported in the issue. This is the reporter's preferred
  // "Option A": explicit width + height → 1:1, both scrollable.
  if (uiViewport.height !== "auto") {
    return { autoZoom: 1, zoom: 1, rootHeight: viewportHeight };
  }

  let rootHeight = 0;
  let autoZoom = 1;

  if (
    typeof uiViewport.width === "number" &&
    (uiViewport.width > frameWidth || viewportHeight > frameHeight)
  ) {
    const widthZoom = Math.min(frameWidth / uiViewport.width, 1);
    const heightZoom = Math.min(frameHeight / viewportHeight, 1);

    zoom = widthZoom;

    if (widthZoom < heightZoom) {
      rootHeight = viewportHeight / zoom;
    } else {
      rootHeight = viewportHeight;
      zoom = heightZoom;
    }

    autoZoom = zoom;
  } else {
    if (RESET_ZOOM_SMALLER_THAN_FRAME) {
      autoZoom = 1;
      zoom = 1;
      rootHeight = viewportHeight;
    }
  }

  return { autoZoom, rootHeight, zoom };
};
