import {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import sortElementsByPosition from "../../lib/dom/sort-elements-by-position";
import containsDataAttr from "../../lib/dom/node-contains-data-attr";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { useSafeId } from "../../lib/use-safe-id";

import { useAppStore, useAppStoreApi } from "../../store";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Tabs", styles);
const getTabClassName = getClassNameFactory("Tabs-tab", styles);

type TabValue = string | number;

/** How a tab is represented for handling its state */
type RegisteredTab = {
  /** The unique ID for the tab. */
  value: TabValue;
  /** The text shown on the tab. */
  label: string;
  /**
   * DOM element that mounts with the tab panel and
   * indicates the position of the tab in the DOM for tab listing sorting.
   *
   * Can be the panel itself if it doesn't unmount when the tab isn't selected.
   */
  marker: HTMLElement;
};

/**
 * The context value provided to all tabs within a `Tabs` component.
 */
type TabsContextValue = {
  /** The currently selected tab's value (unique ID). */
  selected?: TabValue;
  /**
   * Registers a tab and returns a cleanup function to unregister it.
   *
   * Should be called from an effect that runs after the tab has been mounted
   * and whenever the tab changes its value.
   *
   * @param tab The tab to register.
   * @returns A cleanup function to unregister the tab. Return this from the effect that registers the tab.
   */
  register: (tab: RegisteredTab) => () => void;
};

/**
 * The context for the `Tabs` component, providing the currently selected tab and a function to register tabs.
 */
const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * A custom hook to access the `Tabs` context.
 *
 * @returns The current `Tabs` context value.
 */
const useTabs = (): TabsContextValue => {
  const tabs = useContext(TabsContext);

  if (!tabs) {
    throw new Error(
      "Tab must be used inside the fields (renderFields or the fields override)."
    );
  }

  return tabs;
};

/** Renders a row with the tabs defined below it in the tree, and only the selected tab's content. */
export const Tabs = ({ children }: { children: ReactNode }) => {
  const id = useSafeId();

  const [tabs, setTabs] = useState<RegisteredTab[]>([]);

  // The tabs from the last commit, to be able to tell when a tab has been removed or reordered
  const previousTabs = useRef<RegisteredTab[]>([]);

  const panelRef = useRef<HTMLDivElement>(null);

  const appStore = useAppStoreApi();
  const storedValue = useAppStore((s) => s.state.ui.fieldTab);
  const dispatch = useAppStore((s) => s.dispatch);

  // Register a new tab and return a function to remove it.
  const register = useCallback((tab: RegisteredTab) => {
    setTabs((current) =>
      sortElementsByPosition([...current, tab], (t) => t.marker)
    );

    return () => setTabs((current) => current.filter((item) => item !== tab));
  }, []);

  const canReorder = tabs.length > 1;

  // Watch for tab panels moving in the tab panel DOM to detect tab reordering and sync with state.
  // (Tabs that move in the DOM might not remount so we need an observer)
  useLayoutEffect(() => {
    // Don't reorder if there is only one tab, or if there's no panel to observe.
    if (!canReorder || !panelRef.current) return;

    const observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes].some((node) =>
            containsDataAttr(node, "data-puck-tab-marker")
          )
        )
      ) {
        // Sort the tabs if the new nodes in the panel contain a tab (marker)
        flushSync(() =>
          setTabs((current) => sortElementsByPosition(current, (t) => t.marker))
        );
      }
    });

    observer.observe(panelRef.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [canReorder]);

  const storedIndex = tabs.findIndex((tab) => tab.value === storedValue);
  // Show the first tab if no tab is currently selected
  const selectedIndex = Math.max(storedIndex, 0);
  const selected = tabs[selectedIndex]?.value;

  // When no tab is selected yet, or it was removed, set the first tab as selected.
  //
  // Checked in an effect, not in a tab's cleanup, bc cleanups also run when a tab registers
  // again while the tab is still there (e.g. they get a new label).
  useLayoutEffect(() => {
    const chosenWasRemoved = previousTabs.current.some(
      (tab) => tab.value === storedValue
    );
    previousTabs.current = tabs;

    // If there are no tabs or the selected tab is still there, do nothing
    if (tabs.length === 0 || storedIndex !== -1) return;

    // Otherwise select the first tab
    if (storedValue == null || chosenWasRemoved) {
      appStore.getState().setUi({ fieldTab: tabs[0].value });
    }
  }, [tabs, storedValue, storedIndex, appStore]);

  useEffect(() => {
    const values = tabs.map((tab) => tab.value);

    if (new Set(values).size !== values.length) {
      console.warn(
        "Each `Tab` needs a unique `value`, which defaults to its `label`"
      );
    }
  }, [tabs]);

  const selectTab = (value: TabValue) =>
    dispatch({ type: "setUi", ui: { fieldTab: value } });

  // Handle keyboard navigation for the tab list
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const count = tabs.length;

    // Get the new selected tab index
    const nextIndex = {
      ArrowRight: (selectedIndex + 1) % count,
      ArrowLeft: (selectedIndex - 1 + count) % count,
      Home: 0,
      End: count - 1,
    }[e.key];

    if (nextIndex === undefined) return;

    e.preventDefault();

    // Select the new tab
    selectTab(tabs[nextIndex].value);

    // Update the focus to the new tab in DOM
    e.currentTarget
      .querySelectorAll<HTMLElement>('[role="tab"]')
      [nextIndex]?.focus();
  };

  const tabsContextValue: TabsContextValue = useMemo(
    () => ({ selected, register }),
    [selected, register]
  );

  const hasTabs = tabs.length > 0;
  const panelId = `${id}-panel`;
  const getTabId = (index: number) => `${id}-tab-${index}`;

  return (
    <TabsContext.Provider value={tabsContextValue}>
      {hasTabs && (
        <div
          role="tablist"
          data-puck-tablist
          className={getClassName("list")}
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab, index) => {
            const isSelected = index === selectedIndex;

            return (
              <button
                key={tab.value}
                id={getTabId(index)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                tabIndex={isSelected ? 0 : -1}
                className={getTabClassName({ selected: isSelected })}
                onClick={() => selectTab(tab.value)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      <div
        ref={panelRef}
        id={panelId}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={hasTabs ? getTabId(selectedIndex) : undefined}
        data-puck-tabpanel
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

type TabProps = {
  /** The label to show for the tab in the tab list */
  label: string;
  /** The value associated with the tab. Defaults to the label if not provided. */
  value?: TabValue;
  /** The content to show when the tab is selected */
  children?: ReactNode;
};

/**
 * Groups fields in a tab. Only the selected tab's content is rendered.
 */
export const Tab = ({ label, value = label, children }: TabProps) => {
  const tabsList = useTabs();

  const tabPanelRef = useRef<HTMLSpanElement>(null);

  const register = tabsList.register;

  useLayoutEffect(() => {
    if (!tabPanelRef.current) return;

    // Register the tab when the component mounts and unregister when it unmounts.
    return register({ value, label, marker: tabPanelRef.current });
  }, [register, value, label]);

  return (
    <>
      <span hidden data-puck-tab-marker="" ref={tabPanelRef} />
      {tabsList.selected === value && children}
    </>
  );
};
