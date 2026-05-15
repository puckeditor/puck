import { loadOverrides } from "../load-overrides";

describe("load-overrides", () => {
  it("should curry the overrides for any given override", () => {
    const loaded = loadOverrides({
      overrides: {
        header: ({ children }) => `${children} | 1` as any,
      },
      plugins: [
        {
          overrides: {
            header: ({ children }) => `${children} | 2` as any,
          },
        },
        {
          overrides: {
            header: ({ children }) => `${children} | 3` as any,
          },
        },
      ],
    });

    expect(loaded.header!({ actions: "", children: "0" })).toBe(
      "0 | 1 | 2 | 3"
    );
  });

  it("should curry the overrides for fieldTypes", () => {
    const loaded = loadOverrides({
      overrides: {
        fieldTypes: { text: ({ children }) => `${children} | 1` as any },
      },
      plugins: [
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 2` as any },
          },
        },
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 3` as any },
          },
        },
      ],
    });

    expect(loaded.fieldTypes!.text!({ children: "0" } as any)).toBe(
      "0 | 1 | 2 | 3"
    );
  });

  it("should avoid mutating the provided overrides", () => {
    const overrides = {};
    const loaded = loadOverrides({
      overrides,
      plugins: [
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 1` as any },
          },
        },
      ],
    });

    expect(overrides).toEqual({});
  });

  it("should avoid mutating nested fieldTypes on the provided overrides", () => {
    const overrides = {
      fieldTypes: {
        text: ({ children }: { children: string }) => `${children} | 1` as any,
      },
    };

    loadOverrides({
      overrides,
      plugins: [
        {
          overrides: {
            fieldTypes: {
              text: ({ children }: { children: string }) =>
                `${children} | 2` as any,
            },
          },
        },
      ],
    });

    expect(overrides.fieldTypes.text!({ children: "0" } as any)).toBe("0 | 1");
  });
});
