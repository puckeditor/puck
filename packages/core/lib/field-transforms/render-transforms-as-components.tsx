import { createElement, FunctionComponent } from "react";
import {
  FieldTransformFn,
  FieldTransforms,
} from "../../types/API/FieldTransforms";

/**
 * Wraps user-provided field transforms so they render as React components
 * rather than being invoked as plain functions during the parent's render.
 *
 * Field transforms are applied within a `useMemo` (see `useFieldTransforms`
 * and `useFieldTransformsTracked`). Calling a transform directly means any
 * hooks it uses run inside that `useMemo`, which violates the rules of hooks.
 * Rendering the transform as a component with `createElement` instead gives its
 * hooks their own render scope, so they behave as expected.
 *
 * https://github.com/puckeditor/puck/issues/1251
 */
export const renderTransformsAsComponents = (
  transforms: FieldTransforms
): FieldTransforms =>
  Object.keys(transforms).reduce<FieldTransforms>((acc, type) => {
    const fieldType = type as keyof FieldTransforms;
    const fn = transforms[fieldType];

    if (!fn) return acc;

    const Transform = fn as FunctionComponent<any>;

    return {
      ...acc,
      [fieldType]: ((params) =>
        createElement(Transform, params)) as FieldTransformFn<any>,
    };
  }, {});
