import { ReactElement, useEffect, useState } from "react";

import styles from "./HeadingAnalyzer.module.css";

import { createUsePuck } from "@measured/puck";
import { Plugin } from "@/core/types";
import { SidebarSection } from "@/core/components/SidebarSection";
import { OutlineList } from "@/core/components/OutlineList";

import { scrollIntoView } from "@/core/lib/scroll-into-view";
import { getFrame } from "@/core/lib/get-frame";

import { getClassNameFactory } from "@/core/lib";

const getClassName = getClassNameFactory("HeadingAnalyzer", styles);
const getClassNameItem = getClassNameFactory("HeadingAnalyzerItem", styles);

import ReactFromJSONModule from "react-from-json";

// Synthetic import
const ReactFromJSON =
  (ReactFromJSONModule as unknown as { default: typeof ReactFromJSONModule })
    .default || ReactFromJSONModule;

const getOutline = ({ frame }: { frame?: Element | Document } = {}) => {
  const headings = frame?.querySelectorAll("h1,h2,h3,h4,h5,h6") || [];

  const _outline: {
    rank: number;
    text: string;
    element: HTMLElement;
  }[] = [];

  headings.forEach((item, i) => {
    if (item.closest("[data-dnd-dragging]")) {
      return;
    }

    _outline.push({
      rank: parseInt(item.tagName.split("H")[1]),
      text: item.textContent!,
      element: item as HTMLElement,
    });
  });

  return _outline;
};

type Block = {
  rank: number;
  text: string;
  children?: Block[];
  missing?: boolean;
  analyzeId?: string;
  element?: HTMLElement;
};

function buildHierarchy(frame: Element | Document): Block[] {
  const headings = getOutline({ frame });

  const root = { rank: 0, children: [], text: "" }; // Placeholder root node
  let path: Block[] = [root];

  for (let heading of headings) {
    const node: Block = {
      rank: heading.rank,
      text: heading.text,
      children: [],
      element: heading.element,
    };

    // When encountering an h1, reset the path to only the root
    if (node.rank === 1) {
      path = [root];
    } else {
      // Go up the path until finding a node where this heading can be a child
      while (path[path.length - 1].rank >= node.rank) {
        path.pop();
      }

      // Add missing nodes if necessary
      while (path.length < node.rank) {
        const missingNode: Block = {
          rank: path.length,
          missing: true,
          children: [],
          text: "",
        };
        path[path.length - 1].children?.push(missingNode);
        path.push(missingNode);
      }
    }

    // Add this node to its parent in the path and update path
    path[path.length - 1].children?.push(node);
    path.push(node);
  }

  return root.children;
}

const usePuck = createUsePuck();

export const HeadingAnalyzer = () => {
  const data = usePuck((s) => s.appState.data);
  const [hierarchy, setHierarchy] = useState<Block[]>([]);

  // Re-render when content changes
  useEffect(() => {
    const frame = getFrame();

    let entry = frame?.querySelector(`[data-puck-entry]`);

    const createHierarchy = () => {
      setHierarchy(buildHierarchy(entry!));
    };
    const entryObserver = new MutationObserver(() => {
      createHierarchy();
    });

    const frameObserver = new MutationObserver(() => {
      entry = frame?.querySelector(`[data-puck-entry]`);

      if (entry) {
        registerEntryObserver();
        frameObserver.disconnect();
      }
    });

    const registerEntryObserver = () => {
      if (!entry) return;
      entryObserver.observe(entry, { subtree: true, childList: true });
    };

    const registerFrameObserver = () => {
      if (!frame) return;
      frameObserver.observe(frame, { subtree: true, childList: true });
    };

    if (entry) {
      createHierarchy();
      registerEntryObserver();
    } else {
      registerFrameObserver();
    }

    return () => {
      entryObserver.disconnect();
      frameObserver.disconnect();
    };
  }, [data]);

  return (
    <div className={getClassName()}>
      <small
        className={getClassName("cssWarning")}
        style={{
          color: "var(--puck-color-red-04)",
          display: "block",
          marginBottom: 16,
        }}
      >
        Heading analyzer styles not loaded. Please review the{" "}
        <a href="https://github.com/measuredco/puck/blob/main/packages/plugin-heading-analyzer/README.md">
          README
        </a>
        .
      </small>

      {hierarchy.length === 0 && <div>No headings.</div>}

      <OutlineList>
        <ReactFromJSON<{
          Root: (props: any) => ReactElement;
          OutlineListItem: (props: any) => ReactElement;
        }>
          mapping={{
            Root: (props) => <>{props.children}</>,
            OutlineListItem: (props) => (
              <OutlineList.Item>
                <OutlineList.Clickable>
                  <small
                    className={getClassNameItem({ missing: props.missing })}
                    onClick={
                      typeof props.element == "undefined"
                        ? undefined
                        : (e) => {
                            e.stopPropagation();

                            const el = props.element;

                            const oldStyle = { ...el.style };

                            if (el) {
                              scrollIntoView(el);

                              el.style.outline =
                                "4px solid var(--puck-color-rose-06)";
                              el.style.outlineOffset = "4px";

                              setTimeout(() => {
                                el.style.outline = oldStyle.outline || "";
                                el.style.outlineOffset =
                                  oldStyle.outlineOffset || "";
                              }, 2000);
                            }
                          }
                    }
                  >
                    {props.missing ? (
                      <>
                        <b>H{props.rank}</b>: Missing
                      </>
                    ) : (
                      <>
                        <b>H{props.rank}</b>: {props.text}
                      </>
                    )}
                  </small>
                </OutlineList.Clickable>
                <OutlineList>{props.children}</OutlineList>
              </OutlineList.Item>
            ),
          }}
          entry={{
            props: { children: hierarchy },
            type: "Root",
          }}
          mapProp={(prop) => {
            if (prop && prop.rank) {
              return {
                type: "OutlineListItem",
                props: prop,
              };
            }

            return prop;
          }}
        />
      </OutlineList>
    </div>
  );
};

const headingAnalyzer: Plugin = {
  overrides: {
    fields: ({ children, itemSelector }) => (
      <>
        {children}
        <div style={{ display: itemSelector ? "none" : "block" }}>
          <SidebarSection title="Heading Outline">
            <HeadingAnalyzer />
          </SidebarSection>
        </div>
      </>
    ),
  },
};

export default headingAnalyzer;
