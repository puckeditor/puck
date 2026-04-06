import qler from "qler";
import type { ViewSources } from "../types";

const q = qler();

const queryCache: Record<string, any> = {};

export const resetViewQueryCache = () => {
  Object.keys(queryCache).forEach((key) => {
    delete queryCache[key];
  });
};

export const queryView = async ({
  source,
  params,
  sources,
}: {
  source: string;
  params: any;
  sources: ViewSources;
}) => {
  const key = `${source}-${JSON.stringify(params)}`;
  const viewSource = sources[source];

  if (!viewSource) {
    throw new Error(`View source "${source}" does not exist`);
  }

  return await q.queue(async () => {
    if (queryCache[key]) return queryCache[key];
    const data = await viewSource.fetch(params);

    queryCache[key] = data;

    return data;
  }, key);
};
