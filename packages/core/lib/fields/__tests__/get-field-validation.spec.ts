import { getFieldValidation } from "../get-field-validation";

describe("getFieldValidation", () => {
  it("returns null when the field is missing", () => {
    expect(getFieldValidation(undefined, "value")).toBeNull();
  });

  it("returns null when the field has no validate function", () => {
    expect(getFieldValidation({}, "value")).toBeNull();
  });

  it("passes the value to the validate function", () => {
    const validate = jest.fn();

    getFieldValidation({ validate }, "value");

    expect(validate).toHaveBeenCalledWith("value");
  });

  it("returns null when validate returns a falsy value", () => {
    expect(getFieldValidation({ validate: () => undefined }, "")).toBeNull();
    expect(getFieldValidation({ validate: () => null }, "")).toBeNull();
    expect(getFieldValidation({ validate: () => false }, "")).toBeNull();
    expect(getFieldValidation({ validate: () => "" }, "")).toBeNull();
  });

  it("treats a string as an error message", () => {
    expect(getFieldValidation({ validate: () => "Too long" }, "")).toEqual({
      type: "error",
      message: "Too long",
    });
  });

  it("defaults the type to error when only a message is provided", () => {
    expect(
      getFieldValidation({ validate: () => ({ message: "Too long" }) }, "")
    ).toEqual({ type: "error", message: "Too long" });
  });

  it("respects the provided type", () => {
    expect(
      getFieldValidation(
        { validate: () => ({ type: "warning", message: "Nearly full" }) },
        ""
      )
    ).toEqual({ type: "warning", message: "Nearly full" });
  });

  it("returns null when the message is empty", () => {
    expect(
      getFieldValidation(
        { validate: () => ({ type: "warning", message: "" }) },
        ""
      )
    ).toBeNull();
  });

  it("validates against the value it receives", () => {
    const field = {
      validate: (value: string) =>
        value.length > 5 ? "Must be 5 characters or fewer" : null,
    };

    expect(getFieldValidation(field, "short")).toBeNull();
    expect(getFieldValidation(field, "too long")).toEqual({
      type: "error",
      message: "Must be 5 characters or fewer",
    });
  });
});
