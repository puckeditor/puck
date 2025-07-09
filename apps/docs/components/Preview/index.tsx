import React, {
  createContext,
  CSSProperties,
  useContext,
  useEffect,
  useState,
} from "react";

export { AutoField } from "@/core/components/AutoField";

import { ReactNode } from "react";
import "@/core/styles.css";
import { Puck } from "@/core/components/Puck";

import { AppState, ComponentConfig } from "@/core/types";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";
import { createUsePuck } from "@/core/lib/use-puck";

import { ChevronUp, ChevronDown } from "lucide-react";

import { codeToHtml } from "shiki";

import { createStore } from "zustand";
import { useContextStore } from "@/core/lib/use-context-store";

export const PreviewStoreContext = createContext(
  createStore(() => ({ drawerVisible: false }))
);

const getClassNamePreview = getClassNameFactory("PreviewFrame", styles);

const DrawerButton = () => {
  const drawerVisible = useContextStore(
    PreviewStoreContext,
    (s) => s.drawerVisible
  );

  const previewStore = useContext(PreviewStoreContext);

  return (
    <button
      className={getClassNamePreview("drawerButton")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        previewStore.setState((s) => ({ drawerVisible: !s.drawerVisible }));
      }}
    >
      {drawerVisible ? "Hide" : "Show"} output{" "}
      <div className={getClassNamePreview("drawerButtonIcon")}>
        {drawerVisible ? (
          <ChevronUp size="14px" />
        ) : (
          <ChevronDown size="14px" />
        )}
      </div>
    </button>
  );
};

const Drawer = ({ renderDrawer }: { renderDrawer: () => ReactNode }) => {
  const drawerVisible = useContextStore(
    PreviewStoreContext,
    (s) => s.drawerVisible
  );

  return drawerVisible ? (
    <div className={getClassNamePreview("drawer")}>{renderDrawer()}</div>
  ) : (
    <div />
  );
};

const usePuck = createUsePuck();

export const PreviewFrame = ({
  children,
  label,
  style = {},
  disableOnClick = false,
  renderInfo,
  renderDrawer,
}: {
  children?: ReactNode;
  label?: string;
  style?: CSSProperties;
  disableOnClick?: boolean;
  renderInfo?: () => ReactNode;
  renderDrawer?: () => ReactNode;
}) => {
  const dispatch = usePuck((s) => s.dispatch);

  return (
    <div
      className={getClassNamePreview()}
      onClick={() => {
        if (disableOnClick) return;

        dispatch({ type: "setUi", ui: { itemSelector: null } });
      }}
    >
      <div className={getClassNamePreview("header")}>
        <div className={getClassNamePreview("annotation")}>
          Interactive Demo
        </div>
        {label && <div className={getClassNamePreview("label")}>{label}</div>}
      </div>
      <div className={getClassNamePreview("contents")}>
        {renderInfo && (
          <div className={getClassNamePreview("info")} style={style}>
            {renderInfo()}
          </div>
        )}
        <div className={getClassNamePreview("body")} style={style}>
          {children}
        </div>
        {renderDrawer && <DrawerButton />}
      </div>
      {renderDrawer && <Drawer renderDrawer={renderDrawer} />}
    </div>
  );
};

export const CodeBlock = ({ code }: { code: string | object }) => {
  const [html, setHtml] = useState("<span />");

  useEffect(() => {
    (async () => {
      const html = await codeToHtml(JSON.stringify(code, null, 2), {
        lang: "javascript",
        theme: "github-dark",
      });

      setHtml(html);
    })();
  }, [code]);

  return (
    <div
      className={getClassNamePreview("codeblock")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const PuckPreview = ({
  label,
  children = <Puck.Preview />,
  style = {},
  disableOnClick,
  renderInfo,
  renderDrawer,
  ...puckProps
}: React.ComponentProps<typeof Puck> & {
  label: string;
  disableOnClick: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  renderInfo?: () => ReactNode;
  renderDrawer?: () => ReactNode;
}) => {
  const [store] = useState(createStore(() => ({ drawerVisible: false })));

  return (
    <Puck config={{}} data={{}} {...puckProps} iframe={{ enabled: false }}>
      <PreviewStoreContext value={store}>
        <PreviewFrame
          label={label}
          style={style}
          renderInfo={renderInfo}
          renderDrawer={renderDrawer}
          disableOnClick={disableOnClick}
        >
          {children}
        </PreviewFrame>
      </PreviewStoreContext>
    </Puck>
  );
};

const ConfigPreviewInner = ({
  componentConfig,
}: {
  componentConfig: ComponentConfig;
}) => {
  const appState = usePuck((s) => s.appState);

  return (
    <div>
      {componentConfig.render && (
        <div className={getClassNamePreview("preview")}>
          {componentConfig.render({
            ...appState.data["content"][0]?.props,
            puck: {
              renderDropZone: () => <div />,
              isEditing: false,
              metadata: {},
              dragRef: null,
            },
          })}
        </div>
      )}
    </div>
  );
};

export const CodeBlockDrawer = ({
  getCode,
}: {
  getCode?: (appState: AppState) => object | string;
}) => {
  const appState = usePuck((s) => s.appState);
  const code = getCode?.(appState) ?? "";

  return <CodeBlock code={code} />;
};

export const ConfigPreview = ({
  componentConfig,
  label,
}: {
  componentConfig: ComponentConfig;
  label: string;
}) => {
  return (
    <PuckPreview
      label={label}
      config={{ components: { Example: componentConfig } }}
      data={{
        content: [
          {
            type: "Example",
            props: { ...componentConfig.defaultProps, id: "example" },
          },
        ],
        root: { props: {} },
      }}
      onPublish={() => {}}
      ui={{ itemSelector: { index: 0 } }}
      disableOnClick
      renderInfo={() => (
        <div onClick={(e) => e.stopPropagation()}>
          <Puck.Fields />
        </div>
      )}
      renderDrawer={() => (
        <CodeBlockDrawer
          getCode={(appState) => {
            const { id, ...otherProps } = appState.data.content[0].props;

            return otherProps;
          }}
        />
      )}
      style={{ padding: 0 }}
    >
      <ConfigPreviewInner componentConfig={componentConfig} />
    </PuckPreview>
  );
};
