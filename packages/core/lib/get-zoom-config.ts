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
