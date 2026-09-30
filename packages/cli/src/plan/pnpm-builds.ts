import { Document, isMap, isSeq, parseDocument } from "yaml";

const LEGACY_LISTS = [
  "onlyBuiltDependencies",
  "neverBuiltDependencies",
  "ignoredBuiltDependencies",
];

const allowAll = (names: string[]) =>
  Object.fromEntries(names.map((name) => [name, true]));

/**
 * Allows `names` to run their build scripts in a pnpm-workspace.yaml, which
 * pnpm 11 requires or it fails the install. Leaves any existing decision
 * about a package alone, including an explicit `false`. Returns null when
 * nothing needs to change.
 */
export const withAllowedBuilds = (
  text: string | null,
  names: string[]
): string | null => {
  const doc = parseDocument(text ?? "");
  if (doc.errors.length > 0) return null;
  if (doc.get("dangerouslyAllowAllBuilds") === true) return null;

  const allowBuilds = doc.get("allowBuilds");
  const covered = new Set<string>();
  if (isMap(allowBuilds)) {
    for (const item of allowBuilds.items) covered.add(String(item.key));
  }
  for (const list of LEGACY_LISTS) {
    const seq = doc.get(list);
    if (isSeq(seq)) for (const item of seq.toJSON()) covered.add(String(item));
  }

  const missing = names.filter((name) => !covered.has(name));
  if (missing.length === 0) return null;

  const legacy = doc.get("onlyBuiltDependencies");
  if (isMap(allowBuilds)) {
    for (const name of missing) allowBuilds.set(name, true);
  } else if (isSeq(legacy)) {
    for (const name of missing) legacy.add(name);
  } else if (doc.contents === null) {
    const created = new Document({ allowBuilds: allowAll(missing) });
    created.commentBefore =
      " Dependencies allowed to run install scripts (required by pnpm 11+)";
    return created.toString();
  } else {
    doc.set("allowBuilds", allowAll(missing));
  }

  return doc.toString();
};

