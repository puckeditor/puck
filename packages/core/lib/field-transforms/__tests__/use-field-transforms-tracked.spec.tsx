import { renderHook } from "@testing-library/react";
import { useFieldTransformsTracked } from "../use-field-transforms-tracked";
import { getInlineTextTransform } from "../default-transforms/inline-text-transform";
import { Config, ComponentData } from "../../../types";

const config: Config = {
  components: {
    Card: {
      fields: {
        label: { type: "text" },
        note: { type: "custom", render: () => null as any },
      },
      render: () => null as any,
    },
  },
};

const transforms = getInlineTextTransform();

const makeItem = (props: Record<string, any>): ComponentData =>
  ({
    type: "Card",
    props: { id: "c1", ...props },
  } as ComponentData);

describe("useFieldTransformsTracked", () => {
  it("maps all props on first render", () => {
    const { result } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem({ label: "First", note: "n" }) } }
    );

    expect(result.current.label).toBe("First");
    expect(result.current.note).toBe("n");
  });

  it("keeps unchanged mapper-covered props across re-renders (no undefined clobber)", () => {
    // mapFields defaults every mapper-covered field, so an incremental pass
    // over unchanged props (changedProps = { id }) must not adopt the
    // resulting `undefined` for props that still hold a value.
    const { result, rerender } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem({ label: "First", note: "n" }) } }
    );

    // New item identity, identical prop values → incremental pass.
    rerender({ item: makeItem({ label: "First", note: "n" }) });

    expect(result.current.label).toBe("First");
    expect(result.current.note).toBe("n");
  });

  it("adopts changed prop values", () => {
    const { result, rerender } = renderHook(
      ({ item }) => useFieldTransformsTracked(config, item, transforms),
      { initialProps: { item: makeItem({ label: "First" }) } }
    );

    rerender({ item: makeItem({ label: "Edited" }) });

    expect(result.current.label).toBe("Edited");
  });

  it("still defaults mapper-covered fields that have no value at all", () => {
    // A contentEditable text field with no value must keep being mapped (it
    // is never in item.props, so it can't ride the changed-props path).
    const editableConfig: Config = {
      components: {
        EH: {
          fields: { title: { type: "text", contentEditable: true } },
          render: () => null as any,
        },
      },
    };

    const item = { type: "EH", props: { id: "e1" } } as ComponentData;
    const { result, rerender } = renderHook(
      ({ item: i }) =>
        useFieldTransformsTracked(editableConfig, i, transforms),
      { initialProps: { item } }
    );

    // The transform swaps the (missing) value for an element.
    expect(result.current.title).not.toBeUndefined();

    rerender({ item: { type: "EH", props: { id: "e1" } } as ComponentData });
    expect(result.current.title).not.toBeUndefined();
  });
});
