import path from "node:path";
import { FakeCloud, read, run, tmpProject } from "./helpers/harness";
import { nextMinimal } from "./helpers/fixtures";

const KEY = ["--api-key", "sk-valid-key"];

/** Puck's packages on npm, with canaries of all but plugin-auth */
const registry = () => {
  const cloud = new FakeCloud();
  cloud.packuments = {
    "@puckeditor/core": {
      "dist-tags": { latest: "0.23.0", canary: "0.24.0-canary.aaa" },
    },
    "@puckeditor/cloud-client": {
      "dist-tags": { latest: "0.8.3", canary: "1.0.0-canary.bbb" },
    },
    "@puckeditor/plugin-ai": {
      "dist-tags": { latest: "0.8.3", canary: "1.0.0-canary.ccc" },
    },
    // No canary tag, so the newest prerelease
    "@puckeditor/plugin-pages": {
      "dist-tags": { latest: "0.8.3" },
      time: {
        created: "2026-09-01T00:00:00.000Z",
        "0.8.3": "2026-10-10T00:00:00.000Z",
        "0.9.0-canary.old": "2026-10-02T00:00:00.000Z",
        "0.9.0-canary.new": "2026-10-09T00:00:00.000Z",
      },
    },
  };
  return cloud;
};

describe("--canary", () => {
  it("scaffolds an app with the latest canaries", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--canary",
        "--framework",
        "next",
        "--name",
        "site",
        "--no-auth",
        "--yes",
        "--json",
        ...KEY,
      ],
      { cwd: root, cloud: registry() }
    );

    expect(json.status).toBe("success");
    const pkg = JSON.parse(read(path.join(root, "site"), "package.json"));
    expect(pkg.dependencies).toMatchObject({
      "@puckeditor/core": "0.24.0-canary.aaa",
      "@puckeditor/cloud-client": "1.0.0-canary.bbb",
      "@puckeditor/plugin-ai": "1.0.0-canary.ccc",
      "@puckeditor/plugin-pages": "0.9.0-canary.new",
    });
    // Plugins' peer ranges don't include a canary core
    expect(pkg.overrides).toEqual({ "@puckeditor/core": "$@puckeditor/core" });
    expect(json.warnings.map((w) => w.code)).toContain("PUCK-CLI-W-NO-CANARY");
  });

  it("installs canaries in an existing app with PUCK_CANARY", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { json, runner } = await run(
      ["add", "pages", "--yes", "--json", ...KEY],
      { cwd: root, cloud: registry(), env: { PUCK_CANARY: "1" } }
    );

    expect(json.status).toBe("success");
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@0.24.0-canary.aaa",
      "@puckeditor/cloud-client@1.0.0-canary.bbb",
      "@puckeditor/plugin-pages@0.9.0-canary.new",
    ]);
  });

  it("looks up each package once", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { cloud } = await run(
      ["add", "pages", "--canary", "--yes", "--json", ...KEY],
      { cwd: root, cloud: registry() }
    );

    expect(
      cloud.requests
        .filter((r) => r.path.startsWith("/@puckeditor"))
        .map((r) => r.path)
        .sort()
    ).toEqual([
      "/@puckeditor%2fcloud-client",
      "/@puckeditor%2fcore",
      "/@puckeditor%2fplugin-ai",
      "/@puckeditor%2fplugin-auth",
      "/@puckeditor%2fplugin-pages",
    ]);
  });

  it("doesn't look up canaries without it", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { cloud } = await run(["add", "pages", "--yes", "--json", ...KEY], {
      cwd: root,
      cloud: registry(),
    });

    expect(cloud.requests.some((r) => r.path.startsWith("/@puckeditor"))).toBe(
      false
    );
  });
});
