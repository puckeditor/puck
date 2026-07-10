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
