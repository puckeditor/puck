import type { Data } from "@puckeditor/core";

import {
  emptyPageData,
  indexPages,
  listPagePaths,
  resolvePage,
} from "../resolve-page";
import { sourceHash } from "../source-hash";
import type { PageSource, PageStore, StoredPage } from "../types";

const dataWith = (title: string): Data => ({
  content: [],
  root: { props: { title } },
});

const codePage = (path: string, title: string): PageSource => ({
  path,
  data: dataWith(title),
  sourceHash: sourceHash(dataWith(title)),
});

const fakeStore = (rows: Record<string, StoredPage> = {}): PageStore => ({
  get: async (path) => rows[path] ?? null,
  set: async (path, page) => {
    rows[path] = page;
  },
  list: async () => Object.keys(rows),
});

describe("resolvePage", () => {
  const pages = [codePage("/pricing", "Code pricing")];

  describe("resolution order", () => {
    it("prefers the store over a code page", async () => {
      const store = fakeStore({ "/pricing": { data: dataWith("Edited") } });

      const resolved = await resolvePage({
        pathname: "/pricing",
        pages,
        store,
      });

      expect(resolved).toMatchObject({
        path: "/pricing",
        origin: "store",
        mode: "render",
      });
      expect(resolved?.data.root.props?.title).toBe("Edited");
    });

    it("falls back to the code page when the store is empty", async () => {
      const resolved = await resolvePage({
        pathname: "/pricing",
        pages,
        store: fakeStore(),
      });

      expect(resolved).toMatchObject({ origin: "code", drift: false });
      expect(resolved?.data.root.props?.title).toBe("Code pricing");
    });

    it("falls back to the code page when a store row is deleted", async () => {
      const rows: Record<string, StoredPage> = {
        "/pricing": { data: dataWith("Edited") },
      };
      const store = fakeStore(rows);

      expect((await resolvePage({ pathname: "/pricing", pages, store }))?.origin)
        .toBe("store");

      delete rows["/pricing"];

      expect((await resolvePage({ pathname: "/pricing", pages, store }))?.origin)
        .toBe("code");
    });

    it("returns null for an unknown path when rendering", async () => {
      expect(
        await resolvePage({ pathname: "/nope", pages, store: fakeStore() })
      ).toBeNull();
    });

    it("returns an empty shell for an unknown path when editing", async () => {
      const resolved = await resolvePage({
        pathname: "/nope/edit",
        pages,
        store: fakeStore(),
      });

      expect(resolved).toEqual({
        path: "/nope",
        mode: "edit",
        data: emptyPageData(),
        origin: "new",
        drift: false,
      });
    });

    it("works with no store at all", async () => {
      expect(
        (await resolvePage({ pathname: "/pricing", pages }))?.origin
      ).toBe("code");
      expect(await resolvePage({ pathname: "/nope" })).toBeNull();
    });
  });

  describe("mode", () => {
    it("infers edit mode from the /edit suffix", async () => {
      const resolved = await resolvePage({ pathname: "/pricing/edit", pages });

      expect(resolved).toMatchObject({ mode: "edit", path: "/pricing" });
    });

    it("honours an explicit override when the suffix is gone", async () => {
      // Next.js rewrites /pricing/edit -> /puck/pricing, so the editor route
      // sees no suffix and must say so itself.
      const resolved = await resolvePage({
        pathname: ["pricing"],
        pages,
        mode: "edit",
      });

      expect(resolved).toMatchObject({ mode: "edit", path: "/pricing" });
    });

    it("opens a new page for an unknown path under an override", async () => {
      const resolved = await resolvePage({
        pathname: ["brand-new"],
        pages,
        mode: "edit",
      });

      expect(resolved).toMatchObject({ origin: "new", path: "/brand-new" });
    });
  });

  describe("drift", () => {
    const forked = codePage("/pricing", "Code pricing");

    it("is false when the fork still matches the code page", async () => {
      const store = fakeStore({
        "/pricing": {
          data: dataWith("Edited"),
          forkedFromHash: forked.sourceHash,
        },
      });

      const resolved = await resolvePage({
        pathname: "/pricing",
        pages: [forked],
        store,
      });

      expect(resolved?.drift).toBe(false);
    });

    it("is true once the code page changes underneath a fork", async () => {
      const store = fakeStore({
        "/pricing": {
          data: dataWith("Edited"),
          forkedFromHash: forked.sourceHash,
        },
      });

      const resolved = await resolvePage({
        pathname: "/pricing",
        pages: [codePage("/pricing", "Code pricing v2")],
        store,
      });

      expect(resolved?.drift).toBe(true);
    });

    it("is false for store pages that were never forked from code", async () => {
      // Every row written before this package existed looks like this; they
      // must not all report drift the moment an app adopts the router.
      const store = fakeStore({ "/pricing": { data: dataWith("Edited") } });

      const resolved = await resolvePage({
        pathname: "/pricing",
        pages: [forked],
        store,
      });

      expect(resolved?.drift).toBe(false);
    });

    it("is false when no code page exists for the path", async () => {
      const store = fakeStore({
        "/orphan": { data: dataWith("x"), forkedFromHash: "stale" },
      });

      const resolved = await resolvePage({ pathname: "/orphan", pages, store });

      expect(resolved?.drift).toBe(false);
    });
  });

  it("does not leak the shared empty shell between pages", async () => {
    const a = await resolvePage({ pathname: "/a/edit" });
    const b = await resolvePage({ pathname: "/b/edit" });

    a!.data.content.push({ type: "Heading", props: { id: "x" } });

    expect(b!.data.content).toHaveLength(0);
  });
});

describe("indexPages", () => {
  it("indexes a barrel array by normalised path", () => {
    expect(Object.keys(indexPages([codePage("pricing/", "x")]))).toEqual([
      "/pricing",
    ]);
  });

  it("re-keys a pre-built map through the same normalisation", () => {
    const indexed = indexPages({ "pricing/": codePage("ignored", "x") });

    expect(Object.keys(indexed)).toEqual(["/pricing"]);
    expect(indexed["/pricing"].path).toBe("/pricing");
  });

  it("memoises a map on identity too", () => {
    const map = { "/a": codePage("/a", "x") };

    expect(indexPages(map)).toBe(indexPages(map));
  });

  it("throws on a map whose keys collide after normalisation", () => {
    expect(() =>
      indexPages({
        "/pricing": codePage("/pricing", "a"),
        "pricing/": codePage("/pricing", "b"),
      })
    ).toThrow(/Duplicate page path "\/pricing"/);
  });

  it("returns an empty index when there are no pages", () => {
    expect(indexPages()).toEqual({});
  });

  it("throws on two pages claiming the same route", () => {
    expect(() =>
      indexPages([codePage("/pricing", "a"), codePage("/pricing/", "b")])
    ).toThrow(/Duplicate page path "\/pricing"/);
  });

  it("memoises on array identity", () => {
    const barrel = [codePage("/a", "x")];

    expect(indexPages(barrel)).toBe(indexPages(barrel));
  });

  it("indexes without forcing a lazily-hashed page", () => {
    let hashReads = 0;
    const lazy = {
      path: "/a",
      data: dataWith("x"),
      get sourceHash() {
        hashReads += 1;
        return "h";
      },
    };

    indexPages([lazy]);

    expect(hashReads).toBe(0);
  });
});

describe("listPagePaths", () => {
  it("unions code pages with the store, deduped and sorted", async () => {
    const paths = await listPagePaths({
      pages: [codePage("/pricing", "x"), codePage("/", "y")],
      store: fakeStore({
        "/pricing": { data: dataWith("x") },
        "/blog": { data: dataWith("y") },
      }),
    });

    expect(paths).toEqual(["/", "/blog", "/pricing"]);
  });

  it("works with only code pages", async () => {
    expect(await listPagePaths({ pages: [codePage("/a", "x")] })).toEqual(["/a"]);
  });

  it("works with only a store", async () => {
    expect(
      await listPagePaths({ store: fakeStore({ "/a": { data: dataWith("x") } }) })
    ).toEqual(["/a"]);
  });

  it("is empty when there is nothing to list", async () => {
    expect(await listPagePaths({})).toEqual([]);
  });
});
