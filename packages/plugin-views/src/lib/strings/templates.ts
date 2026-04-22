import { escapeRegExp } from "./regex";

const TEMPLATE_TOKEN_REGEX = /{{\s*([^{}]+?)\s*}}/g;
const TEMPLATE_EXPRESSION_REGEX = /{{\s*([^{}]+?)\s*}}/;

/**
 * Extracts all template expressions from a template string (i.g., `{{ expression }}` -> `expression`).
 *
 * @param value The template string to inspect
 * @returns The extracted template expressions
 */
export const getTemplateExpressions = (value: string): string[] => {
  const expressions: string[] = [];

  value.replace(TEMPLATE_TOKEN_REGEX, (_, templateContainedBody) => {
    expressions.push(templateContainedBody.trim());

    return "";
  });

  return expressions;
};

/**
 * Replaces a single `{{ expression }}` token in a template string by `expression` with a concrete value.
 *
 * Returns an empty string if the value is absent or non stringifiable.
 *
 * @param template The template string containing the token
 * @param expression The expression name to replace
 * @param value The value to substitute
 * @returns The updated template string
 */
export const replaceTemplateExpressionValue = ({
  template,
  expression,
  value,
}: {
  template: string;
  expression: string;
  value?: string;
}) =>
  value === null || value === undefined || typeof value === "object"
    ? ""
    : template.replace(
        new RegExp(`{{\\s*${escapeRegExp(expression)}\\s*}}`, "g"),
        value
      );

/**
 * Extracts the wildcard expressions from a template string.
 *
 * @param template The template string to inspect
 * @returns The expressions that contain at least one `[*]`
 */
export const getWildcardTemplateExpressions = (template: string) =>
  getTemplateExpressions(template).filter((expression) =>
    expression.includes("[*]")
  );

/**
 * Checks whether a string contains at least one template expression.
 *
 * @param value The value to inspect
 * @returns Whether the value is a template string
 */
export const isTemplateString = (value: unknown) =>
  typeof value === "string" && TEMPLATE_EXPRESSION_REGEX.test(value);
