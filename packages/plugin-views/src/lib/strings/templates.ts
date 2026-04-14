const TEMPLATE_TOKEN_REGEX = /{{\s*([^{}]+?)\s*}}/g;

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
