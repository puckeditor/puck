import assignPathBinding from "../assign-path-binding";

const onArrayAssignment = jest.fn(
  <BoundeeItemValue, BoundValueItemValue>(
    _boundeeItem: {
      value: BoundeeItemValue;
      pathSegments: string[];
    },
    boundValueItem: {
      value: BoundValueItemValue;
      pathSegments: string[];
    }
  ) => {
    return boundValueItem.value;
  }
);

describe("assignPathBinding", () => {
  beforeEach(() => {
    onArrayAssignment.mockClear();
  });

  it("assigns object properties based on paths", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: "Don't click me",
          },
          pathSegments: ["data"],
        },
        expected: { props: { button: { label: "Don't click me" } } },
      },
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: {
              button: {
                label: "Don't click me",
              },
            },
          },
          pathSegments: ["data", "button", "label"],
        },
        expected: { props: { button: { label: "Don't click me" } } },
      },
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: {
              uiMessages: {
                home: {
                  button: "Don't click me",
                },
              },
            },
          },
          pathSegments: ["data", "uiMessages", "home", "button"],
        },
        expected: { props: { button: { label: "Don't click me" } } },
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
      expect(onArrayAssignment).not.toHaveBeenCalled();
    }
  });

  it("assigns array values based on paths with static indices", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {
              buttons: [{ label: "Click me 1" }, { label: "Click me 2" }],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                labels: ["Don't click me 1"],
              },
              {
                labels: ["Don't click me 2"],
              },
            ],
          },
          pathSegments: ["data", "[*]", "labels", "[0]"],
        },
        expected: {
          props: {
            buttons: [
              { label: "Don't click me 1" },
              { label: "Don't click me 2" },
            ],
          },
        },
      },
      {
        boundee: {
          value: {
            props: [
              { button: { label: "Click me 1" } },
              { button: { label: "Click me 2" } },
            ],
          },
          pathSegments: ["props", "[1]", "button", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                { label: "Don't click me 1" },
                { label: "Don't click me 2" },
              ],
            },
          },
          pathSegments: ["data", "buttons", "[0]", "label"],
        },
        expected: {
          props: [
            { button: { label: "Click me 1" } },
            { button: { label: "Don't click me 1" } },
          ],
        },
      },
      {
        boundee: {
          value: {
            props: [
              { buttons: [{ label: "Click me 1" }] },
              { buttons: [{ label: "Click me 2" }] },
            ],
          },
          pathSegments: ["props", "[1]", "buttons", "[0]", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                { label: "Don't click me 1" },
                { label: "Don't click me 2" },
              ],
            },
          },
          pathSegments: ["data", "buttons", "[0]", "label"],
        },
        expected: {
          props: [
            { buttons: [{ label: "Click me 1" }] },
            { buttons: [{ label: "Don't click me 1" }] },
          ],
        },
      },
      {
        boundee: {
          value: [
            { buttons: [{ label: "Click me 1" }] },
            { buttons: [{ label: "Click me 2" }] },
          ],
          pathSegments: ["[1]", "buttons", "[0]", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                { label: "Don't click me 1" },
                { label: "Don't click me 2" },
              ],
            },
          },
          pathSegments: ["data", "buttons", "[0]", "label"],
        },
        expected: [
          { buttons: [{ label: "Click me 1" }] },
          { buttons: [{ label: "Don't click me 1" }] },
        ],
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
      expect(onArrayAssignment).not.toHaveBeenCalled();
    }
  });

  it("assigns array values based on paths with wildcards", () => {
    const assignments = [
      // Adds items to an empty array
      {
        boundee: {
          value: {
            props: {
              buttons: [],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                label: "Don't click me 1",
              },
              {
                label: "Don't click me 2",
              },
            ],
          },
          pathSegments: ["data", "[*]", "label"],
        },
        expected: {
          props: {
            buttons: [
              { label: "Don't click me 1" },
              { label: "Don't click me 2" },
            ],
          },
        },
      },
      // Updates existing items in an array
      {
        boundee: {
          value: {
            props: {
              buttons: [{ label: "Click me 1" }, { label: "Click me 2" }],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                label: "Don't click me 1",
              },
              {
                label: "Don't click me 2",
              },
            ],
          },
          pathSegments: ["data", "[*]", "label"],
        },
        expected: {
          props: {
            buttons: [
              { label: "Don't click me 1" },
              { label: "Don't click me 2" },
            ],
          },
        },
      },
      {
        boundee: {
          value: {
            props: [
              {
                button: { label: "Click me 1" },
              },
              {
                button: { label: "Click me 2" },
              },
            ],
          },
          pathSegments: ["props", "[*]", "button", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                { label: "Don't click me" },
                { label: "Don't click me 2" },
              ],
            },
          },
          pathSegments: ["data", "buttons", "[*]", "label"],
        },
        expected: {
          props: [
            { button: { label: "Don't click me" } },
            { button: { label: "Don't click me 2" } },
          ],
        },
      },
      // Updates existing items in an array with multiple levels of nesting
      {
        boundee: {
          value: {
            props: [
              { rows: { heights: [{ pixels: 0 }] } },
              { rows: { heights: [{ pixels: 0 }] } },
              { rows: { heights: [{ pixels: 0 }] } },
            ],
          },
          pathSegments: ["props", "[*]", "rows", "heights", "[*]", "pixels"],
        },
        boundValue: {
          value: {
            data: {
              units: [
                { height: { rows: [{ pixels: 42 }] } },
                { height: { rows: [{ pixels: 43 }] } },
                { height: { rows: [{ pixels: 44 }] } },
                { height: { rows: [{ pixels: 45 }] } },
              ],
            },
          },
          pathSegments: [
            "data",
            "units",
            "[*]",
            "height",
            "rows",
            "[*]",
            "pixels",
          ],
        },
        expected: {
          props: [
            { rows: { heights: [{ pixels: 42 }] } },
            { rows: { heights: [{ pixels: 43 }] } },
            { rows: { heights: [{ pixels: 44 }] } },
            { rows: { heights: [{ pixels: 45 }] } },
          ],
        },
      },
      {
        boundee: {
          value: {
            props: [
              { rows: { heights: [{ pixels: 0 }] } },
              { rows: { heights: [{ pixels: 0 }] } },
              { rows: { heights: [{ pixels: 0 }] } },
            ],
          },
          pathSegments: ["props", "[*]", "rows", "heights", "[*]", "pixels"],
        },
        boundValue: {
          value: [
            { height: { rows: [{ pixels: { discrete: 42 } }] } },
            { height: { rows: [{ pixels: { discrete: 43 } }] } },
            { height: { rows: [{ pixels: { discrete: 44 } }] } },
            { height: { rows: [{ pixels: { discrete: 45 } }] } },
          ],
          pathSegments: ["[*]", "height", "rows", "[*]", "pixels", "discrete"],
        },
        expected: {
          props: [
            { rows: { heights: [{ pixels: 42 }] } },
            { rows: { heights: [{ pixels: 43 }] } },
            { rows: { heights: [{ pixels: 44 }] } },
            { rows: { heights: [{ pixels: 45 }] } },
          ],
        },
      },
      // Removes items from an array if the bound value has fewer items
      {
        boundee: {
          value: {
            props: {
              buttons: [
                { label: "Click me 1" },
                { label: "Click me 2" },
                { label: "Click me 3" },
              ],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                label: "Don't click me 1",
              },
            ],
          },
          pathSegments: ["data", "[*]", "label"],
        },
        expected: {
          props: {
            buttons: [{ label: "Don't click me 1" }],
          },
        },
      },
      {
        boundee: {
          value: [
            { label: "Click me 1" },
            { label: "Click me 2" },
            { label: "Click me 3" },
          ],
          pathSegments: ["[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                label: "Don't click me 1",
              },
            ],
          },
          pathSegments: ["data", "[*]", "label"],
        },
        expected: [{ label: "Don't click me 1" }],
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
      expect(onArrayAssignment).not.toHaveBeenCalled();
    }
  });

  it("assigns the same value to all when using boundee wildcards with static bound values", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {
              buttons: [
                {
                  label: "Click me",
                },
              ],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: {
              button: {
                label: "Don't click me",
              },
            },
          },
          pathSegments: ["data", "button", "label"],
        },
        expected: {
          props: {
            buttons: [
              {
                label: "Don't click me",
              },
            ],
          },
        },
      },
      {
        boundee: {
          value: {
            props: {
              tags: [
                {
                  langs: [
                    {
                      label: "Click me",
                    },
                    {
                      label: "Click me too",
                    },
                  ],
                },
              ],
            },
          },
          pathSegments: ["props", "tags", "[*]", "langs", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: {
              langs: [
                {
                  label: "Don't click me",
                },
              ],
            },
          },
          pathSegments: ["data", "langs", "[0]", "label"],
        },
        expected: {
          props: {
              tags: [
                {
                  langs: [
                    {
                      label: "Don't click me",
                    },
                    {
                      label: "Don't click me",
                    },
                  ],
                },
              ],
            },
        },
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
      expect(onArrayAssignment).not.toHaveBeenCalled();
    }
  });

  it("calls the onArrayAssignment callback when assigning array items with wildcards", () => {
    const assignments = [
      // Calls the onArrayAssignment callback when assigning array values
      {
        boundee: {
          value: {
            props: {
              buttons: ["Click me 1", "Click me 2", "Click me 3"],
            },
          },
          pathSegments: ["props", "buttons", "[*]"],
        },
        boundValue: {
          value: {
            data: ["Don't click me 1", "Don't click me 2", "Don't click me 3"],
          },
          pathSegments: ["data", "[*]"],
        },
        expected: {
          props: {
            buttons: [
              "Don't click me 1",
              "Don't click me 2",
              "Don't click me 3",
            ],
          },
        },
      },
      {
        boundee: {
          value: {
            props: {
              buttons: ["Click me 1", "Click me 2", "Click me 3"],
            },
          },
          pathSegments: ["props", "buttons", "[*]"],
        },
        boundValue: {
          value: {
            data: [
              { label: "Don't click me 1" },
              { label: "Don't click me 2" },
              { label: "Don't click me 3" },
            ],
          },
          pathSegments: ["data", "[*]"],
        },
        expected: {
          props: {
            buttons: [
              { label: "Don't click me 1" },
              { label: "Don't click me 2" },
              { label: "Don't click me 3" },
            ],
          },
        },
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
      expect(onArrayAssignment).toHaveBeenCalled();
    }
  });

  it("calls the onValueAssignment callback when assigning values", () => {
    const onValueAssignment = jest.fn(
      (
        boundeeItem: {
          value?: string;
          pathSegments: string[];
        },
        boundValueItem: {
          value?: string;
          pathSegments: string[];
        }
      ) => {
        expect(boundeeItem.pathSegments).toEqual([
          "props",
          "buttons",
          "[*]",
          "label",
        ]);
        expect(boundValueItem.pathSegments).toEqual([
          "data",
          "items",
          "[*]",
          "label",
        ]);

        return boundValueItem.value;
      }
    );

    const boundee = {
      value: {
        props: {
          buttons: [{ label: "Click me 1" }, { label: "Click me 2" }],
        },
      },
      pathSegments: ["props", "buttons", "[*]", "label"],
    };
    const boundValue = {
      value: {
        data: {
          items: [{ label: "Don't click me 1" }, { label: "Don't click me 2" }],
        },
      },
      pathSegments: ["data", "items", "[*]", "label"],
    };

    assignPathBinding(
      boundee,
      boundValue,
      onArrayAssignment,
      onValueAssignment
    );

    expect(onValueAssignment).toHaveBeenCalledTimes(2);
    expect(boundee.value).toEqual({
      props: {
        buttons: [{ label: "Don't click me 1" }, { label: "Don't click me 2" }],
      },
    });
  });

  it("doesn't override existing values with unrelated bound values", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
                notBound: "Don't change me",
              },
            },
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: "Don't click me",
          },
          pathSegments: ["data"],
        },
        expected: {
          props: {
            button: { label: "Don't click me", notBound: "Don't change me" },
          },
        },
      },
      {
        boundee: {
          value: {
            props: {
              buttons: [
                {
                  links: [{ label: "Click me", url: "https://example.com" }],
                  actions: [{ type: "alert", message: "Don't change me" }],
                },
              ],
            },
          },
          pathSegments: ["props", "buttons", "[*]", "links", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: [
              {
                links: [
                  {
                    label: "Don't click me",
                  },
                ],
              },
            ],
          },
          pathSegments: ["data", "[*]", "links", "[*]", "label"],
        },
        expected: {
          props: {
            buttons: [
              {
                links: [
                  { label: "Don't click me", url: "https://example.com" },
                ],
                actions: [{ type: "alert", message: "Don't change me" }],
              },
            ],
          },
        },
      },
      {
        boundee: {
          value: {
            props: {
              buttons: [
                {
                  label: "Click me",
                },
                {
                  label: "Should stay the same",
                },
              ],
            },
          },
          pathSegments: ["props", "buttons", "[0]", "label"],
        },
        boundValue: {
          value: {
            data: {
              uiMessages: {
                home: {
                  button: "Don't click me",
                },
              },
            },
          },
          pathSegments: ["data", "uiMessages", "home", "button"],
        },
        expected: {
          props: {
            buttons: [
              { label: "Don't click me" },
              { label: "Should stay the same" },
            ],
          },
        },
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
    }
  });

  it("enforces the bound structure when assigning values", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {},
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: "Don't click me",
          },
          pathSegments: ["data"],
        },
        expected: { props: { button: { label: "Don't click me" } } },
      },
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "button"],
        },
        boundValue: {
          value: {
            data: {
              label: "Don't click me",
            },
          },
          pathSegments: ["data", "label"],
        },
        expected: { props: { button: "Don't click me" } },
      },
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "button", "label"],
        },
        boundValue: {
          value: {
            data: "Don't click me",
          },
          pathSegments: ["data", "label", "extra"],
        },
        expected: { props: { button: { label: undefined } } },
      },
    ];

    for (const { boundee, boundValue, expected } of assignments) {
      assignPathBinding<typeof boundee.value, typeof boundValue.value>(
        boundee,
        boundValue,
        onArrayAssignment
      );
      expect(boundee.value).toEqual(expected);
    }
  });

  it("throws errors when paths are invalid", () => {
    const assignments = [
      {
        boundee: {
          value: {
            props: {
              button: {
                label: "Click me",
              },
            },
          },
          pathSegments: ["props", "[*]", "label"],
        },
        boundValue: {
          value: {
            data: {
              label: "Don't click me",
            },
          },
          pathSegments: ["data", "[*]", "label"],
        },
      },
      {
        boundee: {
          value: {
            props: {
              buttons: [
                {
                  label: "Click me",
                },
              ],
            },
          },
          pathSegments: ["props", "buttons", "[*", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                {
                  label: "Don't click me",
                },
              ],
            },
          },
          pathSegments: ["data", "buttons", "[*", "label"],
        },
      },
      {
        boundee: {
          value: {
            props: {
              buttons: [
                {
                  label: "Click me",
                },
              ],
            },
          },
          pathSegments: ["props", "buttons", "]*[", "label"],
        },
        boundValue: {
          value: {
            data: {
              buttons: [
                {
                  label: "Don't click me",
                },
              ],
            },
          },
          pathSegments: ["data", "buttons", "]*[", "label"],
        },
      },
    ];

    for (const { boundee, boundValue } of assignments) {
      expect(() =>
        assignPathBinding<typeof boundee.value, typeof boundValue.value>(
          boundee,
          boundValue,
          onArrayAssignment
        )
      ).toThrow();
    }
  });
});
