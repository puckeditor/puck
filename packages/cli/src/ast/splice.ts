export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** Applies non-overlapping offset edits, leaving every other byte untouched */
export const applyEdits = (code: string, edits: TextEdit[]) => {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = code;
  let lastStart = Infinity;

  for (const edit of sorted) {
    if (edit.end > lastStart) {
      throw new Error("Overlapping edits");
    }
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    lastStart = edit.start;
  }

  return out;
};

/** 1-based line number of an offset */
export const lineOf = (code: string, offset: number) =>
  code.slice(0, offset).split("\n").length;

/** The whitespace indentation of the line containing an offset */
export const indentationAt = (code: string, offset: number) => {
  const lineStart = code.lastIndexOf("\n", offset - 1) + 1;
  const match = /^[ \t]*/.exec(code.slice(lineStart));
  return match ? match[0] : "";
};
