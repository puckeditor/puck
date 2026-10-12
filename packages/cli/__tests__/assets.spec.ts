import fs from "node:fs";
import path from "node:path";
import { read, run, tmpProject } from "./helpers/harness";

const KEY = ["--api-key", "sk-valid-key"];

const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

const ASSETS_IMPORTS = `import { createAssetsPlugin } from "@puckeditor/plugin-assets";
import "@puckeditor/plugin-assets/styles.css";`;

/** Runs each `add` in turn, e.g. [["assets"], ["pages"]] */
const addInTurn = async (root: string, runs: string[][]) => {
  for (const capabilities of runs) {
    const { json } = await run(
      ["add", ...capabilities, "--yes", "--json", ...KEY],
      { cwd: root }
    );
    expect({ capabilities, status: json.status }).toEqual({
      capabilities,
      status: "success",
    });
  }
};

const expectSameFiles = (a: string, b: string, files: string[]) => {
  for (const file of files) {
    expect({ file, content: read(a, file) }).toEqual({
      file,
      content: read(b, file),
    });
  }
};

describe("add assets", () => {
  describe.each(["next", "vinext"] as const)("%s", (recipe) => {
    it("adds the asset library to the editor and Cloud route", async () => {
      const root = tmpProject({ recipe });
      const { json, runner } = await run(
        ["add", "assets", "--yes", "--json", ...KEY],
        { cwd: root }
      );

      expect(json.status).toBe("success");
      expect(json.message).toBe("Set up Puck Cloud and Puck Assets.");
      expect(runner.calls[0].args).toEqual([
        "install",
        "@puckeditor/cloud-client@^0.9.0-0",
        "@puckeditor/plugin-assets@^0.9.0-0",
      ]);

      const client = read(root, "app/puck/[...puckPath]/client.tsx");
      expect(client).toContain(ASSETS_IMPORTS);
      expect(client).toContain("const assetsPlugin = createAssetsPlugin();");
      expect(client).toContain("plugins={[assetsPlugin]}");

      // The Cloud route serves assets as it is
      expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
        "return puckHandler(request);"
      );

      expect(codes(json.warnings)).toContain(
        "PUCK-CLI-W-ASSETS-UNAUTHENTICATED"
      );
      expect(codes(json.warnings)).not.toContain("PUCK-CLI-W-NO-CLIENT-PLUGIN");
      expect(json.assets).toEqual({ installed: true, configured: true });

      const again = await run(["add", "assets", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });
  });

  it("doesn't warn with Puck Auth", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(
      ["add", "auth", "assets", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(codes(json.warnings)).not.toContain(
      "PUCK-CLI-W-ASSETS-UNAUTHENTICATED"
    );
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toContain(
      "plugins={[authPlugin, assetsPlugin]}"
    );
    expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
      'puckHandler(request, { auth: { provider: "puck" } })'
    );
  });

  describe("ends up the same whichever comes first", () => {
    const NEXT_FILES = [
      "app/puck/[...puckPath]/client.tsx",
      "app/puck/[...puckPath]/page.tsx",
      "app/api/puck/[...all]/route.ts",
    ];

    it.each(
      [["auth"], ["pages"], ["ai"], ["pages", "auth"]].map(
        (others) => [others.join(" and "), others] as const
      )
    )("with %s", async (_, others) => {
      const together = tmpProject({ recipe: "next" });
      await addInTurn(together, [[...others, "assets"]]);

      const assetsFirst = tmpProject({ recipe: "next" });
      await addInTurn(assetsFirst, [["assets"], others]);

      const assetsLast = tmpProject({ recipe: "next" });
      await addInTurn(assetsLast, [others, ["assets"]]);

      expectSameFiles(assetsFirst, together, NEXT_FILES);
      expectSameFiles(assetsLast, together, NEXT_FILES);
    });
  });

  it("asks for a manual edit in a customised editor", async () => {
    const root = tmpProject({ recipe: "next" });
    const client = path.join(root, "app/puck/[...puckPath]/client.tsx");
    fs.writeFileSync(
      client,
      `"use client";

import { Puck } from "@puckeditor/core";
import { plugins } from "../../../lib/plugins";

export function Client() {
  return <Puck config={{ components: {} }} data={{}} plugins={plugins} />;
}
`
    );

    const { json } = await run(["add", "assets", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        id: "assets:editor",
        type: "manual_edit",
        capability: "assets",
        file: "app/puck/[...puckPath]/client.tsx",
        snippet: expect.stringContaining("createAssetsPlugin"),
      })
    );
  });
});
