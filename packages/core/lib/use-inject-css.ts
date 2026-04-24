import { useInsertionEffect } from "react";
import {
  defaultUiStyles,
  iframeInteractionStyles,
} from "./generated/runtime-css";

export const PUCK_STYLE_SOURCE_ATTRIBUTE = "data-puck-style-source";
export const PUCK_STYLE_SOURCE_VALUE = "puck";
export const PUCK_STYLE_ID_ATTRIBUTE = "data-puck-style-id";

export const PUCK_STYLE_IDS = {
  uiDefault: "ui-default",
  iframeInteractions: "iframe-styles",
} as const;

export type PuckStyleId = (typeof PUCK_STYLE_IDS)[keyof typeof PUCK_STYLE_IDS];

type InjectStyleSheetOptions = {
  cssText: string;
  document?: Document;
  id: PuckStyleId;
  prepend?: boolean;
};

type RegisteredStyle = {
  count: number;
  el: HTMLStyleElement;
};

const styleRegistry = new WeakMap<
  Document,
  Map<PuckStyleId, RegisteredStyle>
>();

const getTargetDocument = (target?: Document) => {
  if (target) {
    return target;
  }

  if (typeof document === "undefined") {
    return undefined;
  }

  return document;
};

const getStyleMap = (target: Document) => {
  const existing = styleRegistry.get(target);

  if (existing) {
    return existing;
  }

  const created = new Map<PuckStyleId, RegisteredStyle>();

  styleRegistry.set(target, created);

  return created;
};

const attachStyleElement = (
  target: Document,
  el: HTMLStyleElement,
  prepend = false
) => {
  const head = target.head;

  if (!head) {
    return;
  }

  if (el.parentElement !== head) {
    if (prepend) {
      head.prepend(el);
    } else {
      head.append(el);
    }

    return;
  }

  if (prepend && head.firstChild !== el) {
    head.prepend(el);
  }

  if (!prepend && head.lastChild !== el) {
    head.append(el);
  }
};

const createStyleElement = (
  target: Document,
  id: PuckStyleId,
  cssText: string,
  prepend = false
) => {
  const el = target.createElement("style");

  el.setAttribute(PUCK_STYLE_SOURCE_ATTRIBUTE, PUCK_STYLE_SOURCE_VALUE);
  el.setAttribute(PUCK_STYLE_ID_ATTRIBUTE, id);
  el.textContent = cssText;

  attachStyleElement(target, el, prepend);

  return el;
};

export const isPuckStyleElement = (el?: Element | null) =>
  el?.getAttribute(PUCK_STYLE_SOURCE_ATTRIBUTE) === PUCK_STYLE_SOURCE_VALUE;

export const useInjectStyleSheet = (
  options: InjectStyleSheetOptions | null
) => {
  const targetDocument = getTargetDocument(options?.document);

  useInsertionEffect(() => {
    if (!options || !targetDocument) {
      return;
    }

    const registry = getStyleMap(targetDocument);
    const existing = registry.get(options.id);

    if (existing) {
      existing.count = existing.count + 1;

      if (existing.el.textContent !== options.cssText) {
        existing.el.textContent = options.cssText;
      }

      attachStyleElement(targetDocument, existing.el, options.prepend);
    } else {
      const el = createStyleElement(
        targetDocument,
        options.id,
        options.cssText,
        options.prepend
      );

      registry.set(options.id, {
        count: 1,
        el,
      });
    }

    return () => {
      const current = registry.get(options.id);

      if (!current) {
        return;
      }

      current.count = current.count - 1;

      if (current.count <= 0) {
        current.el.remove();
        registry.delete(options.id);
      }
    };
  }, [
    options?.cssText,
    options?.id,
    options?.prepend,
    options?.document,
    targetDocument,
  ]);
};

let staticCssDetected: boolean | null = null;

const hasStaticPuckCss = (): boolean => {
  if (staticCssDetected !== null) return staticCssDetected;
  if (typeof document === "undefined") return false;

  staticCssDetected =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--puck-color-azure-05")
      .trim() !== "";

  return staticCssDetected;
};

export const useInjectUiCss = () => {
  const skip = hasStaticPuckCss();

  useInjectStyleSheet(
    skip
      ? null
      : {
          cssText: defaultUiStyles,
          id: PUCK_STYLE_IDS.uiDefault,
          prepend: true,
        }
  );
};

export const useInjectIframeCss = (targetDocument?: Document) => {
  useInjectStyleSheet(
    targetDocument
      ? {
          cssText: iframeInteractionStyles,
          document: targetDocument,
          id: PUCK_STYLE_IDS.iframeInteractions,
        }
      : null
  );
};
