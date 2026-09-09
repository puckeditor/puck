import { getDropZoneProps } from "../get-drop-zone-props";

describe("getDropZoneProps", () => {
  const style = { color: "red" };
  const onClick = () => {};
  const children = "rogue";
  const dangerouslySetInnerHTML = { __html: "<em>injected</em>" };

  const allProps = {
    zone: "my-zone",
    allow: ["Heading"],
    className: "my-class",
    style,
    as: "button",
    id: "my-id",
    onClick,
    "data-custom": "foo",
    children,
    dangerouslySetInnerHTML,
  };

  it("splits props into consumed, forwardable and non-forwardable groups", () => {
    const { props, forwardableProps, nonForwardableProps } =
      getDropZoneProps(allProps);

    expect(props).toEqual({
      zone: "my-zone",
      allow: ["Heading"],
      className: "my-class",
      style,
      as: "button",
    });
    expect(forwardableProps).toEqual({
      id: "my-id",
      onClick,
      "data-custom": "foo",
    });
    expect(nonForwardableProps).toEqual({ children, dangerouslySetInnerHTML });
  });

  it("moves values by reference without cloning", () => {
    const { props, forwardableProps, nonForwardableProps } =
      getDropZoneProps(allProps);

    expect(props.style).toBe(style);
    expect(props.allow).toBe(allProps.allow);
    expect(forwardableProps.onClick).toBe(onClick);
    expect(nonForwardableProps.dangerouslySetInnerHTML).toBe(
      dangerouslySetInnerHTML
    );
  });

  it("assigns every key to exactly one group", () => {
    const { props, forwardableProps, nonForwardableProps } =
      getDropZoneProps(allProps);

    const regrouped = [
      ...Object.keys(props),
      ...Object.keys(forwardableProps),
      ...Object.keys(nonForwardableProps),
    ].sort();

    expect(regrouped).toEqual(Object.keys(allProps).sort());
  });

  it("uses null-prototype groups so an own `__proto__` key can't pollute prototypes", () => {
    // JSON.parse produces an *own* enumerable `__proto__` key (object literals don't)
    const malicious = JSON.parse(
      '{ "zone": "z", "__proto__": { "polluted": true } }'
    );

    const { props, forwardableProps, nonForwardableProps } =
      getDropZoneProps(malicious);

    // Groups have no prototype, so `group["__proto__"] = ...` stores data
    // instead of swapping the group's prototype.
    expect(Object.getPrototypeOf(props)).toBeNull();
    expect(Object.getPrototypeOf(forwardableProps)).toBeNull();
    expect(Object.getPrototypeOf(nonForwardableProps)).toBeNull();

    // No ordinary object was polluted in the process.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    // Recognised keys are still grouped correctly. `props` is typed as `{}` here
    // because JSON.parse widens the input to `any`, so read it as a record.
    expect((props as Record<string, unknown>).zone).toBe("z");
  });
});
