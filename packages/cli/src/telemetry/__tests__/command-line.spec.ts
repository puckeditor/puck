import { describeCommand } from "../command-line";

describe("describeCommand", () => {
  it.each([
    [[], "puck"],
    [
      ["init", "--framework", "next", "--no-ai", "--yes", "--json"],
      "puck init --framework next --no-ai --yes --json",
    ],
    [
      [
        "init",
        "--name",
        "my-app",
        "--cwd",
        "/Users/me/app",
        "--package-manager=pnpm",
      ],
      "puck init --name <value> --cwd <value> --package-manager pnpm",
    ],
    [["init", "--framework", "my-own"], "puck init --framework <value>"],
    [
      ["init", "--backend", "external", "--backend-url", "http://x"],
      "puck init --backend external --backend-url <value>",
    ],
    [["add", "cloud", "ai", "-y"], "puck add cloud ai --yes"],
    [
      ["add", "cloud", "--api-key", "sk_live_123"],
      "puck add cloud --api-key <value>",
    ],
    [["add", "./secret"], "puck add <arg>"],
    [["docs", "cat", "editor/getting-started"], "puck docs cat <arg>"],
    [["docs", "find", "dynamic", "fields"], "puck docs find <arg> <arg>"],
    [["docs", "ls", "cat"], "puck docs ls <arg>"],
    [["pages", "import", "database.json"], "puck pages import <arg>"],
    [["connect", "feature/new-hero"], "puck connect <arg>"],
    [["create", "my-app"], "puck create <arg>"],
    [["constructor", "toString"], "puck constructor <arg>"],
    [["MyApp"], "puck <arg>"],
    [["status", "--bogus=secret", "-x"], "puck status --<unknown> --<unknown>"],
    [["add", "--", "cloud"], "puck add -- cloud"],
  ])("describes %j as %s", (argv, expected) => {
    expect(describeCommand(argv)).toBe(expected);
  });

  it("caps long commands", () => {
    const described = describeCommand(["add", ...Array(100).fill("cloud")]);

    expect(described.split(" ")).toHaveLength(25);
    expect(described.endsWith(" <more>")).toBe(true);
  });
});
