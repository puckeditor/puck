import type { Prompter } from "../src/io/prompter";
import {
  read,
  run,
  tmpProject,
  treeSnapshot,
  FakeCloud,
} from "./helpers/harness";

/** Answers prompts in order and records what was asked */
const scripted = (answers: unknown[]) => {
  const asked: string[] = [];
  const next = (message: string) => {
    asked.push(message);
    if (answers.length === 0) throw new Error(`Unexpected prompt: ${message}`);
    return Promise.resolve(answers.shift());
  };
  const prompter: Prompter = {
    confirm: (m) => next(m) as Promise<boolean>,
    select: (m) => next(m) as Promise<never>,
    input: (m) => next(m) as Promise<string>,
    password: (m) => next(m) as Promise<string>,
  };
  return { prompter, asked };
};

describe("interactive", () => {
  it("creates an app and logs in through the browser", async () => {
    const root = tmpProject("empty");
    const cloud = new FakeCloud();
    const original = cloud.fetch;
    // Approve as soon as the CLI starts polling
    cloud.fetch = async (input, init) => {
      if (String(input).endsWith("/token")) cloud.approveAll();
      return original(input, init);
    };
    const { prompter, asked } = scripted(["react-router", true, true, "login"]);

    const { code, stdout, stderr, devServers, opened } = await run(["init"], {
      cwd: root,
      cloud,
      interactive: true,
      prompter,
    });

    expect(asked).toEqual([
      "Which framework?",
      "Add Puck AI? (includes Puck Cloud, requires a Puck Cloud account)",
      "Apply these changes?",
      "How do you want to connect to Puck Cloud?",
    ]);
    expect(code).toBe(0);
    expect(stderr).toContain("confirm the code BCDF-GH");
    expect(stdout).toContain("Set up Puck Editor, Puck Cloud and Puck AI");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${cloud.mintedKey}\n`);
    expect(stdout + stderr).not.toContain(cloud.mintedKey);

    // Starts the app and opens the editor on the port the dev server reports
    expect(devServers).toEqual([
      { command: "npm", args: ["run", "dev"], cwd: root },
    ]);
    expect(opened).toContain("http://localhost:3001/edit");
    expect(stdout).not.toContain("npm run dev\n");
  });

  it("retries when Puck Cloud fails to mint the key", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const original = cloud.fetch;
    let polls = 0;
    cloud.fetch = async (input, init) => {
      if (String(input).endsWith("/token")) {
        cloud.approveAll();
        if (++polls === 1) {
          return new Response(JSON.stringify({ error: "server_error" }), {
            status: 500,
          });
        }
      }
      return original(input, init);
    };
    const { prompter } = scripted([true, "login"]);

    const { code, stderr } = await run(["add", "cloud"], {
      cwd: root,
      cloud,
      interactive: true,
      prompter,
    });

    expect(stderr).toContain(
      "Puck Cloud couldn't create an API key (500 server_error). Retrying…"
    );
    expect(code).toBe(0);
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${cloud.mintedKey}\n`);
  });

  it("accepts a pasted API key", async () => {
    const root = tmpProject({ recipe: "next" });
    const { prompter, asked } = scripted([
      true,
      "paste",
      false,
      "sk-valid-key",
    ]);

    const { code } = await run(["add", "cloud"], {
      cwd: root,
      interactive: true,
      prompter,
    });

    expect(code).toBe(0);
    expect(asked[asked.length - 1]).toBe("Paste your Puck API key");
    expect(read(root, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
  });

  it("changes nothing when the plan is declined", async () => {
    const root = tmpProject({ recipe: "next" });
    const before = treeSnapshot(root);
    const { prompter } = scripted([false]);
    const { code, stderr } = await run(["add", "cloud"], {
      cwd: root,
      interactive: true,
      prompter,
    });
    expect(code).toBe(130);
    expect(stderr).toContain("Cancelled");
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("asks which workspace app to use", async () => {
    const { pnpmMonorepo } = await import("./helpers/fixtures");
    const root = tmpProject({ tree: pnpmMonorepo() });
    const { prompter, asked } = scripted(["apps/web", true]);
    const { code } = await run(["add", "editor"], {
      cwd: root,
      interactive: true,
      prompter,
    });
    expect(asked[0]).toBe("Which app should Puck be set up in?");
    expect(code).toBe(0);
    expect(read(root, "apps/web/puck.config.tsx")).toContain("HeadingBlock");
  });
});

describe("interactive AI choice", () => {
  it("sets up only the editor when Puck AI is declined", async () => {
    const { nextMinimal } = await import("./helpers/fixtures");
    const root = tmpProject({ tree: nextMinimal() });
    const { prompter, asked } = scripted([false, true]);

    const { code, stdout, devServers, opened } = await run(["init"], {
      cwd: root,
      interactive: true,
      prompter,
    });

    expect(asked[0]).toBe(
      "Add Puck AI? (includes Puck Cloud, requires a Puck Cloud account)"
    );
    expect(code).toBe(0);
    expect(stdout).toContain("Set up Puck Editor.");
    expect(read(root, "package.json")).not.toContain(
      "@puckeditor/cloud-client"
    );

    // Only freshly created apps are started; existing projects get next steps
    expect(devServers).toEqual([]);
    expect(opened).toEqual([]);
    expect(stdout).toContain("npm run dev");
  });
});
