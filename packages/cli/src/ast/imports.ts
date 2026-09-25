import type { File, StringLiteral } from "@babel/types";

export interface ImportSpecifierInfo {
  kind: "default" | "named" | "namespace";
  imported: string;
  local: string;
  typeOnly: boolean;
}

export interface ModuleReference {
  source: string;
  /** Offsets of the string literal including quotes */
  sourceStart: number;
  sourceEnd: number;
  quote: string;
  statementStart: number;
  statementEnd: number;
  kind: "import" | "export";
  typeOnly: boolean;
  specifiers: ImportSpecifierInfo[];
}

const specifierName = (node: { type: string; name?: string; value?: string }) =>
  node.type === "Identifier" ? node.name! : node.value!;

/** Collects static imports and `export ... from` re-exports */
export const getModuleReferences = (
  ast: File,
  code: string
): ModuleReference[] => {
  const refs: ModuleReference[] = [];

  for (const statement of ast.program.body) {
    let source: StringLiteral | null | undefined = null;
    let kind: "import" | "export" = "import";
    let typeOnly = false;
    const specifiers: ImportSpecifierInfo[] = [];

    if (statement.type === "ImportDeclaration") {
      source = statement.source;
      typeOnly = statement.importKind === "type";
      for (const spec of statement.specifiers) {
        if (spec.type === "ImportDefaultSpecifier") {
          specifiers.push({
            kind: "default",
            imported: "default",
            local: spec.local.name,
            typeOnly,
          });
        } else if (spec.type === "ImportNamespaceSpecifier") {
          specifiers.push({
            kind: "namespace",
            imported: "*",
            local: spec.local.name,
            typeOnly,
          });
        } else {
          specifiers.push({
            kind: "named",
            imported: specifierName(spec.imported),
            local: spec.local.name,
            typeOnly: typeOnly || spec.importKind === "type",
          });
        }
      }
    } else if (
      (statement.type === "ExportNamedDeclaration" ||
        statement.type === "ExportAllDeclaration") &&
      statement.source
    ) {
      source = statement.source;
      kind = "export";
      typeOnly = statement.exportKind === "type";
    }

    if (!source || source.start == null || source.end == null) continue;

    refs.push({
      source: source.value,
      sourceStart: source.start,
      sourceEnd: source.end,
      quote: code[source.start],
      statementStart: statement.start!,
      statementEnd: statement.end!,
      kind,
      typeOnly,
      specifiers,
    });
  }

  return refs;
};

/** The local binding for `imported` from `source`, if imported */
export const findImportLocal = (
  ast: File,
  code: string,
  source: string,
  imported: string
): string | null => {
  for (const ref of getModuleReferences(ast, code)) {
    if (ref.kind !== "import" || ref.source !== source) continue;
    const spec = ref.specifiers.find(
      (s) => s.imported === imported && !s.typeOnly
    );
    if (spec) return spec.local;
  }
  return null;
};
