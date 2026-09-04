import { definePage } from "@puckeditor/router";

import { conf } from ".";
import { initialData } from "./initial-data";
import { performanceData, performancePath } from "./fixtures/performance";

/**
 * The demo's seed pages, defined in code and typed against the config.
 *
 * These render until someone publishes an edit to the same path, which forks
 * the page into local storage; the stored copy wins from then on. Delete the
 * row (or clear local storage) and the code page comes back.
 */
export const pages = [
  ...Object.keys(initialData).map((path) =>
    definePage(conf, { path, data: initialData[path] })
  ),
  definePage(conf, { path: performancePath, data: performanceData }),
];

export default pages;
