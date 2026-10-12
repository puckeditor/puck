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
      {
        id: "page_1",
        path: "/",
        latestVersionId: "page_1-v2",
        publishedVersionId: "page_1-v1",
      },
    ]);
  });

  it("reads a version's data", async () => {
    const { api } = setup();
    expect(await api.getPageVersion(KEY, "page_1", "page_1-v1")).toEqual({
      content: [],
      root: {},
    });
  });

  it("saves a new version", async () => {
    const { api, cloud } = setup();
    await api.savePage(KEY, "page_1", {
      data: { content: [] },
      status: "published",
    });
    expect(cloud.requests.at(-1)).toMatchObject({
      method: "POST",
      path: "/api/pages/page_1",
      body: { data: { content: [] }, status: "published" },
      headers: { "x-api-key": KEY },
    });
    expect((await api.listPages(KEY))[0].publishedVersionId).toBe("page_1-v3");
  });

  it.each([
    ["sk-wrong", "rejected"],
    [KEY, "bad_response"],
  ])("explains failures with %s", async (key, kind) => {
    const { api, cloud } = setup();
    cloud.failSaveAt = 1;
    const error = await api
      .savePage(key, "page_1", { data: {}, status: "unpublished" })
      .catch((e) => e);
    expect(error).toBeInstanceOf(CloudRequestError);
    expect(error.kind).toBe(kind);
  });
});
