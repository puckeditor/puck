import { fireEvent, render, screen } from "@testing-library/react";
import { appStoreContext, createAppStore } from "../../store";
import { fieldContextStore } from "./store";
import { AutoFieldPrivate } from ".";

jest.mock("../Sortable", () => ({
  Sortable: ({
    children,
  }: {
    children: (props: {
      isDragging: boolean;
      ref: null;
      handleRef: null;
    }) => JSX.Element;
  }) => children({ isDragging: false, ref: null, handleRef: null }),
  SortableProvider: ({ children }: { children: JSX.Element }) => children,
}));

jest.mock("../../bundle", () => {
  const { setDeep } = jest.requireActual("../../lib/data/set-deep");

  return { setDeep };
});

describe("AutoField", () => {
  it("updates controlled custom fields immediately", () => {
    const appStore = createAppStore();
    const onChange = jest.fn();

    render(
      <appStoreContext.Provider value={appStore}>
        <fieldContextStore.Provider value={{ title: "Hello world" }}>
          <AutoFieldPrivate
            field={{
              type: "custom",
              render: ({ id, value, onChange }) => (
                <input
                  id={id}
                  value={value ?? ""}
                  onChange={(e) => onChange(e.currentTarget.value)}
                />
              ),
            }}
            id="title"
            name="title"
            onChange={onChange}
          />
        </fieldContextStore.Provider>
      </appStoreContext.Provider>
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Hello brave world" },
    });

    expect(onChange).toHaveBeenCalledWith("Hello brave world", undefined);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "Hello brave world"
    );
  });
});
