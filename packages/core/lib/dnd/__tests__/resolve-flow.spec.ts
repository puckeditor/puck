import { resolveZoneFlow } from "../resolve-flow";

const zoneWith = (style: Partial<CSSStyleDeclaration>, dir?: "ltr" | "rtl") => {
  const el = document.createElement("div");

  if (dir) el.setAttribute("dir", dir);

  const win = {
    getComputedStyle: () =>
      ({
        display: "block",
        flexDirection: "row",
        gridTemplateColumns: "none",
        gridTemplateRows: "none",
        gridAutoFlow: "row",
        ...style,
      } as CSSStyleDeclaration),
  } as unknown as Window;

  return { el, win };
};

describe("resolveZoneFlow", () => {
  it("treats block containers as a vertical stack", () => {
    const { el, win } = zoneWith({ display: "block" });

    expect(resolveZoneFlow(el, win)).toEqual({ axis: "y", reversed: false });
  });

  it("resolves flex rows (incl. inline-flex) to a horizontal axis", () => {
    expect(
      resolveZoneFlow(...toArgs({ display: "flex", flexDirection: "row" }))
    ).toEqual({ axis: "x", reversed: false });
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "inline-flex", flexDirection: "row" })
      )
    ).toEqual({ axis: "x", reversed: false });
  });

  it("reverses rows for rtl and row-reverse (and un-reverses when combined)", () => {
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "flex", flexDirection: "row" }, "rtl")
      )
    ).toEqual({ axis: "x", reversed: true });
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "flex", flexDirection: "row-reverse" })
      )
    ).toEqual({ axis: "x", reversed: true });
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "flex", flexDirection: "row-reverse" }, "rtl")
      )
    ).toEqual({ axis: "x", reversed: false });
  });

  it("resolves flex columns to a vertical axis", () => {
    expect(
      resolveZoneFlow(...toArgs({ display: "flex", flexDirection: "column" }))
    ).toEqual({ axis: "y", reversed: false });
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "flex", flexDirection: "column-reverse" })
      )
    ).toEqual({ axis: "y", reversed: true });
  });

  it("treats single-column and bare grids as a vertical stack", () => {
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "grid", gridTemplateColumns: "100px" })
      )
    ).toEqual({ axis: "y", reversed: false });
    // A bare `display: grid` serializes its templates as "none" (a single
    // implicit column that fills row-by-row).
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "grid", gridTemplateColumns: "none" })
      )
    ).toEqual({ axis: "y", reversed: false });
    // Bracketed line-name tokens must not be counted as tracks.
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "grid", gridTemplateColumns: "[start] 1fr [end]" })
      )
    ).toEqual({ axis: "y", reversed: false });
  });

  it("treats a multi-column grid as horizontal (respecting rtl)", () => {
    expect(
      resolveZoneFlow(
        ...toArgs({ display: "grid", gridTemplateColumns: "100px 100px 100px" })
      )
    ).toEqual({ axis: "x", reversed: false });
    expect(
      resolveZoneFlow(
        ...toArgs(
          { display: "grid", gridTemplateColumns: "100px 100px" },
          "rtl"
        )
      )
    ).toEqual({ axis: "x", reversed: true });
  });

  it("treats column auto-flow grids as horizontal", () => {
    // Column auto-flow lays items out across, even without explicit columns.
    expect(
      resolveZoneFlow(
        ...toArgs({
          display: "grid",
          gridTemplateColumns: "none",
          gridAutoFlow: "column",
        })
      )
    ).toEqual({ axis: "x", reversed: false });
    expect(
      resolveZoneFlow(
        ...toArgs({
          display: "inline-grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoFlow: "row",
        })
      )
    ).toEqual({ axis: "x", reversed: false });
  });
});

const toArgs = (
  style: Partial<CSSStyleDeclaration>,
  dir?: "ltr" | "rtl"
): [Element, Window] => {
  const { el, win } = zoneWith(style, dir);

  return [el, win];
};
