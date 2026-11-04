import fs from "node:fs";
import path from "node:path";
import {
  FakeCloud,
  read,
  run,
  tmpProject,
  treeSnapshot,
} from "./helpers/harness";
import type { Prompter } from "../src/io/prompter";

const KEY = ["--api-key", "sk-valid-key"];

const CONFIG = `import type { Config } from "@puckeditor/core";

type Props = {
  HeadingBlock: { title: string; image: string; background: string };
};

export const config: Config<Props> = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: "text" },
        image: { type: "text" },
        background: { type: "text" },
      },
      defaultProps: {
        title: "Heading",
        image: "/hero.png",
        background: "",
      },
      render: ({ title, image }) => (
        <div style={{ padding: 64 }}>
          <img src={image} alt="" />
          <h1>{title}</h1>
        </div>
      ),
    },
  },
};

export default config;
`;

const page = (image: unknown) => ({
  content: [
    {
      type: "HeadingBlock",
      props: { id: "HeadingBlock-1", title: "Hi", image },
    },
  ],
  root: { props: { title: "" } },
});

/** A Next.js app with Puck Assets and an image field, and pages saved locally */
const project = async (capabilities = ["assets"]) => {
  const root = tmpProject({ recipe: "next" });
  const added = await run(["add", ...capabilities, "--yes", "--json", ...KEY], {
    cwd: root,
  });
  expect(added.json.status).toBe("success");
  fs.writeFileSync(path.join(root, "puck.config.tsx"), CONFIG);
  fs.writeFileSync(
    path.join(root, "database.json"),
    JSON.stringify({ "/": page("/a.png"), "/about": page(undefined) })
  );
  return root;
};

const migrate = (root: string, args: string[], cloud?: FakeCloud) =>
  run(["assets", "migrate", "--json", ...args], { cwd: root, cloud });

describe("assets migrate", () => {
  it("asks which fields to switch, without changing anything", async () => {
    const root = await project();
    const before = treeSnapshot(root);

    const { json, code } = await migrate(root, []);

    expect(code).toBe(10);
    expect(json.status).toBe("action_required");
    expect(json.actions).toEqual([
      expect.objectContaining({
        id: "assets:fields",
        type: "choose_fields",
        flag: "--field",
        choices: [
          {
            value: "HeadingBlock.image",
            label: "HeadingBlock.image",
            description: "text field · puck.config.tsx:12",
            recommended: true,
          },
          {
            value: "HeadingBlock.background",
            label: "HeadingBlock.background",
            description: "text field · puck.config.tsx:13",
            recommended: false,
          },
        ],
        rerun:
          "npx @puckeditor/cli assets migrate --json --field <Component.field>",
      }),
    ]);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("switches the chosen fields and the pages saved locally", async () => {
    const root = await project();
    const { json } = await migrate(root, [
      "--field",
      "HeadingBlock.image",
      "--yes",
    ]);

    expect(json.status).toBe("success");
    expect(json.message).toBe(
      "Switched 1 field to the asset library and turned their URLs into assets in database.json."
    );
    expect(json.assetsMigrate).toEqual({
      config: "puck.config.tsx",
      fields: ["HeadingBlock.image"],
      files: ["database.json"],
      pages: { migrated: [], unchanged: 0, failed: [] },
    });
    expect(json.filesModified.sort()).toEqual(
      ["database.json", "puck.config.tsx"].sort()
    );

    const config = read(root, "puck.config.tsx");
    expect(config).toContain('image: assetField({ accept: ["image/*"] }),');
    expect(config).toContain('background: { type: "text" },');
    expect(config).toContain('image: { src: "/hero.png" },');
    expect(config).toContain("<img src={assetSrc(image)}");
    expect(JSON.parse(read(root, "database.json"))).toEqual({
      "/": page({ src: "/a.png" }),
      "/about": page(undefined),
    });
    // database.json stays on one line
    expect(read(root, "database.json")).not.toContain("\n");

    const again = await migrate(root, [
      "--field",
      "HeadingBlock.image",
      "--yes",
    ]);
    expect(again.json.status).toBe("success");
    expect(again.json.changed).toBe(false);
    expect(again.json.message).toBe(
      "HeadingBlock.image already uses the asset library. Nothing changed."
    );
  });

  it("leaves saved pages with --no-data", async () => {
    const root = await project();
    const before = read(root, "database.json");
    const { json } = await migrate(root, [
      "--field",
      "HeadingBlock.image",
      "--no-data",
      "--yes",
    ]);

    expect(json.status).toBe("success");
    expect(json.assetsMigrate?.files).toEqual([]);
    expect(read(root, "database.json")).toBe(before);
  });

  it("asks for consent, and plans without changing anything on a dry run", async () => {
    const root = await project();
    const before = treeSnapshot(root);

    const consent = await migrate(root, ["--field", "HeadingBlock.image"]);
    expect(consent.json.status).toBe("action_required");
    expect(consent.json.actions[0]).toMatchObject({
      type: "confirm_plan",
      rerun:
        "npx @puckeditor/cli assets migrate --json --field HeadingBlock.image --yes",
    });
    expect(consent.json.plan?.steps.map((s) => s.summary)).toEqual([
      "Switch HeadingBlock.image to the asset library in puck.config.tsx",
      "Turn 1 URL into assets in database.json",
    ]);

    const dry = await migrate(root, [
      "--field",
      "HeadingBlock.image",
      "--dry-run",
    ]);
    expect(dry.json.status).toBe("success");
    expect(dry.json.dryRun).toBe(true);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("offers the fields as checkboxes", async () => {
    const root = await project();
    let offered: { value: string; checked?: boolean }[] = [];
    const prompter = {
      checkbox: async (_: string, choices: typeof offered) => {
        offered = choices;
        return ["HeadingBlock.image"];
      },
      confirm: async () => true,
    } as unknown as Prompter;

    const { code } = await run(["assets", "migrate"], {
      cwd: root,
      interactive: true,
      prompter,
    });

    expect(code).toBe(0);
    expect(offered).toEqual([
      expect.objectContaining({ value: "HeadingBlock.image", checked: true }),
      expect.objectContaining({
        value: "HeadingBlock.background",
        checked: false,
      }),
    ]);
    expect(read(root, "puck.config.tsx")).toContain("assetField(");
  });

  it("rejects fields that can't hold an asset", async () => {
    const root = await project();
    const missing = await migrate(root, ["--field", "HeadingBlock.nope"]);
    expect(missing.code).toBe(2);
    expect(missing.json.error).toMatchObject({
      code: "PUCK-CLI-INVALID-ARGS",
      message: "HeadingBlock.nope isn't a field in puck.config.tsx.",
    });
  });

  it("says to add Puck Assets first", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await migrate(root, []);

    expect(json.status).toBe("action_required");
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "run_command",
        command: "npx @puckeditor/cli add assets",
        rerun: "npx @puckeditor/cli assets migrate --json",
      }),
    ]);
  });

  it("is suggested once Puck Assets is added, while image fields remain", async () => {
    const root = tmpProject({ recipe: "next" });
    fs.writeFileSync(path.join(root, "puck.config.tsx"), CONFIG);
    const added = await run(["add", "assets", "--yes", "--json", ...KEY], {
      cwd: root,
    });
    expect(added.json.nextSteps).toContain(
      "npx @puckeditor/cli assets migrate"
    );
    const status = await run(["status", "--json"], { cwd: root });
    expect(status.json.nextSteps).toContain(
      "npx @puckeditor/cli assets migrate"
    );

    await migrate(root, [
      "--field",
      "HeadingBlock.image",
      "--field",
      "HeadingBlock.background",
      "--yes",
    ]);
    const after = await run(["status", "--json"], { cwd: root });
    expect(after.json.nextSteps).not.toContain(
      "npx @puckeditor/cli assets migrate"
    );
  });

  it("says when there are no image fields", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "assets", "--yes", "--json", ...KEY], { cwd: root });

    const { json } = await migrate(root, []);
    expect(json.status).toBe("success");
    expect(json.message).toBe(
      "No image fields were found in puck.config.tsx. Choose fields with --field <Component.field>."
    );
  });

  describe("pages in Puck Cloud", () => {
    const cloudWith = () => {
      const cloud = new FakeCloud();
      cloud.addPage("page_live", "/", [
        { data: page("/old.png"), status: "unpublished" },
        { data: page("/live.png"), status: "published" },
      ]);
      cloud.addPage("page_draft", "/draft", [
        { data: page("/live.png"), status: "published" },
        { data: page("/draft.png"), status: "unpublished" },
      ]);
      cloud.addPage("page_new", "/new", [
        { data: page("/new.png"), status: "unpublished" },
      ]);
      cloud.addPage("page_done", "/done", [
        { data: page({ src: "/done.png" }), status: "published" },
      ]);
      return cloud;
    };

    const versions = (cloud: FakeCloud, id: string) =>
      cloud.branchPages.get(id)!.versions.map((v) => ({
        status: v.status,
        image: (v.data as ReturnType<typeof page>).content[0].props.image,
      }));

    it("migrates each page, keeping what's live and what's a draft", async () => {
      const root = await project(["assets", "pages"]);
      const cloud = cloudWith();

      const { json } = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes", ...KEY],
        cloud
      );

      expect(json.status).toBe("success");
      expect(json.assetsMigrate?.pages).toEqual({
        migrated: ["/", "/draft", "/new"],
        unchanged: 1,
        failed: [],
      });
      expect(json.message).toContain("migrated 3 pages in Puck Cloud");

      expect(versions(cloud, "page_live")).toEqual([
        { status: "unpublished", image: "/old.png" },
        { status: "unpublished", image: "/live.png" },
        { status: "published", image: { src: "/live.png" } },
      ]);
      // The live page is republished, then the draft goes back on top
      expect(versions(cloud, "page_draft")).toEqual([
        { status: "unpublished", image: "/live.png" },
        { status: "unpublished", image: "/draft.png" },
        { status: "published", image: { src: "/live.png" } },
        { status: "unpublished", image: { src: "/draft.png" } },
      ]);
      expect(versions(cloud, "page_new")).toEqual([
        { status: "unpublished", image: "/new.png" },
        { status: "unpublished", image: { src: "/new.png" } },
      ]);
      expect(versions(cloud, "page_done")).toHaveLength(1);

      const again = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes", ...KEY],
        cloud
      );
      expect(again.json.assetsMigrate?.pages).toEqual({
        migrated: [],
        unchanged: 4,
        failed: [],
      });
    });

    it("reports pages that failed, so a re-run migrates them", async () => {
      const root = await project(["assets", "pages"]);
      const cloud = cloudWith();
      // Publishing / fails, after its migrated version is saved
      cloud.failSaveAt = 2;

      const { json, code } = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes", ...KEY],
        cloud
      );

      expect(code).toBe(11);
      expect(json.status).toBe("partial");
      expect(json.assetsMigrate?.pages).toMatchObject({
        migrated: ["/draft", "/new"],
        failed: ["/"],
      });
      expect(json.message).toContain(
        "Re-run the command to migrate the rest, passing --api-key again."
      );
      expect(json.nextSteps).toEqual([
        "npx @puckeditor/cli assets migrate --json --field HeadingBlock.image --yes",
      ]);

      const again = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes", ...KEY],
        cloud
      );
      expect(again.json.status).toBe("success");
      expect(again.json.assetsMigrate?.pages.migrated).toEqual(["/"]);
      expect(
        versions(cloud, "page_live").find((v) => v.status === "published")
      ).toEqual({ status: "published", image: { src: "/live.png" } });
    });

    it("names a draft it saved over without saving it again", async () => {
      const root = await project(["assets", "pages"]);
      const cloud = cloudWith();
      // /draft's migrated draft, after its migrated live version
      cloud.failSaveAt = 4;

      const { json } = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes", ...KEY],
        cloud
      );

      expect(json.assetsMigrate?.pages.failed).toEqual(["/draft"]);
      expect(json.message).toContain(
        "/draft's draft is no longer its latest version: restore version 2 from its history, then re-run."
      );
      // What's live is unchanged
      expect(versions(cloud, "page_draft")).toEqual([
        { status: "published", image: "/live.png" },
        { status: "unpublished", image: "/draft.png" },
        { status: "unpublished", image: { src: "/live.png" } },
      ]);
    });

    it("re-runs with the fields chosen in the checkboxes", async () => {
      const root = await project(["assets", "pages"]);
      const cloud = cloudWith();
      cloud.failSaveAt = 2;
      const prompter = {
        checkbox: async () => ["HeadingBlock.image"],
        confirm: async () => true,
      } as unknown as Prompter;

      const { stdout } = await run(["assets", "migrate"], {
        cwd: root,
        cloud,
        interactive: true,
        prompter,
      });

      expect(stdout).toContain(
        "npx @puckeditor/cli assets migrate --field HeadingBlock.image"
      );
    });

    it("needs an API key, and makes no requests on a dry run", async () => {
      const root = await project(["assets", "pages"]);
      fs.rmSync(path.join(root, ".env.local"));
      const cloud = cloudWith();

      const keyless = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--yes"],
        cloud
      );
      expect(keyless.json.status).toBe("action_required");
      expect(keyless.json.actions[0]).toMatchObject({
        type: "provide_api_key",
      });

      const dry = await migrate(
        root,
        ["--field", "HeadingBlock.image", "--dry-run", ...KEY],
        cloud
      );
      expect(dry.json.message).toBe(
        "Dry run: no changes were made. Pages stored in Puck Cloud would be migrated too."
      );
      expect(cloud.networkCalls).toBe(0);
    });
  });
});
