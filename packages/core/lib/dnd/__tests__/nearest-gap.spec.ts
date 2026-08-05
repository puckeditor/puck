import { getNearestGapIndex } from "../nearest-gap";

type ItemSpec = { id: string; top: number; height: number };

const rect = (top: number, height: number): DOMRect =>
  ({
    top,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    height,
    x: 0,
    y: top,
    toJSON: () => {},
  } as DOMRect);

const makeZone = (items: ItemSpec[]) => {
  const zone = document.createElement("div");

  items.forEach(({ id, top, height }) => {
    const el = document.createElement("div");

    el.setAttribute("data-puck-component", id);
    el.getBoundingClientRect = () => rect(top, height);

    zone.appendChild(el);
  });

  document.body.appendChild(zone);

  return zone;
};

describe("getNearestGapIndex", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the index of the gap nearest the pointer", () => {
    const contentIds = ["a", "b", "c"];
    const zone = makeZone([
      { id: "a", top: 0, height: 100 },
      { id: "b", top: 100, height: 100 },
      { id: "c", top: 200, height: 100 },
    ]);

    expect(getNearestGapIndex(zone, { x: 50, y: 5 }, contentIds)).toBe(0);
    expect(getNearestGapIndex(zone, { x: 50, y: 90 }, contentIds)).toBe(1);
    expect(getNearestGapIndex(zone, { x: 50, y: 110 }, contentIds)).toBe(1);
    expect(getNearestGapIndex(zone, { x: 50, y: 190 }, contentIds)).toBe(2);
    expect(getNearestGapIndex(zone, { x: 50, y: 290 }, contentIds)).toBe(3);
  });

  it("maps rendered items to their content indices in virtualized zones", () => {
    // 50 items, but only a window (20..23) is rendered in the DOM
    const contentIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    const zone = makeZone([
      { id: "item-20", top: 0, height: 100 },
      { id: "item-21", top: 100, height: 100 },
      { id: "item-22", top: 200, height: 100 },
      { id: "item-23", top: 300, height: 100 },
    ]);

    expect(getNearestGapIndex(zone, { x: 50, y: 95 }, contentIds)).toBe(21);
    expect(getNearestGapIndex(zone, { x: 50, y: 205 }, contentIds)).toBe(22);
    expect(getNearestGapIndex(zone, { x: 50, y: 390 }, contentIds)).toBe(24);
    expect(getNearestGapIndex(zone, { x: 50, y: 4 }, contentIds)).toBe(20);
  });

  it("exposes both edges of a virtualization discontinuity", () => {
    const contentIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);

    // item-10 is pinned (e.g. selected) far above the rendered window
    const zone = makeZone([
      { id: "item-10", top: 0, height: 100 },
      { id: "item-30", top: 500, height: 100 },
      { id: "item-31", top: 600, height: 100 },
    ]);

    expect(getNearestGapIndex(zone, { x: 50, y: 105 }, contentIds)).toBe(11);
    expect(getNearestGapIndex(zone, { x: 50, y: 495 }, contentIds)).toBe(30);
  });

  it("ignores elements that aren't part of the zone's content", () => {
    const contentIds = ["a", "b"];
    const zone = makeZone([
      { id: "a", top: 0, height: 100 },
      { id: "spacer", top: 100, height: 50 }, // e.g. virtualizer gap element
      { id: "b", top: 150, height: 100 },
    ]);

    expect(getNearestGapIndex(zone, { x: 50, y: 130 }, contentIds)).toBe(1);
  });

  it("returns 0 for empty zones", () => {
    const zone = makeZone([]);

    expect(getNearestGapIndex(zone, { x: 50, y: 50 }, [])).toBe(0);
  });
});

type HItemSpec = { id: string; left: number; width: number };

const hRect = (left: number, width: number): DOMRect =>
  ({
    top: 0,
    bottom: 100,
    left,
    right: left + width,
    width,
    height: 100,
    x: left,
    y: 0,
    toJSON: () => {},
  } as DOMRect);

const makeRowZone = (items: HItemSpec[], { rtl }: { rtl?: boolean } = {}) => {
  const zone = document.createElement("div");

  if (rtl) zone.setAttribute("dir", "rtl");

  items.forEach(({ id, left, width }) => {
    const el = document.createElement("div");

    el.setAttribute("data-puck-component", id);
    el.getBoundingClientRect = () => hRect(left, width);

    zone.appendChild(el);
  });

  document.body.appendChild(zone);

  return zone;
};

describe("getNearestGapIndex in horizontal flows", () => {
  let getComputedStyleSpy: jest.SpyInstance;

  beforeEach(() => {
    getComputedStyleSpy = jest
      .spyOn(window, "getComputedStyle")
      .mockReturnValue({
        display: "flex",
        flexDirection: "row",
        gridTemplateColumns: "none",
        gridTemplateRows: "none",
        gridAutoFlow: "row",
      } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    getComputedStyleSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("targets the nearest vertical gap along a row (ltr)", () => {
    const contentIds = ["a", "b", "c"];
    const zone = makeRowZone([
      { id: "a", left: 0, width: 100 },
      { id: "b", left: 100, width: 100 },
      { id: "c", left: 200, width: 100 },
    ]);

    expect(getNearestGapIndex(zone, { x: 5, y: 50 }, contentIds)).toBe(0);
    expect(getNearestGapIndex(zone, { x: 110, y: 50 }, contentIds)).toBe(1);
    expect(getNearestGapIndex(zone, { x: 295, y: 50 }, contentIds)).toBe(3);
  });

  it("mirrors before/after edges for rtl rows", () => {
    // DOM order is a, b, c but rtl lays them right-to-left, so index order
    // runs from the right edge to the left.
    const contentIds = ["a", "b", "c"];
    const zone = makeRowZone(
      [
        { id: "a", left: 200, width: 100 },
        { id: "b", left: 100, width: 100 },
        { id: "c", left: 0, width: 100 },
      ],
      { rtl: true }
    );

    // Before the first item sits at its right edge (x = 300).
    expect(getNearestGapIndex(zone, { x: 299, y: 50 }, contentIds)).toBe(0);
    // After the last item sits at its left edge (x = 0).
    expect(getNearestGapIndex(zone, { x: 1, y: 50 }, contentIds)).toBe(3);
    // Between b and c (x = 100).
    expect(getNearestGapIndex(zone, { x: 110, y: 50 }, contentIds)).toBe(2);
  });
});
