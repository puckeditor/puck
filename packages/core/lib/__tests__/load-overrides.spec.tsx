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
            header: undefined, // Ignored
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
            fieldTypes: { text: undefined }, // Ignored
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

  it("should hide field type overrides when the last plugin sets it to null", () => {
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
            fieldTypes: { text: null },
          },
        },
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 3` as any },
          },
        },
        {
          overrides: {
            fieldTypes: { text: null },
          },
        },
      ],
    });

    expect(loaded.fieldTypes!.text).toBeNull();
  });

  it("should show field types overrides when the last plugin sets it to a value regardless of previous nulls", () => {
    const loaded = loadOverrides({
      overrides: {
        fieldTypes: { text: ({ children }) => `${children} | 1` as any },
      },
      plugins: [
        {
          overrides: {
            fieldTypes: { text: null },
          },
        },
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 2` as any },
          },
        },
        {
          overrides: {
            fieldTypes: { text: null },
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

  it("shouldn't collide field type overrides", () => {
    const loaded = loadOverrides({
      overrides: {
        fieldTypes: {
          text: ({ children }) => `Text: ${children} | 1` as any,
          number: ({ children }) => `Number: ${children} | 1` as any,
        },
      },
      plugins: [
        {
          overrides: {
            fieldTypes: { text: ({ children }) => `${children} | 2` as any },
          },
        },
        {
          overrides: {
            fieldTypes: { text: null },
          },
        },
        {
          overrides: {
            fieldTypes: { number: null },
          },
        },
        {
          overrides: {
            fieldTypes: { number: ({ children }) => `${children} | 2` as any },
          },
        },
      ],
    });

    expect(loaded.fieldTypes!.text).toBeNull();
    expect(loaded.fieldTypes!.number!({ children: "0" } as any)).toBe(
      "Number: 0 | 1 | 2"
    );
  });

  it("should avoid mutating the provided overrides", () => {
    const overrides = {};
    loadOverrides({
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
});
