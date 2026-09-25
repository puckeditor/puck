import type { File } from "@babel/types";

export interface ExportShape {
  default: boolean;
  named: string[];
  /** Exported types and interfaces */
  types?: string[];
}

export const getExportShape = (ast: File): ExportShape => {
  const shape: ExportShape = { default: false, named: [], types: [] };

  for (const statement of ast.program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      shape.default = true;
    } else if (statement.type === "ExportNamedDeclaration") {
      const decl = statement.declaration;
      if (
        (decl?.type === "TSTypeAliasDeclaration" ||
          decl?.type === "TSInterfaceDeclaration") &&
        decl.id
      ) {
        shape.types!.push(decl.id.name);
        continue;
      }
      if (statement.exportKind === "type") {
        for (const spec of statement.specifiers) {
          if (
            spec.type === "ExportSpecifier" &&
            spec.exported.type === "Identifier"
          ) {
            shape.types!.push(spec.exported.name);
          }
        }
        continue;
      }
      if (decl?.type === "VariableDeclaration") {
        for (const d of decl.declarations) {
          if (d.id.type === "Identifier") shape.named.push(d.id.name);
        }
      } else if (
        (decl?.type === "FunctionDeclaration" ||
          decl?.type === "ClassDeclaration") &&
        decl.id
      ) {
        shape.named.push(decl.id.name);
      }
      for (const spec of statement.specifiers) {
        if (spec.type !== "ExportSpecifier" || spec.exportKind === "type")
          continue;
        const name =
          spec.exported.type === "Identifier"
            ? spec.exported.name
            : spec.exported.value;
        if (name === "default") shape.default = true;
        else shape.named.push(name);
      }
    }
  }

  return shape;
};
