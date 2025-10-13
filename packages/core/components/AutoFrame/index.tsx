import {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useState,
} from "react";
import hash from "object-hash";
import { createPortal } from "react-dom";

const styleSelector = 'style, link[rel="stylesheet"]';

const collectStyles = (doc: Document) => {
  const collected: HTMLElement[] = [];

  doc.querySelectorAll(styleSelector).forEach((style) => {
    if (style.tagName === "STYLE") {
      const hasContent = !!style.innerHTML.trim();

      if (hasContent) {
        collected.push(style as HTMLElement);
      }
    } else {
      collected.push(style as HTMLElement);
    }
  });

  return collected;
};

const getStyleSheet = (el: HTMLElement) => {
  return Array.from(document.styleSheets).find((ss) => {
    const ownerNode = ss.ownerNode as HTMLLinkElement;

    return ownerNode.href === (el as HTMLLinkElement).href;
  });
};

const getStyles = (styleSheet?: CSSStyleSheet) => {
  if (styleSheet) {
    try {
      return [...Array.from(styleSheet.cssRules)]
        .map((rule) => rule.cssText)
        .join("");
    } catch (e) {
      console.warn(
        "Access to stylesheet %s is denied. Ignoring…",
        styleSheet.href
      );
    }
  }

  return "";
};

// Sync attributes from parent window to iFrame
const syncAttributes = (sourceElement: Element, targetElement: Element) => {
  const attributes = sourceElement.attributes;
  if (attributes?.length > 0) {
    Array.from(attributes).forEach((attribute: Attr) => {
      targetElement.setAttribute(attribute.name, attribute.value);
    });
  }
};

const defer = (fn: () => void) => setTimeout(fn, 0);

const CopyHostStyles = ({
  children,
  debug = false,
  onStylesLoaded = () => null,
}: {
  children: ReactNode;
  debug?: boolean;
  onStylesLoaded?: () => void;
}) => {
  const { document: doc, window: win } = useFrame();

  useEffect(() => {
    if (!win || !doc) {
      return () => {};
    }

    let elements: { original: HTMLElement; mirror: HTMLElement }[] = [];
    const hashes: Record<string, boolean> = {};

    const lookupEl = (el: HTMLElement) =>
      elements.findIndex((elementMap) => elementMap.original === el);

    const mirrorEl = async (el: HTMLElement, inlineStyles = false) => {
      let mirror: HTMLStyleElement;

      if (el.nodeName === "LINK" && inlineStyles) {
        mirror = document.createElement("style") as HTMLStyleElement;
        mirror.type = "text/css";

        let styleSheet = getStyleSheet(el);

        if (!styleSheet) {
          await new Promise<void>((resolve) => {
            const fn = () => {
              resolve();
              el.removeEventListener("load", fn);
            };

            el.addEventListener("load", fn);
          });
          styleSheet = getStyleSheet(el);
        }

        const styles = getStyles(styleSheet);

        if (!styles) {
          if (debug) {
            console.warn(
              `Tried to load styles for link element, but couldn't find them. Skipping...`
            );
          }

          return;
        }

        mirror.innerHTML = styles;

        mirror.setAttribute("data-href", el.getAttribute("href")!);
      } else {
        mirror = el.cloneNode(true) as HTMLStyleElement;
      }

      return mirror;
    };

    const addEl = async (el: HTMLElement) => {
      const index = lookupEl(el);
      if (index > -1) {
        if (debug)
          console.log(
            `Tried to add an element that was already mirrored. Updating instead...`
          );

        elements[index].mirror.innerText = el.innerText;

        return;
      }

      const mirror = await mirrorEl(el);

      if (!mirror) {
        return;
      }

      const elHash = hash(mirror.outerHTML);

      if (hashes[elHash]) {
        if (debug)
          console.log(
            `iframe already contains element that is being mirrored. Skipping...`
          );

        return;
      }

      hashes[elHash] = true;

      doc.head.append(mirror as HTMLElement);
      elements.push({ original: el, mirror: mirror });

      if (debug) console.log(`Added style node ${el.outerHTML}`);
    };

    const removeEl = (el: HTMLElement) => {
      const index = lookupEl(el);
      if (index === -1) {
        if (debug)
          console.log(
            `Tried to remove an element that did not exist. Skipping...`
          );

        return;
      }

      const elHash = hash(el.outerHTML);

      elements[index]?.mirror?.remove();
      delete hashes[elHash];

      if (debug) console.log(`Removed style node ${el.outerHTML}`);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE ||
              node.nodeType === Node.ELEMENT_NODE
            ) {
              const el =
                node.nodeType === Node.TEXT_NODE
                  ? node.parentElement
                  : (node as HTMLElement);

              if (el && el.matches(styleSelector)) {
                defer(() => addEl(el));
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE ||
              node.nodeType === Node.ELEMENT_NODE
            ) {
              const el =
                node.nodeType === Node.TEXT_NODE
                  ? node.parentElement
                  : (node as HTMLElement);

              if (el && el.matches(styleSelector)) {
                defer(() => removeEl(el));
              }
            }
          });
        }
      });
    });

    const parentDocument = win!.parent.document;

    const collectedStyles = collectStyles(parentDocument);
    const hrefs: string[] = [];
    let stylesLoaded = 0;

    // Sync attributes for the HTML tag
    const parentHtml = parentDocument.getElementsByTagName("html")[0];
    syncAttributes(parentHtml, doc.documentElement);

    // Sync attributes for the Body tag
    const parentBody = parentDocument.getElementsByTagName("body")[0];
    syncAttributes(parentBody, doc.body);

    Promise.all(
      collectedStyles.map(async (styleNode, i) => {
        if (styleNode.nodeName === "LINK") {
          const linkHref = (styleNode as HTMLLinkElement).href;

          // Don't process link elements with identical hrefs more than once
          if (hrefs.indexOf(linkHref) > -1) {
            return;
          }

          hrefs.push(linkHref);
        }

        const mirror = await mirrorEl(styleNode);

        if (!mirror) return;

        elements.push({ original: styleNode, mirror });

        return mirror;
      })
    ).then((mirrorStyles) => {
      const filtered = mirrorStyles.filter(
        (el) => typeof el !== "undefined"
      ) as HTMLStyleElement[];

      filtered.forEach((mirror) => {
        mirror.onload = () => {
          stylesLoaded = stylesLoaded + 1;

          if (stylesLoaded >= elements.length) {
            onStylesLoaded();
          }
        };
        mirror.onerror = () => {
          console.warn(`AutoFrame couldn't load a stylesheet`);
          stylesLoaded = stylesLoaded + 1;

          if (stylesLoaded >= elements.length) {
            onStylesLoaded();
          }
        };
      });

      // Reset HTML (inside the promise) so in case running twice (i.e. for React Strict mode)
      doc.head.innerHTML = "";

      // Inject initial values in bulk
      doc.head.append(...filtered);

      observer.observe(parentDocument.head, { childList: true, subtree: true });

      filtered.forEach((el) => {
        const elHash = hash(el.outerHTML);

        hashes[elHash] = true;
      });
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export type AutoFrameProps = {
  children: ReactNode;
  className: string;
  debug?: boolean;
  id?: string;
  onReady?: () => void;
  onNotReady?: () => void;
  frameRef: RefObject<HTMLIFrameElement | null>;
};

type AutoFrameContext = {
  document?: Document;
  window?: Window;
};

export const autoFrameContext = createContext<AutoFrameContext>({});

export const useFrame = () => useContext(autoFrameContext);

function AutoFrame({
  children,
  className,
  debug,
  id,
  onReady = () => {},
  onNotReady = () => {},
  frameRef,
  ...props
}: AutoFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [ctx, setCtx] = useState<AutoFrameContext>({});
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>();
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    if (frameRef.current) {
      const doc = frameRef.current.contentDocument;
      const win = frameRef.current.contentWindow;

      setCtx({
        document: doc || undefined,
        window: win || undefined,
      });

      setMountTarget(
        frameRef.current.contentDocument?.getElementById("frame-root")
      );

      if (doc && win && stylesLoaded) {
        onReady();
      } else {
        onNotReady();
      }
    }
  }, [frameRef, loaded, stylesLoaded]);

  return (
    <iframe
      {...props}
      className={className}
      id={id}
      srcDoc='<!DOCTYPE html><html><head></head><body><div id="frame-root" data-puck-entry></div></body></html>'
      ref={frameRef}
      onLoad={() => {
        setLoaded(true);
      }}
    >
      <autoFrameContext.Provider value={ctx}>
        {loaded && mountTarget && (
          <CopyHostStyles
            debug={debug}
            onStylesLoaded={() => setStylesLoaded(true)}
          >
            {createPortal(children, mountTarget)}
          </CopyHostStyles>
        )}
      </autoFrameContext.Provider>
    </iframe>
  );
}

AutoFrame.displayName = "AutoFrame";

export default AutoFrame;
