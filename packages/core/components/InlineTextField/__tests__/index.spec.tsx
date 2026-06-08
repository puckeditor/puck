import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InlineTextField } from "../index";

// useAppStoreApi reads from a Zustand-style API; we only need a getState() that
// returns the slice InlineTextField touches in its effect.
const makeAppStore = () => ({
  getState: () => ({
    state: {
      indexes: {
        nodes: {
          "comp-1": {
            data: { type: "MyBlock", props: { id: "comp-1" } },
          },
        },
      },
    },
    getComponentConfig: () => ({ fields: {} }),
  }),
});

jest.mock("../../../store", () => ({
  useAppStoreApi: () => makeAppStore(),
}));

jest.mock("../../../lib/overlay-portal", () => ({
  registerOverlayPortal: () => () => undefined,
}));

jest.mock("../styles.module.css");

describe("InlineTextField", () => {
  it("renders empty when value is null instead of the literal string 'null'", () => {
    const { container } = render(
      <InlineTextField
        propPath="subtitle"
        componentId="comp-1"
        value={null}
        isReadOnly={false}
      />
    );

    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.innerText ?? span?.textContent ?? "").toBe("");
  });

  it("renders empty when value is undefined instead of the literal string 'undefined'", () => {
    const { container } = render(
      <InlineTextField
        propPath="subtitle"
        componentId="comp-1"
        value={undefined}
        isReadOnly={false}
      />
    );

    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.innerText ?? span?.textContent ?? "").toBe("");
  });

  it("renders the value when it is a non-empty string", () => {
    const { container } = render(
      <InlineTextField
        propPath="subtitle"
        componentId="comp-1"
        value="Hello world"
        isReadOnly={false}
      />
    );

    const span = container.querySelector("span");
    expect(span?.textContent).toBe("Hello world");
  });
});
