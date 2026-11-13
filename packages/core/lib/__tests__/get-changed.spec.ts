import { getChanged } from "../get-changed";

describe("getChanged", () => {
  it("returns empty object when newItem is undefined", () => {
    expect(getChanged(undefined, undefined)).toEqual({});
  });

  it("returns correct diff when comparing identical items", () => {
    const item1 = {
      props: {
        id: "comp-1",
        title: "Hello",
        nested: {
          foo: "bar",
        },
      },
    };
    const item2 = {
      props: {
        id: "comp-1",
        title: "Hello",
        nested: {
          foo: "bar",
        },
      },
    };

    expect(getChanged(item1, item2)).toEqual({});
  });

  it("returns nested dot-notation keys when nested object properties change", () => {
    const oldItem = {
      props: {
        id: "comp-1",
        FirstLevel: {
          SecondLevel: {
            ThirdLevel: {
              SomeString: "original",
              OtherString: "unchanged",
            },
          },
        },
      },
    };

    const newItem = {
      props: {
        id: "comp-1",
        FirstLevel: {
          SecondLevel: {
            ThirdLevel: {
              SomeString: "modified",
              OtherString: "unchanged",
            },
          },
        },
      },
    };

    expect(getChanged(newItem, oldItem)).toEqual({
      id: false,
      FirstLevel: true,
      "FirstLevel.SecondLevel": true,
      "FirstLevel.SecondLevel.ThirdLevel": true,
      "FirstLevel.SecondLevel.ThirdLevel.SomeString": true,
      "FirstLevel.SecondLevel.ThirdLevel.OtherString": false,
    });
  });

  it("returns nested keys for arrays of objects", () => {
    const oldItem = {
      props: {
        id: "comp-1",
        items: [
          { id: "1", text: "one" },
          { id: "2", text: "two" },
        ],
      },
    };

    const newItem = {
      props: {
        id: "comp-1",
        items: [
          { id: "1", text: "one modified" },
          { id: "2", text: "two" },
        ],
      },
    };

    expect(getChanged(newItem, oldItem)).toEqual({
      id: false,
      items: true,
      "items.[0]": true,
      "items.[0].id": false,
      "items.[0].text": true,
      "items.[1]": false,
    });
  });

  it("handles subfield at bar level matching the issue description", () => {
    const oldItem = {
      props: {
        id: "comp-1",
        foo: {
          bar: {
            id: "bar-1",
            value: "original",
          },
        },
      },
    };

    const newItem = {
      props: {
        id: "comp-1",
        foo: {
          bar: {
            id: "bar-1",
            value: "new-value",
          },
        },
      },
    };

    expect(getChanged(newItem, oldItem)).toEqual({
      id: false,
      foo: true,
      "foo.bar": true,
      "foo.bar.id": false,
      "foo.bar.value": true,
    });
  });
});
