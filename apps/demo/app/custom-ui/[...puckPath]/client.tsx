// Disable rules of hooks as they are regularly used inside render functions
/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import {
  ActionBar,
  AutoField,
  Button,
  Data,
  FieldLabel,
  Puck,
  Render,
  useGetPuck,
} from "@/core";
import { HeadingAnalyzer } from "@/plugin-heading-analyzer/src/HeadingAnalyzer";
import config from "../../../config";
import { UserConfig } from "../../../config/types";
import { useDemoData } from "../../../lib/use-demo-data";
import { IconButton, createUsePuck } from "@/core";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Drawer } from "@/core/components/Drawer";
import {
  ChevronUp,
  ChevronDown,
  Globe,
  Lock,
  Unlock,
  Type,
} from "lucide-react";

const usePuck = createUsePuck<UserConfig>();

const CustomHeader = ({ onPublish }: { onPublish: (data: Data) => void }) => {
  const getPuck = useGetPuck();
  const dispatch = usePuck((s) => s.dispatch);
  const previewMode = usePuck((s) => s.appState.ui.previewMode);

  const toggleMode = () => {
    dispatch({
      type: "setUi",
      ui: {
        previewMode: previewMode === "edit" ? "interactive" : "edit",
      },
    });
  };

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        padding: "16px 24px",
        background: "white",
        color: "black",
        alignItems: "center",
        borderBottom: "1px solid #ddd",
      }}
      onClick={() => dispatch({ type: "setUi", ui: { itemSelector: null } })}
    >
      <span style={{ fontWeight: 600 }}>Custom UI example </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <div style={{ gap: 8, display: "flex" }}>
          <Button onClick={toggleMode} variant="secondary">
            Switch to {previewMode === "edit" ? "interactive" : "edit"}
          </Button>
          <Button
            onClick={() => onPublish(getPuck().appState.data)}
            icon={<Globe size="14" />}
          >
            Publish
          </Button>
        </div>
      </div>
    </header>
  );
};

const Tabs = ({
  tabs,
  onTabCollapse,
  scrollTop,
}: {
  tabs: { label: string; body: ReactNode }[];
  onTabCollapse: () => void;
  scrollTop: number;
}) => {
  const [currentTab, setCurrentTab] = useState(-1);
  const itemSelector = usePuck((s) => s.appState.ui.itemSelector);
  const isDragging = usePuck((s) => s.appState.ui.isDragging);

  const currentTabRef = useRef(currentTab);

  useEffect(() => {
    if (currentTabRef.current !== -1 && itemSelector) {
      setCurrentTab(1);
    }
  }, [itemSelector]);

  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    if (isDragging && currentTab === 1) {
      setCurrentTab(-1);
    }
  }, [currentTab, isDragging]);

  useEffect(() => {
    if (scrollTop === 0) {
      setCurrentTab(-1);
      onTabCollapse();
    }
  }, [scrollTop]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#ffffff",
        pointerEvents: "all",
        borderTop: "1px solid #ddd",
        boxShadow: "rgba(140, 152, 164, 0.25) 0px 0px 6px 0px",
      }}
    >
      <div
        style={{
          display: "flex",
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: "1px solid #ddd",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab, idx) => {
          const isCurrentTab = currentTab === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (currentTab === idx) {
                  setCurrentTab(-1);
                } else {
                  setCurrentTab(idx);
                  if (scrollTop < 20) {
                    setTimeout(() => {
                      document
                        .querySelector("#action-bar")
                        ?.scroll({ top: 128, behavior: "smooth" });
                    }, 25);
                  }
                }
              }}
              style={{
                fontFamily: "inherit",
                fontSize: 16,
                padding: "16px 16px",
                paddingTop: 19,
                color: isCurrentTab ? "var(--puck-color-azure-04)" : "black",
                border: "none",
                borderBottom: isCurrentTab
                  ? "3px solid var(--puck-color-azure-04)"
                  : "3px solid transparent",
                background: "white",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div>
            <IconButton
              onClick={() => {
                setCurrentTab(currentTab === -1 ? 0 : -1);

                if (currentTab !== -1) {
                  onTabCollapse();
                } else {
                  setTimeout(() => {
                    document
                      .querySelector("#action-bar")
                      ?.scroll({ top: 128, behavior: "smooth" });
                  }, 25);
                }
              }}
              title={currentTab !== -1 ? "Collapse Tabs" : "Expand Tabs"}
            >
              {currentTab === -1 ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        {tabs.map((tab, idx) => {
          const isCurrentTab = currentTab === idx;
          return (
            <div
              key={idx}
              style={{
                display: isCurrentTab ? "block" : "none",
              }}
            >
              {tab.body}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomPuck = ({ dataKey }: { dataKey: string }) => {
  const [hoveringTabs, setHoveringTabs] = useState(false);

  const [actionBarScroll, setActionBarScroll] = useState(0);

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 2 }}>
        <CustomHeader
          onPublish={async (data: Data) => {
            localStorage.setItem(dataKey, JSON.stringify(data));
          }}
        />
      </div>
      <div
        style={{
          position: "relative",
          overflowY: hoveringTabs ? "hidden" : "auto",
          zIndex: 0,
        }}
      >
        <Puck.Preview />
      </div>
      <div
        id="action-bar"
        style={{
          position: "fixed",
          bottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          paddingTop: "calc(100vh - 58px)",
          pointerEvents: hoveringTabs ? undefined : "none",
          zIndex: 1,
          overscrollBehavior: "none",
        }}
        onTouchStart={() => setHoveringTabs(false)}
        onScrollCapture={(e) => {
          setActionBarScroll(e.currentTarget.scrollTop);
        }}
      >
        <div
          style={{
            background: "white",
            position: "relative",
            pointerEvents: "none",
            zIndex: 0,
          }}
          onMouseOver={(e) => {
            e.stopPropagation();
            setHoveringTabs(true);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setHoveringTabs(true);
          }}
          onMouseOut={() => {
            setHoveringTabs(false);
          }}
        >
          {/* Force react to render when hoveringTabs changes, otherwise scroll gets trapped */}
          {hoveringTabs && <span />}
          <Tabs
            onTabCollapse={() => {
              setTimeout(() => setHoveringTabs(false), 50);
            }}
            scrollTop={actionBarScroll}
            tabs={[
              { label: "Components", body: <Puck.Components /> },
              { label: "Fields", body: <Puck.Fields /> },
              { label: "Outline", body: <Puck.Outline /> },
              {
                label: "Headings",
                body: (
                  <div style={{ padding: 24 }}>
                    <HeadingAnalyzer />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const CustomDrawer = () => {
  const getPermissions = usePuck((s) => s.getPermissions);

  return (
    <Drawer>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
          pointerEvents: "all",
          padding: "16px",
          background: "var(--puck-color-grey-12)",
          gap: 8,
        }}
      >
        {Object.keys(config.components).map((componentKey, componentIndex) => {
          const canInsert = getPermissions({
            type: componentKey as keyof UserConfig["components"],
          }).insert;

          return (
            <Drawer.Item
              key={componentKey}
              name={componentKey}
              isDragDisabled={!canInsert}
            />
          );
        })}
      </div>
    </Drawer>
  );
};

export function Client({ path, isEdit }: { path: string; isEdit: boolean }) {
  const { data, resolvedData, key } = useDemoData({
    path,
    isEdit,
  });

  const [lockedComponents, setLockedComponents] = useState<
    Record<string, boolean>
  >({});

  const configOverride: UserConfig = {
    ...config,
    components: {
      ...Object.keys(config.components).reduce((acc, componentKey) => {
        return {
          ...acc,
          [componentKey]: {
            ...acc[componentKey as keyof UserConfig["components"]],
            resolvePermissions: (data: any, { permissions }: any) => {
              if (lockedComponents[data.props.id]) {
                return {
                  drag: false,
                  edit: false,
                  duplicate: false,
                  delete: false,
                };
              }

              return permissions;
            },
          },
        };
      }, config.components),
    },
  };

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  if (isEdit) {
    return (
      <Puck<UserConfig>
        config={configOverride}
        data={data}
        iframe={{ enabled: false }}
        headerPath={path}
        permissions={{
          lockable: true,
        }}
        overrides={{
          fieldTypes: {
            userField: ({ readOnly, field, name, value, onChange }) => (
              <FieldLabel
                label={field.label || name}
                readOnly={readOnly}
                icon={<Type size={16} />}
              >
                <AutoField
                  readOnly={readOnly}
                  field={{ type: "text" }}
                  onChange={onChange}
                  value={value}
                />
              </FieldLabel>
            ),
          },
          outline: ({ children }) => (
            <div style={{ padding: 16 }}>{children}</div>
          ),
          componentOverlay: ({ hover, isSelected }) => {
            return (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: hover ? "red" : "transparent",
                  outline: isSelected ? "2px solid blue" : "",
                  opacity: 0.4,
                }}
              />
            );
          },
          actionBar: ({ children, label, parentAction }) => {
            const selectedItem = usePuck((s) => s.selectedItem);
            const getPermissions = usePuck((s) => s.getPermissions);
            const refreshPermissions = usePuck((s) => s.refreshPermissions);

            const globalPermissions = getPermissions();

            // eslint-disable-next-line react-hooks/rules-of-hooks
            useEffect(() => {
              if (selectedItem) {
                // We have to force refresh the permission resolver to refresh, since it relies on lockedComponents state
                // Without this, the resolver won't trigger as no props will have changed
                refreshPermissions({ item: selectedItem });
              }
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [lockedComponents, selectedItem?.props.id, refreshPermissions]);

            if (!selectedItem)
              return (
                <ActionBar>
                  <ActionBar.Group>
                    {parentAction}
                    {label && <ActionBar.Label label={label} />}
                  </ActionBar.Group>
                  <ActionBar.Group>{children}</ActionBar.Group>
                </ActionBar>
              );

            const isLocked = !!lockedComponents[selectedItem.props.id];

            return (
              <ActionBar>
                <ActionBar.Group>
                  {parentAction}
                  {label && <ActionBar.Label label={label} />}
                </ActionBar.Group>
                <ActionBar.Group>
                  {children}
                  {globalPermissions.lockable && (
                    <ActionBar.Action
                      onClick={() => {
                        setLockedComponents({
                          ...lockedComponents,
                          [selectedItem.props.id as string]: !isLocked,
                        });

                        refreshPermissions({ item: selectedItem });
                      }}
                      label={isLocked ? "Unlock component" : "Lock component"}
                    >
                      {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                    </ActionBar.Action>
                  )}
                </ActionBar.Group>
              </ActionBar>
            );
          },
          drawer: () => <CustomDrawer />,
          puck: () => <CustomPuck dataKey={key} />,
        }}
      />
    );
  }

  if (data) {
    return <Render<UserConfig> config={config} data={resolvedData} />;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        <h1>404</h1>
        <p>Page does not exist in session storage</p>
      </div>
    </div>
  );
}

export default Client;
