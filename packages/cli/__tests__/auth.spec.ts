import fs from "node:fs";
import path from "node:path";
import { exists, read, run, tmpProject } from "./helpers/harness";
import { viteMinimal } from "./helpers/fixtures";
import { nextPagesEditorPage, vitePagesRoot } from "../src/templates/pages";
import {
  nextPuckAuth,
  REQUIRE_SESSION,
  reactRouterPuckAuth,
  tanstackPuckAuth,
} from "../src/templates/auth";

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

  describe("react-router", () => {
    it("gates the editor's loader", async () => {
      const root = tmpProject({ recipe: "react-router" });
      const { json } = await run(["add", "auth", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, "app/lib/puck-auth.server.ts")).toBe(
        reactRouterPuckAuth()
      );
      const splat = read(root, "app/routes/puck-splat.tsx");
      expect(splat).toContain(
        "export async function loader({ params, request }: Route.LoaderArgs)"
      );
      expect(splat).toContain(
        "if (isEditorRoute) await requirePuckSession(request);"
      );
      expect(splat).toContain("plugins={[authPlugin]}");
      expect(read(root, "app/routes/api.puck.ts")).toContain(
        "const options: PuckHandlerOptions = { authenticate: puckAuth };"
      );
    });

    it("gates the Pages editor, whichever comes first", async () => {
      const together = tmpProject({ recipe: "react-router" });
      await run(["add", "pages", "auth", "--yes", "--json", ...KEY], {
        cwd: together,
      });
      const editor = read(together, "app/routes/puck.tsx");
      expect(editor).toContain("await requirePuckSession(request);");
      expect(editor).toContain("plugins={[pagesPlugin, authPlugin]}");

      const authFirst = tmpProject({ recipe: "react-router" });
      await run(["add", "auth", "--yes", "--json", ...KEY], { cwd: authFirst });
      const { json } = await run(["add", "pages", "--yes", "--json"], {
        cwd: authFirst,
      });
      expect(json.status).toBe("success");
      for (const file of [
        "app/routes/puck.tsx",
        "app/routes/puck-splat.tsx",
        "app/routes/api.puck.ts",
      ]) {
        expect({ file, content: read(authFirst, file) }).toEqual({
          file,
          content: read(together, file),
        });
      }
    });
  });

  describe("tanstack-start", () => {
    it("gates the editor's loader", async () => {
      const root = tmpProject({ recipe: "tanstack-start" });
      const { json } = await run(["add", "auth", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, "src/lib/puck-auth.ts")).toBe(tanstackPuckAuth());
      expect(read(root, "src/lib/pages.ts")).toContain(
        "if (isEditorRoute) await requirePuckSession({ data: pathname });"
      );
      expect(read(root, "src/routes/$.tsx")).toContain(
        "plugins={[authPlugin]}"
      );
      expect(read(root, "src/routes/api/puck/$.ts")).toContain(
        "const options: PuckHandlerOptions = { authenticate: puckAuth };"
      );
    });

    it("gates the Pages editor, whichever comes first", async () => {
      const together = tmpProject({ recipe: "tanstack-start" });
      await run(["add", "pages", "auth", "--yes", "--json", ...KEY], {
        cwd: together,
      });
      expect(read(together, "src/routes/puck.tsx")).toContain(
        "beforeLoad: ({ location }) => requirePuckSession({ data: location.href }),"
      );

      const authFirst = tmpProject({ recipe: "tanstack-start" });
      await run(["add", "auth", "--yes", "--json", ...KEY], { cwd: authFirst });
      const { json } = await run(["add", "pages", "--yes", "--json"], {
        cwd: authFirst,
      });
      expect(json.status).toBe("success");
      for (const file of [
        "src/routes/puck.tsx",
        "src/routes/$.tsx",
        "src/lib/pages.ts",
      ]) {
        expect({ file, content: read(authFirst, file) }).toEqual({
          file,
          content: read(together, file),
        });
      }
    });
  });

  describe("vite", () => {
    it("checks the session before loading the editor", async () => {
      const root = tmpProject({ recipe: "vite" });
      const { json } = await run(["add", "auth", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, "src/puck/require-session.tsx")).toBe(REQUIRE_SESSION);
      expect(read(root, "src/puck/root.tsx")).toContain(`<RequireSession>
          <Editor path={path} />
        </RequireSession>`);
      expect(read(root, "src/puck/editor.tsx")).toContain(
        "plugins={[authPlugin]}"
      );
      expect(read(root, "server/puck/cloud.ts")).toContain(
        "const options: PuckHandlerOptions = { authenticate: puckAuth };"
      );

      const pages = await run(["add", "pages", "--yes", "--json"], {
        cwd: root,
      });
      expect(pages.json.status).toBe("success");
      expect(read(root, "src/puck/root.tsx")).toBe(
        vitePagesRoot({ auth: true })
      );
    });

    it("leaves the Cloud route to a server elsewhere", async () => {
      const root = tmpProject({ tree: viteMinimal() });
      await run(
        [
          "add",
          "editor",
          "--backend",
          "external",
          "--backend-url",
          "http://localhost:3000",
          "--yes",
          "--json",
        ],
        { cwd: root }
      );
      const { json } = await run(["add", "auth", "--yes", "--json"], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(exists(root, "server")).toBe(false);
      expect(codes(json.warnings)).toContain("PUCK-CLI-W-EXTERNAL-AUTH");
    });
  });
});
