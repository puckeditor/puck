import { WithDeepSlots } from "../Internal";

describe("WithDeepSlots", () => {
  it("should preserve types", () => {
    const testObject = {
      someDate: new Date(),
      someRegExp: /'/g,
      someError: new Error("An error occurred"),
      someFunction: () => void 0,
    } satisfies WithDeepSlots<{}>;

    testObject.someDate.getDate();
    testObject.someRegExp.test("test");
    testObject.someError.message;
    testObject.someFunction();

    expect("no compilation error").toBeTruthy();
  });
});
