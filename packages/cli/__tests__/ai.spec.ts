import fs from "node:fs";
import path from "node:path";
import { exists, read, readRecipe, run, tmpProject } from "./helpers/harness";
import { nextMinimal, rrMinimal } from "./helpers/fixtures";

const KEY = ["--api-key", "sk-valid-key"];

describe("add ai", () => {
  it("turns the next recipe into the next-ai recipe", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json, runner } = await run(
      ["add", "ai", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe("Set up Puck Cloud and Puck AI.");
    expect(json.ai).toEqual({ installed: true, configured: true });
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/cloud-client@^0",
      "@puckeditor/plugin-ai@^0",
    ]);

    for (const file of [
      "app/puck/[...puckPath]/client.tsx",
      "app/puck/[...puckPath]/page.tsx",
      "app/[...puckPath]/client.tsx",
      "app/api/pages/route.ts",
      "app/api/puck/[...all]/route.ts",
    ]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("next-ai", file),
      });
    }
  });

  it("turns the react-router recipe into the react-router-ai recipe", async () => {
    const root = tmpProject({ recipe: "react-router" });
    const { json } = await run(["add", "ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    for (const file of [
      "puck.config.tsx",
      "app/routes.ts",
      "app/routes/puck-splat.tsx",
      "app/routes/api.puck.ts",
      "app/components/puck-render.tsx",
      "vite.config.ts",
    ]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("react-router-ai", file),
      });
    }
  });

  it("upgrades a Cloud route that was added without AI", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = await run(["add", "cloud", "--yes", "--json", ...KEY], {
      cwd: root,
    });
    expect(cloud.json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-NO-CLIENT-PLUGIN"
    );
    expect(cloud.json.nextSteps[0]).toBe("npx @puckeditor/cli add ai");

    const ai = await run(["add", "ai", "--yes", "--json"], { cwd: root });
    expect(ai.json.status).toBe("success");
    expect(read(root, "app/api/puck/[...all]/route.ts")).toBe(
      readRecipe("next-ai", "app/api/puck/[...all]/route.ts")
    );

    const again = await run(["add", "ai", "--yes", "--json"], { cwd: root });
    expect(again.json.changed).toBe(false);
  });

  it("asks for a manual edit when the editor was customised", async () => {
    const root = tmpProject({ recipe: "next" });
    const client = path.join(root, "app/puck/[...puckPath]/client.tsx");
    fs.writeFileSync(
      client,
      fs
        .readFileSync(client, "utf8")
        .replace("<Puck", '<Puck headerTitle="Mine"')
    );

    const { json, code } = await run(["add", "ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(code).toBe(11);
    expect(json.actions[0]).toMatchObject({
      type: "manual_edit",
      capability: "ai",
      required: true,
      file: "app/puck/[...puckPath]/client.tsx",
      snippet: expect.stringContaining("createAiPlugin"),
    });
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toContain(
      'headerTitle="Mine"'
    );
  });
});

describe("init with Puck AI", () => {
  it("adds the AI editor to an existing Next.js app", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { json } = await run(["init", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(json.message).toBe("Set up Puck Editor, Puck Cloud and Puck AI.");
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
      readRecipe("next-ai", "app/puck/[...puckPath]/client.tsx")
    );
    expect(exists(root, "app/api/pages/route.ts")).toBe(true);
    expect(exists(root, "app/puck/api/route.ts")).toBe(false);
  });

  it("aliases UserData when the project's config doesn't export it", async () => {
    const root = tmpProject({
      tree: {
        ...rrMinimal(),
        "puck.config.tsx": `import type { Config } from "@puckeditor/core";\n\nexport const config: Config = { components: {} };\n`,
      },
    });
    const { json } = await run(["init", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    const splat = read(root, "app/routes/puck-splat.tsx");
    expect(splat).toContain('type UserData = import("@puckeditor/core").Data;');
    expect(splat).not.toContain("import type { UserData }");
    expect(exists(root, "app/components/puck-render.tsx")).toBe(true);
  });

  it("sets up only the editor with --no-cloud", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { json, runner, cloud } = await run(
      ["init", "--yes", "--json", "--no-cloud"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe("Set up Puck Editor.");
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
    ]);
    expect(cloud.networkCalls).toBe(0);
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
      readRecipe("next", "app/puck/[...puckPath]/client.tsx")
    );
  });

  it("scaffolds the plain recipe with --no-cloud", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      ["init", "--yes", "--json", "--no-cloud", "--framework", "react-router"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "app/routes.ts")).toBe(
      readRecipe("react-router", "app/routes.ts")
    );
    expect(
      JSON.parse(read(root, "package.json")).dependencies[
        "@puckeditor/plugin-ai"
      ]
    ).toBeUndefined();
  });
});
