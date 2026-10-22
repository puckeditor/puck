import sortElementsByPosition from "../sort-elements-by-position";

type Item = { el: HTMLElement };

const getEl = (item: Item) => item.el;

const items = (...ids: string[]): Item[] =>
  ids.map((id) => ({ el: document.getElementById(id)! }));

beforeEach(() => {
  document.body.innerHTML = `
    <span id="a"></span>
    <div><div><span id="b"></span></div></div>
    <span id="c"></span>
  `;
});

describe("sortElementsByPosition", () => {
  it("returns the same array when it's already in DOM order", () => {
    const sorted = items("a", "b", "c");

    expect(sortElementsByPosition(sorted, getEl)).toBe(sorted);
  });

  it("returns a new array in DOM order, without changing the original, when it's out of order", () => {
    const unsorted = items("c", "a", "b");

    const result = sortElementsByPosition(unsorted, getEl);

    expect(result).not.toBe(unsorted);
    expect(result.map((item) => item.el.id)).toEqual(["a", "b", "c"]);
    expect(unsorted.map((item) => item.el.id)).toEqual(["c", "a", "b"]);
  });

  it("returns empty and single item arrays as they are", () => {
    const empty: Item[] = [];
    const single = items("b");

    expect(sortElementsByPosition(empty, getEl)).toBe(empty);
    expect(sortElementsByPosition(single, getEl)).toBe(single);
  });
});
