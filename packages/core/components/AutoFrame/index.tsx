import {
  useCallback,
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useState,
} from "react";
import hash from "object-hash";
import { createPortal } from "react-dom";
import {
  isPuckStyleElement,
  useInjectIframeCss,
} from "../../lib/use-inject-css";

const styleSelector = 'style, link[rel="stylesheet"]';
const mirroredStyleAttribute = "data-puck-style-mirror";

export const shouldMirrorStyleElement = (style: HTMLElement) => {
  if (!style.matches(styleSelector) || isPuckStyleElement(style)) {
    return false;
  }

  if (style.tagName === "STYLE") {
    return !!style.innerHTML.trim();
  }

  return true;
};

const collectStyles = (doc: Document) =>
  Array.from(doc.querySelectorAll(styleSelector)).filter((style) =>
    shouldMirrorStyleElement(style as HTMLElement)
  ) as HTMLElement[];

const captureAttributes = (element: Element) =>
  new Map(
    Array.from(element.attributes).map((attribute) => [
      attribute.name,
      attribute.value,
    ])
  );

const restoreAttributes = (element: Element, snapshot: Map<string, string>) => {
  Array.from(element.attributes).forEach((attribute) => {
    if (!snapshot.has(attribute.name)) {
      element.removeAttribute(attribute.name);
    }
  });

  snapshot.forEach((value, name) => {
    element.setAttribute(name, value);
  });
};

// Sync attributes from parent window to iFrame
export const syncAttributes = (
  sourceElement: Element,
  targetElement: Element
) => {
  const previousAttributes = captureAttributes(targetElement);

  Array.from(targetElement.attributes).forEach((attribute) => {
    targetElement.removeAttribute(attribute.name);
  });

  Array.from(sourceElement.attributes).forEach((attribute: Attr) => {
    targetElement.setAttribute(attribute.name, attribute.value);
  });

  return () => {
    restoreAttributes(targetElement, previousAttributes);
  };
};

const defer = (fn: () => void) => setTimeout(fn, 0);

type MirroredElement = {
  original: HTMLElement;
  mirror: HTMLElement;
  hash: string;
};

const CopyHostStyles = ({
  children,
  debug = false,
  onStylesLoaded = () => null,
  syncHostStyles = true,
}: {
  children: ReactNode;
  debug?: boolean;
  onStylesLoaded?: () => void;
  syncHostStyles?: boolean;
}) => {
  const { document: doc, window: win } = useFrame();

  useInjectIframeCss(doc);

  useEffect(() => {
    if (!win || !doc) {
      return () => {};
    }

    let elements: MirroredElement[] = [];
    let disposed = false;
    const hashes: Record<string, boolean> = {};

    const removeAllMirrors = () => {
      elements.forEach(({ mirror }) => {
        mirror.remove();
      });

      elements = [];

      Array.from(
        doc.head.querySelectorAll(`[${mirroredStyleAttribute}="true"]`)
      ).forEach((mirror) => {
        mirror.remove();
      });

      Object.keys(hashes).forEach((key) => {
        delete hashes[key];
      });
    };

    const lookupEl = (el: HTMLElement) =>
      elements.findIndex((elementMap) => elementMap.original === el);

    const mirrorEl = (el: HTMLElement) => {
      const mirror = el.cloneNode(true) as HTMLElement;

      mirror.setAttribute(mirroredStyleAttribute, "true");

      return mirror;
    };

    const addEl = async (el: HTMLElement) => {
      if (!shouldMirrorStyleElement(el)) {
        return;
      }

      const index = lookupEl(el);

      if (index > -1) {
        if (debug) {
          console.log(
            "Tried to add an element that was already mirrored. Updating instead..."
          );
        }

        delete hashes[elements[index].hash];

        elements[index].mirror.textContent = el.textContent;
        elements[index].hash = hash(el.outerHTML);
        hashes[elements[index].hash] = true;

        return;
      }

      const elHash = hash(el.outerHTML);

      if (hashes[elHash]) {
        if (debug) {
          console.log(
            "iframe already contains element that is being mirrored. Skipping..."
          );
        }

        return;
      }

      const mirror = mirrorEl(el);

      if (disposed) {
        return;
      }

      hashes[elHash] = true;

      doc.head.append(mirror);
      elements.push({ original: el, mirror, hash: elHash });

      if (debug) {
        console.log(`Added style node ${el.outerHTML}`);
      }
    };

    const removeEl = (el: HTMLElement) => {
      const index = lookupEl(el);

      if (index === -1) {
        if (debug) {
          console.log(
            "Tried to remove an element that did not exist. Skipping..."
          );
        }

        return;
      }

      delete hashes[elements[index].hash];
      elements[index].mirror.remove();
      elements.splice(index, 1);

      if (debug) {
        console.log(`Removed style node ${el.outerHTML}`);
      }
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

              if (el && shouldMirrorStyleElement(el)) {
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

              if (el && el.matches(styleSelector) && !isPuckStyleElement(el)) {
                defer(() => removeEl(el));
              }
            }
          });
        }
      });
    });

    removeAllMirrors();

    if (!syncHostStyles) {
      onStylesLoaded();

      return () => {
        disposed = true;
        observer.disconnect();
        removeAllMirrors();
      };
    }

    const parentDocument = win.parent.document;
    const collectedStyles = collectStyles(parentDocument);
    const hrefs: string[] = [];
    let stylesLoaded = 0;

    const restoreHtmlAttributes = syncAttributes(
      parentDocument.documentElement,
      doc.documentElement
    );
    const restoreBodyAttributes = syncAttributes(parentDocument.body, doc.body);

    Promise.all(
      collectedStyles.map(async (styleNode) => {
        if (styleNode.nodeName === "LINK") {
          const linkHref = (styleNode as HTMLLinkElement).href;

          // Don't process link elements with identical hrefs more than once
          if (hrefs.indexOf(linkHref) > -1) {
            return;
          }

          hrefs.push(linkHref);
        }

        const mirror = mirrorEl(styleNode);

        elements.push({
          original: styleNode,
          mirror,
          hash: hash(styleNode.outerHTML),
        });

        return mirror;
      })
    ).then((mirrorStyles) => {
      if (disposed) {
        return;
      }

      const filtered = mirrorStyles.filter(
        (el) => typeof el !== "undefined"
      ) as HTMLElement[];

      filtered.forEach((mirror) => {
        const mirrorElement = mirror as HTMLLinkElement | HTMLStyleElement;

        mirrorElement.onload = () => {
          stylesLoaded = stylesLoaded + 1;

          if (stylesLoaded >= filtered.length) {
            onStylesLoaded();
          }
        };

        mirrorElement.onerror = () => {
          console.warn(`AutoFrame couldn't load a stylesheet`);
          stylesLoaded = stylesLoaded + 1;

          if (stylesLoaded >= filtered.length) {
            onStylesLoaded();
          }
        };
      });

      doc.head.append(...filtered);

      filtered.forEach((mirror) => {
        const original = elements.find(
          ({ mirror: current }) => current === mirror
        );

        if (original) {
          hashes[original.hash] = true;
        }

        if (mirror.nodeName === "STYLE") {
          stylesLoaded = stylesLoaded + 1;
        }
      });

      if (stylesLoaded >= filtered.length) {
        onStylesLoaded();
      }

      observer.observe(parentDocument.head, { childList: true, subtree: true });
    });

    return () => {
      disposed = true;
      observer.disconnect();
      restoreHtmlAttributes();
      restoreBodyAttributes();
      removeAllMirrors();
    };
  }, [debug, doc, onStylesLoaded, syncHostStyles, win]);

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
  syncHostStyles?: boolean;
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
  syncHostStyles = true,
  ...props
}: AutoFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [ctx, setCtx] = useState<AutoFrameContext>({});
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const handleStylesLoaded = useCallback(() => {
    setStylesLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      setStylesLoaded(false);
    }
  }, [loaded, syncHostStyles]);

  useEffect(() => {
    if (frameRef.current) {
      const doc = frameRef.current.contentDocument;
      const win = frameRef.current.contentWindow;

      setCtx({
        document: doc || undefined,
        window: win || undefined,
      });

      setMountTarget(
        frameRef.current.contentDocument?.getElementById("frame-root") || null
      );

      if (doc && win && stylesLoaded) {
        onReady();
      } else {
        onNotReady();
      }
    }
  }, [frameRef, loaded, onNotReady, onReady, stylesLoaded]);

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
            onStylesLoaded={handleStylesLoaded}
            syncHostStyles={syncHostStyles}
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
