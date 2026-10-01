class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AutoField } from "../index";

describe("AutoField", () => {
  it("renders with a provided id and sets the DOM id", () => {
    const { container } = render(
      <AutoField
        id="title"
        field={{ type: "text" }}
        value="Hello world"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>("input#title");
    expect(input).not.toBeNull();
    expect(input!.id).toBe("title");
    expect(input!.value).toBe("Hello world");
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

  it("generates a safe id when id is not provided", () => {
    const { container } = render(
      <AutoField
        field={{ type: "text" }}
        value="No id provided"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>("input");
    expect(input).not.toBeNull();
    expect(input!.id).toBeTruthy();
    expect(input!.value).toBe("No id provided");
  });

  it("calls onChange when the input value changes", () => {
    const onChange = jest.fn();
    const { container } = render(
      <AutoField
        id="settings.title"
        field={{ type: "text" }}
        value="Initial"
        onChange={onChange}
      />
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="settings.title"]'
    );
    fireEvent.change(input!, { target: { value: "Updated" } });

    expect(onChange).toHaveBeenCalledWith("Updated");
  });

  it("updates value when the value prop changes", () => {
    const { container, rerender } = render(
      <AutoField
        id="settings.title"
        field={{ type: "text" }}
        value="Initial"
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector<HTMLInputElement>(
      'input[id="settings.title"]'
    );
    expect(input!.value).toBe("Initial");

    rerender(
      <AutoField
        id="settings.title"
        field={{ type: "text" }}
        value="Changed externally"
        onChange={jest.fn()}
      />
    );

    expect(input!.value).toBe("Changed externally");
  });

  it("supports textarea field with dotted id", () => {
    const { container } = render(
      <AutoField
        id="settings.description"
        field={{ type: "textarea" }}
        value={"Line 1\nLine 2"}
        onChange={jest.fn()}
      />
    );

    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[id="settings.description"]'
    );
    expect(textarea).not.toBeNull();
    expect(textarea!.id).toBe("settings.description");
    expect(textarea!.value).toBe("Line 1\nLine 2");
  });

  it("supports select field with dotted id", () => {
    const { container } = render(
      <AutoField
        id="settings.layout"
        field={{
          type: "select",
          options: [
            { label: "Grid", value: "grid" },
            { label: "Flex", value: "flex" },
          ],
        }}
        value="flex"
        onChange={jest.fn()}
      />
    );

    const select = container.querySelector<HTMLSelectElement>(
      'select[id="settings.layout"]'
    );
    expect(select).not.toBeNull();
    expect(select!.id).toBe("settings.layout");
    expect(JSON.parse(select!.value)).toEqual({ value: "flex" });
  });
});
