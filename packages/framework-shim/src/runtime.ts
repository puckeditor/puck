/**
 * The ONE module in the shim that imports Preact directly.
 *
 * Everything else in the shim imports Preact primitives from here. Each
 * framework package (@puckeditor/vue, @puckeditor/svelte, …) bundles this shim
 * from source into a single JS artifact with Preact inlined exactly once, so
 * these primitives share the same Preact instance as the compiled
 * `@puckeditor/core` (whose `react` imports are aliased onto `preact/compat` at
 * build time). That shared instance is what lets the shim host a core render
 * tree and portal into it.
 *
 * `preact` (core), `preact/hooks` and `preact/compat` all reference the same
 * underlying Preact core module, so mixing their exports here is safe.
 */
import { h, render, Fragment, type ComponentType, type VNode } from "preact";
import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "preact/hooks";
import { createPortal, forwardRef, memo } from "preact/compat";

export {
  h,
  render,
  Fragment,
  createPortal,
  forwardRef,
  memo,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
};

export type { ComponentType, VNode };

/**
 * A Preact function component. Aliased so shim modules don't need to reach into
 * preact types directly.
 */
export type PreactFC<P = {}> = ComponentType<P>;
