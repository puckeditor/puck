import { localInvocation } from "../src/context";

const BIN = "node_modules/@puckeditor/cli/dist/bin.mjs";
const npm = { npm_config_user_agent: "npm/10.9.2 node/v20.19.0 darwin arm64" };

describe("localInvocation", () => {
  it("runs the project's copy with the package manager that started it", () => {
    const bin = `/work/app/${BIN}`;
    expect(localInvocation(bin, "/work/app", npm)).toBe(
      "npm exec --no -- puck"
    );
    expect(
      localInvocation(bin, "/work/app", {
        npm_config_user_agent: "pnpm/10.12.1 npm/? node/v20.19.0",
      })
    ).toBe("pnpm exec puck");
    expect(
      localInvocation(bin, "/work/app", {
        npm_config_user_agent: "yarn/4.9.2 npm/? node/v20.19.0",
      })
    ).toBe("yarn puck");
    expect(localInvocation(bin, "/work/app", {})).toBe("npm exec --no -- puck");
  });

  it("finds a copy hoisted to the workspace root, including pnpm's store", () => {
    expect(
      localInvocation(
        "/work/node_modules/.pnpm/@puckeditor+cli@0.24.0/node_modules/@puckeditor/cli/dist/bin.mjs",
        "/work/apps/web",
        npm
      )
    ).toBe("npm exec --no -- puck");
  });

  it("is undefined when npx downloaded it, or it's installed globally", () => {
    expect(
      localInvocation(
        `/home/me/.npm/_npx/d4ba1b435dc8d0ac/${BIN}`,
        "/home/me/app",
        npm
      )
    ).toBeUndefined();
    expect(
      localInvocation(`/usr/local/lib/${BIN}`, "/home/me/app", npm)
    ).toBeUndefined();
    expect(
      localInvocation(`/work/other/${BIN}`, "/work/app", npm)
    ).toBeUndefined();
  });
});
