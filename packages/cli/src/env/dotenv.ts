const LINE = /^(\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/;

const QUOTED = /^(["'`])(.*?)\1(\s+#.*)?$/;

const unquote = (raw: string) => {
  const value = raw.trim();
  const quoted = QUOTED.exec(value);
  if (quoted) return quoted[2];
  const comment = value.search(/\s#/);
  return (comment === -1 ? value : value.slice(0, comment)).trim();
};

export const parseEnv = (content: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = LINE.exec(line);
    if (match && !(match[3] in out)) out[match[3]] = unquote(match[4]);
  }
  return out;
};

/**
 * Sets `key=value` in an env file while preserving every other line, the
 * order, and the line endings. Later duplicates of `key` are removed.
 */
export const upsertEnv = (
  content: string | null,
  key: string,
  value: string
): { content: string; operation: "add" | "update" | "noop" } => {
  if (content === null || content === "") {
    return { content: `${key}=${value}\n`, operation: "add" };
  }

  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const matches = lines
    .map((line, index) => ({ index, match: LINE.exec(line) }))
    .filter((l) => l.match && l.match[3] === key);

  if (matches.length === 0) {
    const trimmed = content.endsWith("\n") ? content : content + eol;
    return { content: `${trimmed}${key}=${value}${eol}`, operation: "add" };
  }

  const [first, ...duplicates] = matches;
  if (duplicates.length === 0 && unquote(first.match![4]) === value) {
    return { content, operation: "noop" };
  }

  const [, indent, exportPrefix = ""] = first.match!;
  lines[first.index] = `${indent}${exportPrefix}${key}=${value}`;
  const drop = new Set(duplicates.map((d) => d.index));
  const next = lines.filter((_, i) => !drop.has(i)).join(eol);

  return {
    content: next.endsWith(eol) ? next : next + eol,
    operation: "update",
  };
};
