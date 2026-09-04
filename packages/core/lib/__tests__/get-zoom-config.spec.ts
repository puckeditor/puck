import { getZoomConfig } from "../get-zoom-config";
import type { AppState } from "../../types";

// getZoomConfig reads the frame's rendered box; stub it to a fixed 960×800 preview area.
jest.mock("css-box-model", () => ({
  getBox: () => ({ contentBox: { width: 960, height: 800 } }),
}));

const frame = {} as HTMLElement;
type Viewport = AppState["ui"]["viewports"]["current"];
const vp = (width: Viewport["width"], height: Viewport["height"]): Viewport =>
  ({ width, height } as Viewport);

describe("getZoomConfig", () => {
  describe("explicit height (#883)", () => {
    // rootHeight is the unscaled height of the root, which is then multiplied by
    // `transform: scale(zoom)`. For an explicit height it must stay at its real value so
    // the rendered height scales by the same factor as the width (aspect ratio preserved).
    it("fits the width and scales the height by the same factor when width is the constraint", () => {
      const { zoom, autoZoom, rootHeight } = getZoomConfig(
        vp(1920, 1080),
        frame,
        1
      );

      expect(zoom).toBeCloseTo(0.5); // 960 / 1920
      expect(autoZoom).toBeCloseTo(0.5);
      expect(rootHeight).toBe(1080); // renders at 1080 * 0.5 = 540px, keeping 16:9
    });

    it("fits the height and keeps the real height when height is the constraint", () => {
      const { zoom, autoZoom, rootHeight } = getZoomConfig(
        vp(800, 2000),
        frame,
        1
      );

      expect(zoom).toBeCloseTo(0.4); // 800 / 2000
      expect(autoZoom).toBeCloseTo(0.4);
      expect(rootHeight).toBe(2000); // renders at 2000 * 0.4 = 800px, keeping 2:5
    });

    it("fits the more constrained axis when both exceed the frame", () => {
      const { zoom, rootHeight } = getZoomConfig(vp(1920, 3200), frame, 1);

      // widthZoom = 0.5, heightZoom = 0.25 → height wins
      expect(zoom).toBeCloseTo(0.25);
      expect(rootHeight).toBe(3200);
    });

    it("renders 1:1 when the viewport fits within the frame", () => {
      expect(getZoomConfig(vp(400, 300), frame, 1)).toEqual({
        autoZoom: 1,
        zoom: 1,
        rootHeight: 300,
      });
    });

    it("ignores the current zoom and recomputes from the viewport", () => {
      // The `zoom` argument is the previous zoom; auto-fit must not depend on it.
      const { zoom, rootHeight } = getZoomConfig(vp(1920, 1080), frame, 0.25);

      expect(zoom).toBeCloseTo(0.5);
      expect(rootHeight).toBe(1080);
    });

    it("does not auto-zoom a non-numeric width", () => {
      expect(getZoomConfig(vp("100%", 1080), frame, 1)).toEqual({
        autoZoom: 1,
        zoom: 1,
        rootHeight: 1080,
      });
    });
  });

  // Regression guard: auto-height viewports keep the existing behaviour, where the
  // root is stretched so that it fills the frame at the auto-fitted zoom.
  describe("auto height", () => {
    it("auto-fits the width and stretches the root to fill the frame", () => {
      const { zoom, autoZoom, rootHeight } = getZoomConfig(
        vp(1920, "auto"),
        frame,
        1
      );

      expect(zoom).toBeCloseTo(0.5); // 960 / 1920
      expect(autoZoom).toBeCloseTo(0.5);
      expect(rootHeight).toBeCloseTo(1600); // frameHeight(800) / zoom(0.5)
    });

    it("does not zoom a viewport that fits within the frame", () => {
      expect(getZoomConfig(vp(400, "auto"), frame, 1)).toEqual({
        autoZoom: 1,
        zoom: 1,
        rootHeight: 800,
      });
    });

    it("does not auto-zoom a non-numeric width", () => {
      expect(getZoomConfig(vp("100%", "auto"), frame, 1)).toEqual({
        autoZoom: 1,
        zoom: 1,
        rootHeight: 800,
      });
    });
  });
});
