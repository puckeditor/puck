import { quoteForShell } from "../src/io/runner";

describe("quoteForShell", () => {
  const args = [
    "add",
    "@puckeditor/core@^0.23.0",
    "react@^19.0.0",
    "hono@>=4 <5",
    "--save-dev",
  ];

  it("quotes version ranges for cmd.exe on Windows", () => {
    expect(quoteForShell(args, "win32")).toEqual([
      "add",
      '"@puckeditor/core@^0.23.0"',
      '"react@^19.0.0"',
      '"hono@>=4 <5"',
      "--save-dev",
    ]);
  });

  it("keeps prerelease ranges intact", () => {
    expect(quoteForShell(["@puckeditor/core@^0.9.0-0"], "win32")).toEqual([
      '"@puckeditor/core@^0.9.0-0"',
    ]);
  });

  it("leaves arguments alone where there's no shell", () => {
    expect(quoteForShell(args, "linux")).toEqual(args);
    expect(quoteForShell(args, "darwin")).toEqual(args);
  });

  it("doesn't quote twice", () => {
    expect(quoteForShell(['"react@^19.0.0"'], "win32")).toEqual([
      '"react@^19.0.0"',
    ]);
  });
});
