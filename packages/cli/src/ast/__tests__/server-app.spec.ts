import { ensureMounted, isMounted } from "../server-app";
import { readRecipe } from "../../../__tests__/helpers/harness";

const PAGES = { name: "puckPages", source: "./puck/pages.js" };
const CLOUD = { name: "puckCloud", source: "./puck/cloud.js" };

const codeOf = (result: ReturnType<typeof ensureMounted>) =>
  result.status === "inserted" ? result.code : result.status;

// What `create-hono --template nodejs` produces
const HONO_TEMPLATE = `import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(\`Server is running on http://localhost:\${info.port}\`)
})
`;

describe("ensureMounted", () => {
  it("mounts routes in the create-hono template, matching its style", () => {
    expect(codeOf(ensureMounted(HONO_TEMPLATE, "src/index.ts", "hono", PAGES)))
      .toBe(`import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { puckPages } from './puck/pages.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/', puckPages)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(\`Server is running on http://localhost:\${info.port}\`)
})
`);
  });

  it.each(["hono", "express"] as const)(
    "turns the %s recipe into the AI recipe byte for byte",
    (kind) => {
      expect(
        codeOf(
          ensureMounted(
            readRecipe(kind, "src/index.ts"),
            "src/index.ts",
            kind,
            CLOUD
          )
        )
      ).toBe(readRecipe(`${kind}-ai`, "src/index.ts"));
    }
  );

  it.each(["hono", "express"] as const)(
    "is a no-op when the %s recipe already mounts the route",
    (kind) => {
      const code = readRecipe(`${kind}-ai`, "src/index.ts");
      expect(ensureMounted(code, "src/index.ts", kind, PAGES).status).toBe(
        "exists"
      );
      expect(isMounted(code, "src/index.ts", kind, CLOUD)).toBe(true);
    }
  );

  it("mounts Express routes before listen, after the user's middleware", () => {
    const code = `import express from "express";

const app = express();
app.use(express.json());

app.listen(3000);
`;
    expect(codeOf(ensureMounted(code, "src/index.ts", "express", PAGES)))
      .toBe(`import express from "express";
import { puckPages } from "./puck/pages.js";

const app = express();
app.use(express.json());
app.use(puckPages);

app.listen(3000);
`);
  });

  it("mounts before `export default app` and appends when nothing serves", () => {
    expect(
      codeOf(
        ensureMounted(
          `import { Hono } from "hono";\nconst app = new Hono();\nexport default app;\n`,
          "src/index.ts",
          "hono",
          { name: "puckPages", source: "./puck/pages" }
        )
      )
    ).toBe(
      `import { Hono } from "hono";\nimport { puckPages } from "./puck/pages";\nconst app = new Hono();\napp.route("/", puckPages);\n\nexport default app;\n`
    );
    expect(
      codeOf(
        ensureMounted(
          `import { Hono } from "hono";\nexport const app = new Hono();\n`,
          "src/app.ts",
          "hono",
          PAGES
        )
      )
    ).toBe(
      `import { Hono } from "hono";\nimport { puckPages } from "./puck/pages.js";\nexport const app = new Hono();\n\napp.route("/", puckPages);\n`
    );
  });

  it("asks for a manual edit when the app can't be found or edited safely", () => {
    for (const code of [
      `import { Hono } from "hono";\nexport default new Hono();\n`,
      `import { Hono } from "hono";\nconst app = new Hono().basePath("/api");\n`,
      `import { Hono } from "hono";\nfunction make() { return new Hono(); }\n`,
      `const app = new Hono(`,
    ]) {
      expect({
        code,
        status: ensureMounted(code, "src/index.ts", "hono", PAGES).status,
      }).toEqual({ code, status: "manual" });
    }
  });
});
