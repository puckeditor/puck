import { transformPackageJson } from "../transform";
import { readRecipe } from "../../../__tests__/helpers/harness";

const transform = (cliVersion: string) =>
  JSON.parse(
    transformPackageJson(readRecipe("react-router-ai", "package.json"), {
      appName: "site",
      cliVersion,
    })
  );

describe("transformPackageJson", () => {
  it("leaves stable releases without overrides", () => {
    const pkg = transform("0.23.0");
    expect(pkg.dependencies["@puckeditor/core"]).toBe("^0.23.0");
    expect(pkg.overrides).toBeUndefined();
  });

  it("overrides plugins' peers onto a canary core, which `^0` excludes", () => {
    const pkg = transform("0.24.0-canary.3e19956e");
    expect(pkg.dependencies["@puckeditor/core"]).toBe(
      "^0.24.0-canary.3e19956e"
    );
    expect(pkg.overrides).toEqual({
      "@puckeditor/core": "$@puckeditor/core",
    });
  });
});
