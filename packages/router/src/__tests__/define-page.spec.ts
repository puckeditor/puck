import { createElement } from "react";
import type { Config } from "@puckeditor/core";

import { definePage } from "../define-page";
import { sourceHash } from "../source-hash";

const config: Config = {
  components: {
    HeadingBlock: {
      fields: { title: { type: "text" } },
      render: ({ title }) => createElement("h1", null, title),
    },
  },
};

const data = {
  content: [{ type: "HeadingBlock", props: { id: "a", title: "Hi" } }],
  root: { props: { title: "Pricing" } },
};

describe("definePage", () => {
  it("returns the path, data and a hash of the data", () => {
    expect(definePage(config, { path: "/pricing", data })).toEqual({
      path: "/pricing",
      data,
      sourceHash: sourceHash(data),
    });
  });

  it("normalises the authored path", () => {
    expect(definePage(config, { path: "pricing/", data }).path).toBe("/pricing");
  });

  it("hashes structurally equal data the same way", () => {
    const a = definePage(config, { path: "/a", data: { ...data } });
    const b = definePage(config, {
      path: "/b",
      data: { root: data.root, content: data.content },
    });

    expect(a.sourceHash).toBe(b.sourceHash);
  });

  it("does not hash until sourceHash is read", () => {
    const data = { root: { props: { title: "Pricing" } }, content: [] };
    const spy = jest.spyOn(JSON, "stringify");

    const page = definePage(config, { path: "/pricing", data });
    expect(spy).not.toHaveBeenCalled();

    expect(typeof page.sourceHash).toBe("string");
    expect(spy).toHaveBeenCalled();

    // Memoised: the accessor is replaced by the value on first read.
    const callsAfterFirstRead = spy.mock.calls.length;
    void page.sourceHash;
    expect(spy.mock.calls).toHaveLength(callsAfterFirstRead);

    spy.mockRestore();
  });

  it("survives serialisation and spreading", () => {
    const page = definePage(config, { path: "/pricing", data });

    expect(JSON.parse(JSON.stringify(page)).sourceHash).toBe(page.sourceHash);
    expect({ ...page }.sourceHash).toBe(page.sourceHash);
  });

  it("rejects a missing or malformed config", () => {
    expect(() =>
      definePage(undefined as unknown as Config, { path: "/a", data })
    ).toThrow(/expects your Puck config/);

    expect(() =>
      definePage({} as unknown as Config, { path: "/a", data })
    ).toThrow(/expects your Puck config/);
  });
});
