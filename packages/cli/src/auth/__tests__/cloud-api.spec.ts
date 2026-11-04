import { CloudRequestError, createCloudApi } from "../cloud-api";
import { FakeCloud } from "../../../__tests__/helpers/harness";

const KEY = "sk-valid-key";

const setup = () => {
  const cloud = new FakeCloud();
  cloud.addPage("page_1", "/", [
    { data: { content: [], root: {} }, status: "published" },
    { data: { content: [{ type: "Hero" }], root: {} }, status: "unpublished" },
  ]);
  const api = createCloudApi("https://cloud.test", cloud.fetch);
  return { cloud, api };
};

describe("Cloud pages API", () => {
  it("lists the branch's pages with their latest and published versions", async () => {
    const { api } = setup();
    expect(await api.listPages(KEY)).toEqual([
      { id: "page_1", path: "/", version: 2, publishedVersion: 1 },
    ]);
  });

  it("lists every page, from an offset at a time", async () => {
    const { api, cloud } = setup();
    cloud.pageListLimit = 1;
    cloud.addPage("page_2", "/about", [
      { data: { content: [], root: {} }, status: "unpublished" },
    ]);
    expect((await api.listPages(KEY)).map((p) => p.id)).toEqual([
      "page_1",
      "page_2",
    ]);
  });

  it("refuses a list it can't read the versions of", async () => {
    const api = createCloudApi("https://cloud.test", async () =>
      Response.json({
        results: [{ id: "page_1", path: "/", latestVersionId: "v2" }],
        hasMore: false,
      })
    );
    await expect(api.listPages(KEY)).rejects.toMatchObject({
      kind: "bad_response",
    });
  });

  it("reads a version's data", async () => {
    const { api } = setup();
    expect(await api.getPageVersion(KEY, "page_1", 1)).toEqual({
      content: [],
      root: {},
    });
  });

  it("saves a new version on top of the latest", async () => {
    const { api, cloud } = setup();
    expect(await api.saveVersion(KEY, "page_1", { content: [] }, 2)).toBe(3);
    expect(cloud.requests.at(-1)).toMatchObject({
      method: "POST",
      path: "/api/pages/page_1/versions",
      body: { data: { content: [] }, previousVersion: 2 },
      headers: { "x-api-key": KEY },
    });
    expect(await api.listPages(KEY)).toEqual([
      expect.objectContaining({ version: 3, publishedVersion: 1 }),
    ]);
  });

  it("refuses to save over a newer version", async () => {
    const { api } = setup();
    await expect(
      api.saveVersion(KEY, "page_1", { content: [] }, 1)
    ).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("publishes a version", async () => {
    const { api, cloud } = setup();
    await api.publishVersion(KEY, "page_1", 2);
    expect(cloud.requests.at(-1)).toMatchObject({
      method: "POST",
      path: "/api/pages/page_1/publish",
      body: { version: 2 },
    });
    expect((await api.listPages(KEY))[0].publishedVersion).toBe(2);
  });

  it.each([
    ["sk-wrong", "rejected"],
    [KEY, "bad_response"],
  ])("explains failures with %s", async (key, kind) => {
    const { api, cloud } = setup();
    cloud.failSaveAt = 1;
    const error = await api
      .saveVersion(key, "page_1", {}, 2)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CloudRequestError);
    expect((error as CloudRequestError).kind).toBe(kind);
  });
});
