import type { ComponentConfig, Config } from "..";

/**
 * Compile-time checks for Config / ComponentConfig. These are verified by
 * `tsc --noEmit`; the jest assertion at the bottom only keeps the suite green.
 *
 * Each case mirrors a real usage pattern (demo, docs or a user report).
 */

type IsAny<T> = 0 extends 1 & T ? true : false;

// Fails to compile when `value` has silently widened to `any`
const expectNotAny = <T,>(
  _value: T,
  ..._isAny: IsAny<T> extends true ? ["value is any"] : []
) => {};

const expectType = <T,>(_value: T) => {};

// A: plain `Config` with an inline `resolveFields` (user report)
export const caseA: Config = {
  components: {
    A: {
      resolveFields: (data, { fields, lastFields, changed }) => {
        expectNotAny(data);
        expectNotAny(fields);
        expectNotAny(lastFields);
        expectNotAny(changed);

        return fields;
      },
      render: () => <></>,
    },
  },
};

// B: spreading `params.fields` and swapping in a custom field (docs: fields/custom)
export const caseB: Config = {
  components: {
    Example: {
      fields: { title: { type: "text" } },
      resolveFields: (data, params) => {
        expectNotAny(params);

        return {
          ...params.fields,
          title: {
            type: "custom",
            key: data.props.isText ? "custom-text" : "custom-number",
            render: () => <input />,
          },
        };
      },
      render: () => <div />,
    },
  },
};

// C: destructured params returning `lastFields` (docs: component-config params.changed)
export const caseC: Config = {
  components: {
    Example: {
      fields: { fieldType: { type: "text" }, title: { type: "text" } },
      resolveFields: async ({ props }, { changed, lastFields }) => {
        if (!changed.fieldType) {
          return lastFields;
        }

        return {
          fieldType: { type: "text" },
          title: { type: props.fieldType === "textarea" ? "textarea" : "text" },
        };
      },
      render: () => <div />,
    },
  },
};

// D: same as A with an explicit empty generic (user report workaround)
export const caseD: Config<{}> = {
  components: {
    A: {
      resolveFields: (data, { fields }) => {
        expectNotAny(data);
        expectNotAny(fields);

        return fields;
      },
      render: () => <></>,
    },
  },
};

// E: params-style `Config` with user fields, like the demo's `UserConfig`
type UserField = { type: "userField"; option: boolean };

type UserConfig = Config<{
  components: {
    Hero: {
      title: string;
      meta: { label: string; image: { src: string } };
      items: { image: string }[];
    };
  };
  root: { title: string };
  categories: ["layout"];
  fields: { userField: UserField };
}>;

export const caseE: UserConfig = {
  components: {
    Hero: {
      fields: {
        title: { type: "userField", option: true },
        meta: {
          type: "object",
          objectFields: {
            label: { type: "userField", option: true },
            image: {
              type: "object",
              objectFields: { src: { type: "userField", option: false } },
            },
          },
        },
        items: {
          type: "array",
          arrayFields: { image: { type: "userField", option: true } },
          getItemSummary: (item) => item.image,
        },
      },
      resolveFields: (data, { fields }) => {
        expectNotAny(data.props.title);
        expectType<string>(data.props.title);
        expectNotAny(fields);

        return fields;
      },
      render: ({ title }) => <h1>{title}</h1>,
    },
  },
};

// F: `ComponentConfig<any>` with an array field callback (user report)
export const caseF: ComponentConfig<any> = {
  render: () => <div />,
  fields: {
    list: {
      type: "array",
      arrayFields: { label: { type: "text" } },
      getItemSummary: (item, i) => `${item.label} ${i}`,
    },
  },
};

// G: generic HOC typed against `ComponentConfig<any>` (demo: withLayout)
export function withExtraField<
  ThisComponentConfig extends ComponentConfig<any> = ComponentConfig
>(componentConfig: ThisComponentConfig): ThisComponentConfig {
  return {
    ...componentConfig,
    fields: { ...componentConfig.fields, extra: { type: "text" } },
    resolveFields: async (data, params) => {
      const fields = componentConfig.resolveFields
        ? await componentConfig.resolveFields(data, params)
        : componentConfig.fields;

      if (params.parent?.type === "Grid") {
        return { ...fields, extra: { type: "textarea" } };
      }

      return { ...fields, extra: { type: "text" } };
    },
  };
}

// H: user fields in nested object fields (issue #1482 repro)
export const caseH: ComponentConfig<{
  props: {
    object: { nestedObject: { image: string }; test: string };
    list: { nested: { image: string } }[];
  };
  fields: { image: { type: "image" } };
}> = {
  fields: {
    object: {
      type: "object",
      objectFields: {
        test: { type: "image" },
        nestedObject: {
          type: "object",
          objectFields: { image: { type: "image" } },
        },
      },
    },
    list: {
      type: "array",
      arrayFields: {
        nested: {
          type: "object",
          objectFields: { image: { type: "image" } },
        },
      },
    },
  },
  render: () => <div />,
};

// I: legacy props generic with an inline `resolveFields` (demo blocks)
export const caseI: ComponentConfig<{ title: string }> = {
  fields: { title: { type: "text" } },
  resolveFields: (data, { fields }) => {
    expectNotAny(data.props.title);
    expectType<string>(data.props.title);

    return fields;
  },
  render: ({ title }) => <h1>{title}</h1>,
};

// I2: params generic without user fields
export const caseI2: ComponentConfig<{ props: { title: string } }> = {
  fields: { title: { type: "text" } },
  resolveFields: (data, { fields }) => {
    expectNotAny(data.props.title);
    expectType<string>(data.props.title);

    return fields;
  },
  render: ({ title }) => <h1>{title}</h1>,
};

// J: unknown field types are still rejected when nested
export const caseJ: ComponentConfig<{
  props: { object: { nested: { image: string } } };
  fields: { image: { type: "image" } };
}> = {
  fields: {
    object: {
      type: "object",
      objectFields: {
        nested: {
          type: "object",
          // @ts-expect-error "unknown" is neither a built-in nor a user field
          objectFields: { image: { type: "unknown" } },
        },
      },
    },
  },
  render: () => <div />,
};

// K: root `resolveFields` on a config with user fields (demo: root)
export const caseK: UserConfig = {
  components: { Hero: { render: () => <div /> } },
  root: {
    fields: { title: { type: "userField", option: true } },
    resolveFields: (data, { fields }) => {
      expectNotAny(data);
      expectNotAny(fields);

      return fields;
    },
  },
};

// L: a plain `Config` still rejects typos deep in object fields
export const caseL: Config = {
  components: {
    Card: {
      render: () => <div />,
      fields: {
        // @ts-expect-error "txet" is not a field type
        layout: {
          type: "object",
          objectFields: {
            spacing: {
              type: "object",
              objectFields: { top: { type: "txet" } },
            },
          },
        },
      },
    },
  },
};

// M: a plain `Config` still rejects invalid fields returned from `resolveFields`
export const caseM: Config = {
  components: {
    Typo: {
      render: () => <div />,
      // @ts-expect-error "txet" is not a field type
      resolveFields: () => ({ title: { type: "txet" } }),
    },
    MissingOptions: {
      render: () => <div />,
      // @ts-expect-error select fields require options
      resolveFields: () => ({ title: { type: "select" } }),
    },
    Spread: {
      render: () => <div />,
      // @ts-expect-error "txet" is not a field type
      resolveFields: (_, { fields }) => ({ ...fields, x: { type: "txet" } }),
    },
  },
  root: {
    // @ts-expect-error "txet" is not a field type
    resolveFields: () => ({ title: { type: "txet" } }),
  },
};

// N: declared user fields can be returned from `resolveFields`
export const caseN: UserConfig = {
  components: {
    Hero: {
      resolveFields: (_, { fields }) => ({
        ...fields,
        title: { type: "userField", option: true },
      }),
      render: () => <div />,
    },
  },
};

describe("Config types", () => {
  it("compiles", () => {
    expect("no compilation error").toBeTruthy();
  });
});
