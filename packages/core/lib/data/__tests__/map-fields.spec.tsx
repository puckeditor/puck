import { ComponentData, Config } from "../../../types";
import { mapFields, Mappers } from "../map-fields";

type Props = {
  Comp: {
    title?: string;
    plain?: string;
    nested?: { title?: string };
  };
};

const config: Config<Props> = {
  components: {
    Comp: {
      fields: {
        title: { type: "text" },
        plain: { type: "text" },
        nested: {
          type: "object",
          objectFields: {
            title: { type: "text" },
          },
        },
      },
      render: () => <div />,
    },
  },
};

const mappers: Mappers = {
  text: ({ value, propPath }) => `mapped:${propPath}:${value}`,
};

describe("mapFields", () => {
  it("runs transforms for fields that have no value set", () => {
    const result: any = mapFields(
      { type: "Comp", props: { id: "abc" } },
      mappers,
      config
    );

    // `title` has a mapper but no value in props — it should still be visited
    expect(result.props.title).toBe("mapped:title:undefined");
    expect(result.props.plain).toBe("mapped:plain:undefined");
  });

  it("still runs transforms for fields that do have a value", () => {
    const result: any = mapFields(
      { type: "Comp", props: { id: "abc", title: "Hello" } },
      mappers,
      config
    );

    expect(result.props.title).toBe("mapped:title:Hello");
  });

  it("does not add keys for field types without a mapper", () => {
    const result: any = mapFields(
      { type: "Comp", props: { id: "abc" } },
      // No mapper registered at all
      {},
      config
    );

    expect("title" in result.props).toBe(false);
    expect("plain" in result.props).toBe(false);
  });

  it("runs transforms for missing subfields of an object field", () => {
    const result: any = mapFields(
      { type: "Comp", props: { id: "abc", nested: {} } },
      mappers,
      config
    );

    expect(result.props.nested.title).toBe("mapped:nested.title:undefined");
  });

  it("walks only the given fields when fieldsToMap is provided", () => {
    const result: ComponentData = mapFields(
      { type: "Comp", props: { id: "abc", title: "Hello", plain: "World" } },
      mappers,
      config,
      false,
      true,
      ["id", "title"]
    );

    expect(result.props.title).toBe("mapped:title:Hello");
    expect("plain" in result.props).toBe(false);
  });

  it("defaults missing fields listed in fieldsToMap", () => {
    const result: ComponentData = mapFields(
      { type: "Comp", props: { id: "abc" } },
      mappers,
      config,
      false,
      true,
      ["id", "title"]
    );

    // e.g. a prop that was just deleted still gets its transform run
    expect(result.props.title).toBe("mapped:title:undefined");
  });

  it("defaults missing subfields of object values listed in fieldsToMap", () => {
    const result: ComponentData = mapFields(
      { type: "Comp", props: { id: "abc", nested: {} } },
      mappers,
      config,
      false,
      true,
      ["nested"]
    );

    expect(result.props.nested.title).toBe("mapped:nested.title:undefined");
  });
});
