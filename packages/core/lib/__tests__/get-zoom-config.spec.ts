import { getZoomConfig } from "../get-zoom-config";
import type { AppState } from "../../types";

// getZoomConfig reads the frame's rendered box; stub it to a fixed 800×600 preview area.
jest.mock("css-box-model", () => ({
  getBox: () => ({ contentBox: { width: 800, height: 600 } }),
}));

const frame = {} as HTMLElement;
type Viewport = AppState["ui"]["viewports"]["current"];
const vp = (width: Viewport["width"], height: Viewport["height"]): Viewport =>
  ({ width, height } as Viewport);

describe("getZoomConfig", () => {
  // #883: an explicit height is a concrete target, so render at actual size (both axes scroll),
  // instead of fitting the width while the height overflows.
  it("renders an explicit height at 1:1 with both axes scrollable (#883, Option A)", () => {
    expect(getZoomConfig(vp(1920, 1080), frame, 1)).toEqual({
      autoZoom: 1,
      zoom: 1,
      rootHeight: 1080,
    });
  });

  it("keeps an explicit height even when it is smaller than the frame", () => {
    expect(getZoomConfig(vp(400, 300), frame, 1)).toEqual({
      autoZoom: 1,
      zoom: 1,
      rootHeight: 300,
    });
  });

  // Regression guard: auto-height viewports keep the existing auto-zoom-to-fit-width behaviour.
  it("auto-fits the width for an auto-height viewport wider than the frame", () => {
    const { zoom, autoZoom, rootHeight } = getZoomConfig(
      vp(1600, "auto"),
      frame,
      1
    );
    expect(zoom).toBeCloseTo(0.5); // 800 / 1600
    expect(autoZoom).toBeCloseTo(0.5);
    expect(rootHeight).toBeCloseTo(1200); // viewportHeight(600) / zoom(0.5)
  });

  it("does not zoom an auto-height viewport that fits within the frame", () => {
    expect(getZoomConfig(vp(400, "auto"), frame, 1)).toEqual({
      autoZoom: 1,
      zoom: 1,
      rootHeight: 600,
    });
  });
});
