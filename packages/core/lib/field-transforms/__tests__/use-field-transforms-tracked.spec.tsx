import { renderHook } from "@testing-library/react";
import { ComponentData, Config } from "../../../types";
import { FieldTransforms } from "../../../types/API/FieldTransforms";
import { useFieldTransformsTracked } from "../use-field-transforms-tracked";

type Props = {
  Comp: {
    body?: string;
    other?: string;
  };
};

const makeConfig = (): Config<Props> => ({
  components: {
    Comp: {
      fields: {
        body: { type: "text" },
        other: { type: "text" },
      },
      render: () => <div />,
    },
  },
});

type TransformCall = { propPath: string; value: any; isReadOnly?: boolean };

const makeTransforms = (calls: TransformCall[]): FieldTransforms => ({
  text: ({ value, propPath }) => {
    calls.push({ propPath, value });

    return `transformed:${propPath}:${value}`;
  },
});

const makeSlotConfig = (): Config => ({
  components: {
    Comp: {
      fields: {
        slotA: { type: "slot" },
        slotB: { type: "slot" },
        body: { type: "text" },
      },
      render: () => <div />,
    },
  },
});

const makeItem = (props: Record<string, any> = {}): ComponentData => ({
  type: "Comp",
  props: { id: "comp-1", ...props },
});

describe("useFieldTransformsTracked", () => {
  it("transforms props on first render", () => {
    const calls: TransformCall[] = [];
    const transforms = makeTransforms(calls);
    const item = makeItem({ body: "<p>Hello</p>" });

    const { result } = renderHook(
      ({ config }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { config: makeConfig() } }
    );

    expect(result.current.body).toBe("transformed:body:<p>Hello</p>");
  });

  it("re-runs transforms when a prop value changes", () => {
    const calls: TransformCall[] = [];
    const transforms = makeTransforms(calls);
    const config = makeConfig();

    const { result, rerender } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem({ body: "<p>Hello</p>" }) } }
    );

    rerender({ item: makeItem({ body: "<p>Edited</p>" }) });

    expect(result.current.body).toBe("transformed:body:<p>Edited</p>");
  });

  it("does not re-run transforms for unchanged props", () => {
    const calls: TransformCall[] = [];
    const transforms = makeTransforms(calls);
    const config = makeConfig();
    const props = { body: "<p>Hello</p>", other: "Keep me" };

    const { result, rerender } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem(props) } }
    );

    // `other` keeps the same value identity; only `body` changes
    rerender({ item: makeItem({ ...props, body: "<p>Edited</p>" }) });

    expect(result.current.other).toBe("transformed:other:Keep me");
    expect(calls.filter((c) => c.propPath === "other")).toHaveLength(1);
  });

  it("re-runs all transforms when readOnly changes", () => {
    const calls: TransformCall[] = [];
    const transforms: FieldTransforms = {
      text: ({ value, propPath, isReadOnly }) => {
        calls.push({ propPath, value, isReadOnly });

        return `transformed:${propPath}:${value}:${isReadOnly}`;
      },
    };
    const config = makeConfig();
    const item = makeItem({ body: "<p>Hello</p>" }); // `other` unset

    const { result, rerender } = renderHook(
      ({ forceReadOnly }) =>
        useFieldTransformsTracked(
          config,
          item,
          transforms,
          undefined,
          forceReadOnly
        ),
      { initialProps: { forceReadOnly: true } }
    );

    expect(result.current.body).toBe("transformed:body:<p>Hello</p>:true");

    rerender({ forceReadOnly: false });

    expect(result.current.body).toBe("transformed:body:<p>Hello</p>:false");
    expect(result.current.other).toBe("transformed:other:undefined:false");
  });

  it("does not visit slot fields absent from props", () => {
    const slotCalls: TransformCall[] = [];
    const transforms: FieldTransforms = {
      slot: ({ value, propPath }) => {
        slotCalls.push({ propPath, value });

        return value;
      },
    };
    const item = makeItem({ body: "Hello" }); // no slot props

    renderHook(() =>
      useFieldTransformsTracked(makeSlotConfig(), item, transforms)
    );

    expect(slotCalls).toHaveLength(0);
  });

  it("re-walks only the changed slot, keeping sibling slot results", () => {
    const slotCalls: TransformCall[] = [];
    const transforms: FieldTransforms = {
      slot: ({ value, propPath }) => {
        slotCalls.push({ propPath, value });

        return value;
      },
    };
    const config = makeSlotConfig();

    const { rerender } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem({ slotA: [] }) } } // one slot set, slotB unset
    );

    // The first walk defaults the unset slotB, so it is walked too
    expect(slotCalls.map((c) => c.propPath).sort()).toEqual(["slotA", "slotB"]);

    slotCalls.length = 0;

    rerender({ item: makeItem({ slotA: [] }) }); // new array identity

    // Only the changed slot is re-walked; slotB keeps its previous result
    expect(slotCalls.map((c) => c.propPath)).toEqual(["slotA"]);
  });
});
