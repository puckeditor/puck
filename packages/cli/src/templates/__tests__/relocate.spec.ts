import { relocateModule } from "../relocate";
import { readRecipe } from "../../../__tests__/helpers/harness";

describe("relocateModule", () => {
  it("rewrites relative imports for a src/app layout", () => {
    const code = readRecipe("next", "app/puck/[...puckPath]/page.tsx");
    const result = relocateModule(code, {
      from: "app/puck/[...puckPath]/page.tsx",
      to: "src/app/puck/[...puckPath]/page.tsx",
      moduleMap: {
        "app/puck/[...puckPath]/client": "src/app/puck/[...puckPath]/client",
        "lib/get-page": "src/lib/get-page",
      },
    });
    expect(result.ok && result.code).toContain(`from "./client"`);
    expect(result.ok && result.code).toContain(`from "../../../lib/get-page"`);
  });

  it("resolves ~/ aliases to relative paths", () => {
    const code = readRecipe("react-router", "app/routes/puck-splat.tsx");
    const result = relocateModule(code, {
      from: "app/routes/puck-splat.tsx",
      to: "app/routes/puck-splat.tsx",
      aliases: { "~/": "app/" },
      moduleMap: {
        "app/lib/pages.server": "app/lib/pages.server",
        "app/lib/resolve-puck-path.server": "app/lib/resolve-puck-path.server",
        "puck.config": "puck.config",
      },
    });
    expect(result.ok && result.code).toContain(`from "../lib/pages.server"`);
    expect(result.ok && result.code).toContain(
      `from "../lib/resolve-puck-path.server"`
    );
    expect(result.ok && result.code).toContain(`from "./+types/puck-splat"`);
  });

  it("adapts the config import to the project's config exports", () => {
    const code = `import config from "../../puck.config";\n`;
    const opts = {
      from: "app/x/client.tsx",
      to: "app/x/client.tsx",
      moduleMap: { "puck.config": "src/puck.config" },
    };

    const named = relocateModule(code, {
      ...opts,
      config: {
        module: "puck.config",
        shape: { default: false, named: ["config"] },
      },
    });
    expect(named.ok && named.code).toBe(
      `import { config } from "../../src/puck.config";\n`
    );

    const other = relocateModule(code, {
      ...opts,
      config: {
        module: "puck.config",
        shape: { default: false, named: ["puckConfig"] },
      },
    });
    expect(other.ok && other.code).toBe(
      `import { puckConfig as config } from "../../src/puck.config";\n`
    );

    const none = relocateModule(code, {
      ...opts,
      config: { module: "puck.config", shape: { default: false, named: [] } },
    });
    expect(none.ok).toBe(false);
  });
});
