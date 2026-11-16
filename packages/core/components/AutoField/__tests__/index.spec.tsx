class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { fireEvent, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { AutoField } from "../index";

describe("AutoField", () => {
  it("honors custom id prop on input element", () => {
    const { container } = render(
      <AutoField
        id="my-custom-id"
        field={{ type: "text" }}
        value="Custom ID test"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="my-custom-id"]'
    );
    expect(input).not.toBeNull();
    expect(input!.id).toBe("my-custom-id");
    expect(input!.value).toBe("Custom ID test");
  });

  it("renders value when id has dots (regression test for dotted id)", () => {
    const { container } = render(
      <AutoField
        id="settings.title"
        field={{ type: "text" }}
        value="Hello world"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="settings.title"]'
    );
    expect(input).not.toBeNull();
    expect(input!.id).toBe("settings.title");
    expect(input!.value).toBe("Hello world");
  });

  it("renders value when id has brackets", () => {
    const { container } = render(
      <AutoField
        id="items[0].title"
        field={{ type: "text" }}
        value="Array item title"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="items[0].title"]'
    );
    expect(input).not.toBeNull();
    expect(input!.id).toBe("items[0].title");
    expect(input!.value).toBe("Array item title");
  });

  it("allows focus events to bubble to parent elements (skips stopPropagation for public fields)", () => {
    const onParentFocus = jest.fn();

    const { container } = render(
      <div onFocus={onParentFocus}>
        <AutoField
          id="bubbling-test"
          field={{ type: "text" }}
          value="Focus me"
          onChange={jest.fn()}
        />
      </div>
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="bubbling-test"]'
    );
    expect(input).not.toBeNull();

    fireEvent.focus(input!);
    expect(onParentFocus).toHaveBeenCalledTimes(1);
  });

  it("does not ignore controlled value updates while focused (e.g. uppercase transform)", () => {
    const ControlledComponent = () => {
      const [value, setValue] = useState("abc");
      return (
        <AutoField
          id="controlled-field"
          field={{ type: "text" }}
          value={value}
          onChange={(v) => setValue((v || "").toUpperCase())}
        />
      );
    };

    const { container } = render(<ControlledComponent />);
    const input = container.querySelector<HTMLInputElement>(
      'input[id="controlled-field"]'
    );
    expect(input).not.toBeNull();
    expect(input!.value).toBe("abc");

    // Focus the input
    fireEvent.focus(input!);

    // Change input value while still focused
    fireEvent.change(input!, { target: { value: "hello" } });

    // The controlled uppercase value must reflect immediately without needing blur
    expect(input!.value).toBe("HELLO");
  });

  it("mitigates ID collisions when two fields share the same id", () => {
    const { container } = render(
      <div>
        <AutoField
          id="duplicate-id"
          field={{ type: "text" }}
          value="Field 1"
          onChange={jest.fn()}
        />
        <AutoField
          id="duplicate-id"
          field={{ type: "text" }}
          value="Field 2"
          onChange={jest.fn()}
        />
      </div>
    );

    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    expect(inputs).toHaveLength(2);
    // First field claims the ID
    expect(inputs[0].id).toBe("duplicate-id");
    // Second field detects collision and falls back to a generated safe ID
    expect(inputs[1].id).not.toBe("duplicate-id");
    expect(inputs[1].id).toBeTruthy();
  });

  it("isolates array field instances when rendered with the same id", () => {
    const onChangeA = jest.fn();
    const onChangeB = jest.fn();

    const { container } = render(
      <div>
        <AutoField
          id="shared-array"
          field={{
            type: "array",
            arrayFields: { text: { type: "text" } },
            getItemSummary: (item: any) => item.text,
          }}
          value={[{ text: "Item 1" }]}
          onChange={onChangeA}
        />
        <AutoField
          id="shared-array"
          field={{
            type: "array",
            arrayFields: { text: { type: "text" } },
            getItemSummary: (item: any) => item.text,
          }}
          value={[{ text: "Item A" }, { text: "Item B" }]}
          onChange={onChangeB}
        />
      </div>
    );

    // Both array fields must render their respective items without clashing
    expect(container).toHaveTextContent("Item 1");
    expect(container).toHaveTextContent("Item A");
    expect(container).toHaveTextContent("Item B");
  });
});
