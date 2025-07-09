import { renderHook, render } from "@testing-library/react";
import { useBreadcrumbs } from "../use-breadcrumbs";
import { createAppStore, appStoreContext } from "../../store";
import { ComponentData, Config } from "../../types";
import { PropsWithChildren } from "react";
import { walkAppState } from "../data/walk-app-state";

const appStore = createAppStore();

const Context = (props: PropsWithChildren) => {
  return (
    <appStoreContext.Provider value={appStore}>
      {props.children}
    </appStoreContext.Provider>
  );
};

function resetStores() {
  // Reset the main app store
  appStore.setState(
    {
      ...appStore.getInitialState(),
    },
    true
  );
}

describe("useBreadcrumbs", () => {
  beforeEach(() => {
    resetStores();
  });

  it("returns an empty array if no path is found", () => {
    // No nodes, no selectedItem => path is undefined
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([]);
  });

  it("returns a breadcrumb path including 'Page' for root", () => {
    const config: Config = {
      components: {
        MyComponent: {
          label: "My Component Label",
          render: () => <div />,
        },
      },
    };

    const testItem: ComponentData = {
      type: "MyComponent",
      props: { id: "item-1" },
    };

    const testItem2: ComponentData = {
      type: "MyComponent",
      props: { id: "item-2" },
    };

    appStore.setState({
      config,
      state: walkAppState(
        {
          ui: appStore.getState().state.ui,
          data: {
            content: [testItem],
            root: {},
            zones: {
              "item-1:zone": [testItem2],
            },
          },
          indexes: { nodes: {}, zones: {} },
        },
        config
      ),
      selectedItem: testItem2,
    });

    let result: any;

    const Comp = () => {
      result = useBreadcrumbs();
      return <></>;
    };

    render(
      <Context>
        <Comp />
      </Context>
    );

    // 5) Expect the result to include the "Page" crumb plus the item crumb
    expect(result).toEqual([
      { label: "Page", selector: null },
      {
        label: "My Component Label",
        selector: { index: 0, zone: "root:default-zone" },
      },
    ]);
  });

  it("truncates the breadcrumb list to renderCount if provided", () => {
    const config: Config = {
      components: {
        MyComponent: {
          label: "My Component Label",
          render: () => <div />,
        },
      },
    };

    const testItem: ComponentData = {
      type: "MyComponent",
      props: { id: "item-1" },
    };

    const testItem2: ComponentData = {
      type: "MyComponent",
      props: { id: "item-2" },
    };

    appStore.setState({
      config,
      state: walkAppState(
        {
          ui: appStore.getState().state.ui,
          data: {
            content: [testItem],
            root: {},
            zones: {
              "item-1:zone": [testItem2],
            },
          },
          indexes: { nodes: {}, zones: {} },
        },
        config
      ),
      selectedItem: testItem2,
    });

    let result: any;

    const Comp = () => {
      result = useBreadcrumbs(1);
      return <></>;
    };

    render(
      <Context>
        <Comp />
      </Context>
    );

    expect(result).toEqual([
      {
        label: "My Component Label",
        selector: { index: 0, zone: "root:default-zone" },
      },
    ]);
  });

  it("defaults to using the type name if config.components[type].label is missing", () => {
    // 1) Set up the config & selected item in the app store
    const config: Config = {
      components: {
        MyComponent: {
          render: () => <div />,
        },
      },
    };

    const testItem: ComponentData = {
      type: "MyComponent",
      props: { id: "item-1" },
    };

    const testItem2: ComponentData = {
      type: "MyComponent",
      props: { id: "item-2" },
    };

    appStore.setState({
      config,
      state: walkAppState(
        {
          ui: appStore.getState().state.ui,
          data: {
            content: [testItem],
            root: {},
            zones: {
              "item-1:zone": [testItem2],
            },
          },
          indexes: { nodes: {}, zones: {} },
        },
        config
      ),
      selectedItem: testItem2,
    });

    let result: any;

    const Comp = () => {
      result = useBreadcrumbs();
      return <></>;
    };

    render(
      <Context>
        <Comp />
      </Context>
    );

    // 5) Expect the result to include the "Page" crumb plus the item crumb
    expect(result).toEqual([
      { label: "Page", selector: null },
      {
        label: "MyComponent", // Fall back to type name
        selector: { index: 0, zone: "root:default-zone" },
      },
    ]);
  });
});
