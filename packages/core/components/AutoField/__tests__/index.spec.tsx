class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AutoField } from "../index";

describe("AutoField", () => {
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
});
