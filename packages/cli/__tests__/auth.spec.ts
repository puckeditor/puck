import fs from "node:fs";
import path from "node:path";
import { read, run, tmpProject } from "./helpers/harness";
import { nextPagesEditorPage } from "../src/templates/pages";
import { nextPuckAuth } from "../src/templates/auth";

const KEY = ["--api-key", "sk-valid-key"];

const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

const PUCK_AUTH_ROUTE = `import { puckAuth } from "@puckeditor/cloud-client/auth";`;

describe("add auth", () => {
  describe.each(["next", "vinext"] as const)("%s", (recipe) => {
    it("requires Sign in with Puck for the editor and Cloud route", async () => {
      const root = tmpProject({ recipe });
      const { json, runner } = await run(
        ["add", "auth", "--yes", "--json", ...KEY],
        { cwd: root }
      );

      expect(json.status).toBe("success");
      expect(json.message).toBe("Set up Puck Cloud and Puck Auth.");
      expect(runner.calls[0].args).toEqual([
        "install",
        "@puckeditor/cloud-client@^0.9.0-0",
        "@puckeditor/plugin-auth@^0.9.0-0",
      ]);
      expect(read(root, "lib/puck-auth.ts")).toBe(nextPuckAuth());

      const page = read(root, "app/puck/[...puckPath]/page.tsx");
      expect(page).toContain(
        'import { requirePuckSession } from "../../../lib/puck-auth";'
      );
      expect(page).toContain(
        '  const path = `/${puckPath.join("/")}`;\n  await requirePuckSession(`${path.replace(/\\/$/, "")}/edit`);\n  const data'
      );

      const client = read(root, "app/puck/[...puckPath]/client.tsx");
      expect(client).toContain(
        'import { createAuthPlugin } from "@puckeditor/plugin-auth";\nimport "@puckeditor/plugin-auth/styles.css";'
      );
      expect(client).toContain("plugins={[authPlugin]}");

      const route = read(root, "app/api/puck/[...all]/route.ts");
      expect(route).toContain(PUCK_AUTH_ROUTE);
      expect(route).toContain(
        "puckHandler(request, { authenticate: puckAuth })"
      );

      expect(codes(json.warnings)).not.toContain("PUCK-CLI-W-PUBLIC-ROUTE");
      expect(codes(json.warnings)).not.toContain("PUCK-CLI-W-EDITOR-PUBLIC");

      const again = await run(["add", "auth", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });
  });

  it("gates a Pages editor", async () => {
    const root = tmpProject({ recipe: "next-ai" });
    const { json } = await run(
      ["add", "pages", "auth", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(codes(json.warnings)).not.toContain(
      "PUCK-CLI-W-PAGES-UNAUTHENTICATED"
    );
    expect(read(root, "app/puck/[...puckPath]/page.tsx")).toBe(
      nextPagesEditorPage({ ai: true, auth: true })
    );
    expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
      "puckHandler(request, {\n    authenticate: puckAuth,\n    ai: {"
    );
  });

  it("ends up the same whether Pages comes before or after", async () => {
    const together = tmpProject({ recipe: "next" });
    await run(["add", "pages", "auth", "--yes", "--json", ...KEY], {
      cwd: together,
    });

    const authFirst = tmpProject({ recipe: "next" });
    await run(["add", "auth", "--yes", "--json", ...KEY], { cwd: authFirst });
    const { json } = await run(["add", "pages", "--yes", "--json"], {
      cwd: authFirst,
    });
    expect(json.status).toBe("success");

    for (const file of [
      "app/puck/[...puckPath]/client.tsx",
      "app/puck/[...puckPath]/page.tsx",
      "app/api/puck/[...all]/route.ts",
    ]) {
      expect({ file, content: read(authFirst, file) }).toEqual({
        file,
        content: read(together, file),
      });
    }
  });

  it("leaves custom route authentication alone", async () => {
    const root = tmpProject({ recipe: "next" });
    const route = path.join(root, "app/api/puck/[...all]/route.ts");
    fs.mkdirSync(path.dirname(route), { recursive: true });
    fs.writeFileSync(
      route,
      `import { puckHandler } from "@puckeditor/cloud-client";
import { getUser } from "../../../../lib/user";

export const GET = (request: Request) =>
  puckHandler(request, { authenticate: getUser });
export const POST = GET;
`
    );

    const { json } = await run(["add", "auth", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        type: "manual_edit",
        capability: "auth",
        file: "app/api/puck/[...all]/route.ts",
        required: true,
      })
    );
  });
});
