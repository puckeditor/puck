import type { RunContext } from "../context";
import type { CommandResult } from "../result";
import type { DocEntry, DocsSource } from "../docs/source";
import { emptyResult } from "../result";
import { CliError } from "../errors";
import { CANONICAL_INVOCATION } from "../constants";

const SUBCOMMANDS = ["ls", "cat", "find", "grep"] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const FIND_LIMIT = 20;
const GREP_LIMIT = 50;

/**
 * Accepts a page path (`api-reference/fields/text`), a docs link
 * (`/docs/api-reference/fields/text#params`) or a full URL, with or without
 * `.md`.
 */
export const normalizeDocPath = (input: string) => {
  const normalized = input
    .trim()
    .replace(/^[a-z]+:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/?(v\/[^/]+\/)?/, "")
    .replace(/^docs(\/|$)/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/+$/, "");

  return normalized || "index";
};

const resolvePage = (pages: DocEntry[], input: string): DocEntry => {
  const target = normalizeDocPath(input);
  const exact = pages.find((page) => page.path === target);
  if (exact) return exact;

  // A unique trailing match, like `text` for `api-reference/fields/text`
  const suffixed = pages.filter((page) => page.path.endsWith(`/${target}`));
  if (suffixed.length === 1) return suffixed[0];

  if (suffixed.length > 1) {
    const paths = suffixed.map((page) => page.path);
    throw new CliError(
      "PUCK-CLI-DOC-NOT-FOUND",
      `"${input}" matches several pages: ${paths.join(", ")}.`,
      { pages: paths }
    );
  }

  throw new CliError("PUCK-CLI-DOC-NOT-FOUND", `No docs page "${input}".`, {
    fix: `${CANONICAL_INVOCATION} docs find ${input}`,
  });
};

const headings = (content: string) => {
  let inFence = false;

  return content.split("\n").filter((line) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    return !inFence && /^#{1,6} /.test(line);
  });
};

const tokensIn = (tokens: string[], text: string) =>
  tokens.every((token) => text.toLowerCase().includes(token));

const find = (source: DocsSource, pages: DocEntry[], query: string) => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Title matches first, then path, then headings, each in sidebar order
  return pages
    .map((page) => {
      if (tokensIn(tokens, page.title)) return { page, rank: 0 };
      if (tokensIn(tokens, page.path.replace(/[/-]/g, " "))) {
        return { page, rank: 1 };
      }
      const text = headings(source.read(page.path)).join("\n");
      if (tokensIn(tokens, text)) return { page, rank: 2 };
      return null;
    })
    .filter((hit) => hit !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((hit) => hit.page);
};

const grep = (source: DocsSource, pages: DocEntry[], pattern: string) => {
  const needle = pattern.toLowerCase();

  return pages.flatMap((page) =>
    source
      .read(page.path)
      .split("\n")
      .flatMap((text, i) =>
        text.toLowerCase().includes(needle)
          ? [{ path: page.path, line: i + 1, text: text.trim() }]
          : []
      )
  );
};

const usage = (sub: Subcommand, arg: string) =>
  new CliError(
    "PUCK-CLI-INVALID-ARGS",
    `Specify ${arg}. For example \`${CANONICAL_INVOCATION} docs ${sub} ${
      {
        ls: "api-reference",
        cat: "getting-started",
        find: "dynamic fields",
        grep: "resolveData",
      }[sub]
    }\`.`
  );

export const runDocs = async (
  rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  const [first = "ls", ...args] = positionals;
  const sub = first as Subcommand;

  if (!SUBCOMMANDS.includes(sub)) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `Unknown docs command "${sub}". Available: ${SUBCOMMANDS.join(", ")}.`
    );
  }

  const source = rc.deps.docs;
  const pages = source.list();
  const result = emptyResult("docs");
  const input = args.join(" ");

  if (sub === "ls") {
    if (args.length > 1) throw usage(sub, "one section");

    const prefix = args.length ? normalizeDocPath(input) : "";
    const listed = prefix
      ? pages.filter(
          (page) => page.path === prefix || page.path.startsWith(`${prefix}/`)
        )
      : pages;

    if (listed.length === 0) {
      throw new CliError(
        "PUCK-CLI-DOC-NOT-FOUND",
        `No docs under "${input}".`,
        {
          fix: `${CANONICAL_INVOCATION} docs ls`,
        }
      );
    }

    result.docs = { pages: listed };
  } else if (sub === "cat") {
    if (args.length !== 1) throw usage(sub, "one page");

    const page = resolvePage(pages, input);
    result.docs = { page: { ...page, content: source.read(page.path) } };
    result.message = page.title;
  } else if (sub === "find") {
    if (!input.trim()) throw usage(sub, "what to find");

    const found = find(source, pages, input);
    result.docs = { pages: found.slice(0, FIND_LIMIT) };

    if (found.length === 0) {
      result.message = `No pages match "${input}". Try \`${CANONICAL_INVOCATION} docs grep ${input}\` to search page content.`;
    } else if (found.length > FIND_LIMIT) {
      result.message = `Showing the first ${FIND_LIMIT} of ${found.length} pages.`;
    }
  } else {
    if (!input) throw usage(sub, "text to search for");

    const matches = grep(source, pages, input);
    result.docs = { matches: matches.slice(0, GREP_LIMIT) };

    if (matches.length === 0) {
      result.message = `No matches for "${input}".`;
    } else if (matches.length > GREP_LIMIT) {
      result.message = `Showing the first ${GREP_LIMIT} of ${matches.length} matches.`;
    }
  }

  return result;
};
