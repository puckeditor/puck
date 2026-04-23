import type { NodeViewState } from "../../types";
import {
  getPathToClosestWildcard,
  getWildcardCount,
  getWildcardPathRegExp,
} from "../strings/paths";
import {
  getWildcardTemplateExpressions,
  getWildcardFieldPath,
} from "../strings/templates";

/**
 * Returns the key under which a template should be stored in the templates object.
 *
 * @param fieldPath The static field path the template is attached to
 * @param template The template string
 * @param bindings The node's current view-state bindings
 * @param isSynced Whether the field is explicitly synced across a bound array and should therefore use the wildcard storage key even without wildcard expressions
 * @returns The storage key for the template
 */
export const getTemplateStorageKey = ({
  fieldPath,
  template,
  bindings,
  isSynced = false,
}: {
  fieldPath: string;
  template: string;
  bindings: NodeViewState["bindings"];
  isSynced?: boolean;
}) =>
  getWildcardTemplateExpressions(template).length > 0 || isSynced
    ? getWildcardFieldPath({ fieldPath, bindings })
    : fieldPath;

/**
 * Resolves the array-binding context for a given field path.
 *
 * @param fieldPath The field path to look up
 * @param bindings The node's current view-state bindings
 * @returns The binding context, or null if no wildcard ancestor binding exists
 */
const getTemplateBindingContext = ({
  fieldPath,
  bindings,
}: {
  fieldPath: string;
  bindings: NodeViewState["bindings"];
}) => {
  const bindingKey = getPathToClosestWildcard(fieldPath, Object.keys(bindings));

  if (!bindingKey || !bindings[bindingKey]) {
    return null;
  }

  return {
    bindingKey,
    binding: bindings[bindingKey],
    wildcardCount: getWildcardCount(bindings[bindingKey].path),
    matchRegExp: getWildcardPathRegExp(bindings[bindingKey].path),
  };
};

/**
 * Checks whether all wildcard expressions in a template are valid for the closest array binding of the given field path.
 *
 * A template is valid if it has no wildcard expressions, or if every wildcard expression matches the closest array binding.
 *
 * @param fieldPath The field path the template is attached to
 * @param template The template string to validate
 * @param bindings The node's current view-state bindings
 * @returns Whether the template is valid for the field path
 */
export const isValidTemplateForFieldPath = ({
  fieldPath,
  template,
  bindings,
}: {
  fieldPath: string;
  template: string;
  bindings: NodeViewState["bindings"];
}) => {
  const wildcardExpressions = getWildcardTemplateExpressions(template);

  if (wildcardExpressions.length === 0) {
    return true;
  }

  const context = getTemplateBindingContext({
    fieldPath,
    bindings,
  });

  if (!context) {
    return false;
  }

  return wildcardExpressions.every(
    (expression) =>
      getWildcardCount(expression) === context.wildcardCount &&
      context.matchRegExp.test(expression)
  );
};

// Below could be in a hook since it's used from components: --------------------------------------------------------------------------------------

/**
 * Completes and closes the open template fragment with an expression, and moves the cursor to the end of the inserted expression.
 *
 * @param options The current input value, cursor, and selected expression
 * @returns The updated value and next cursor position
 */
export const insertTemplateExpression = ({
  value,
  cursor,
  expression,
}: {
  value: string;
  cursor?: number;
  expression: string;
}) => {
  const fragment = getTemplateFragment({ value, cursor });

  if (!fragment) {
    return {
      value,
      cursor,
    };
  }

  const nextValue = `${value.slice(0, fragment.start)}{{ ${expression} }}${
    cursor ? value.slice(cursor) : ""
  }`;

  return {
    value: nextValue,
    cursor: fragment.start + expression.length + 6,
  };
};

/**
 * Finds the currently open template fragment up to the cursor position
 *
 * @param options The current input value and cursor position
 * @returns The active template fragment, or null when none is open
 */
export const getTemplateFragment = ({
  value,
  cursor,
}: {
  value: string;
  cursor?: number;
}) => {
  const beforeCursor = value.slice(0, cursor ?? value.length);
  const openIndex = beforeCursor.lastIndexOf("{{");

  if (openIndex === -1) {
    return null;
  }

  const closeIndex = beforeCursor.lastIndexOf("}}");

  if (closeIndex > openIndex) {
    return null;
  }

  return {
    start: openIndex,
    query: beforeCursor.slice(openIndex + 2).trim(),
  };
};
