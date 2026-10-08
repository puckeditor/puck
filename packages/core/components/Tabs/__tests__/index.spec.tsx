import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReactNode, StrictMode } from "react";
import { appStoreContext, AppStoreApi, createAppStore } from "../../../store";
import { Tab, Tabs } from "../index";

// Each test gets its own store, so the selected tab doesn't leak between tests
const renderTabs = (
  layout: ReactNode,
  {
    strict = false,
    selectedTab: fieldTab,
  }: { strict?: boolean; selectedTab?: string } = {}
) => {
  const store = createAppStore();

  if (fieldTab) store.getState().setUi({ fieldTab });

  const wrap = (node: ReactNode) => {
    const tree = (
      <appStoreContext.Provider value={store}>
        <Tabs>{node}</Tabs>
      </appStoreContext.Provider>
    );

    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
  const result = render(wrap(layout));

  return {
    store,
    rerender: (next: ReactNode) =>
      act(async () => {
        result.rerender(wrap(next));
      }),
  };
};

const tabLabels = () =>
  screen.getAllByRole("tab").map((tab) => tab.textContent);

const selectedTab = () =>
  screen.getByRole("tab", { selected: true }).textContent;

const storedTab = (store: AppStoreApi) => store.getState().state.ui.fieldTab;

const Layout = ({
  showB = true,
  showIntro = false,
  swapped = false,
}: {
  showB?: boolean;
  showIntro?: boolean;
  swapped?: boolean;
}) => {
  const c = (
    <Tab key="c" label="C">
      C content
    </Tab>
  );
  const d = (
    <Tab key="d" label="D">
      D content
    </Tab>
  );

  return (
    <>
      {showIntro && <Tab label="Intro">Intro content</Tab>}
      <div>
        <Tab label="A">A content</Tab>
      </div>
      {showB && <Tab label="B">B content</Tab>}
      {swapped ? [d, c] : [c, d]}
      <p>Always shown</p>
    </>
  );
};

describe("Tabs", () => {
  it("renders the tabs list in layout order and selects the first tab", () => {
    const { store } = renderTabs(<Layout />);

    expect(tabLabels()).toEqual(["A", "B", "C", "D"]);
    expect(selectedTab()).toBe("A");
    expect(screen.getByText("A content")).toBeInTheDocument();
    expect(screen.queryByText("B content")).toBeNull();
    expect(screen.getByText("Always shown")).toBeInTheDocument();
    expect(storedTab(store)).toBe("A");
  });

  it("shows a tab's panel when it's selected", () => {
    const { store } = renderTabs(<Layout />);

    fireEvent.click(screen.getByRole("tab", { name: "C" }));

    expect(selectedTab()).toBe("C");
    expect(screen.getByText("C content")).toBeInTheDocument();
    expect(screen.queryByText("A content")).toBeNull();
    expect(storedTab(store)).toBe("C");
  });

  it("places a tab rendered later in the list where it is located in the layout", async () => {
    const { rerender } = renderTabs(<Layout showB={false} />);

    expect(tabLabels()).toEqual(["A", "C", "D"]);

    await rerender(<Layout />);

    expect(tabLabels()).toEqual(["A", "B", "C", "D"]);
  });

  it("shows the first tab when the selected one is removed, and stays there when it comes back", async () => {
    const { store, rerender } = renderTabs(<Layout />);

    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    await rerender(<Layout showB={false} />);

    expect(selectedTab()).toBe("A");
    expect(storedTab(store)).toBe("A");

    await rerender(<Layout />);

    expect(selectedTab()).toBe("A");
  });

  it("keeps the selected tab when its label changes", async () => {
    const layout = (count: number) => (
      <>
        <Tab label="A">A content</Tab>
        <Tab value="errors" label={`Errors (${count})`}>
          Errors content
        </Tab>
      </>
    );
    const { rerender } = renderTabs(layout(1));

    fireEvent.click(screen.getByRole("tab", { name: "Errors (1)" }));
    await rerender(layout(2));

    expect(selectedTab()).toBe("Errors (2)");
  });

  it("keeps a chosen tab when StrictMode runs the effects twice", () => {
    renderTabs(<Layout />, { strict: true, selectedTab: "C" });

    expect(selectedTab()).toBe("C");
  });

  it("keeps a tab chosen for the next component when the previous one's tabs unmount", async () => {
    const { store, rerender } = renderTabs(<Layout />);

    // Like setUi({ itemSelector, fieldTab }): the value changes, then the old tabs unmount
    act(() => store.getState().setUi({ fieldTab: "C" }));
    await rerender(<></>);
    await rerender(
      <>
        <Tab label="Settings">Settings content</Tab>
        <Tab label="C">Other C content</Tab>
      </>
    );

    expect(selectedTab()).toBe("C");
  });

  it("selects the first tab when the next component doesn't have the selected one", async () => {
    const { store, rerender } = renderTabs(<Layout />);

    fireEvent.click(screen.getByRole("tab", { name: "B" }));

    // Nothing renders while the next component's fields load, then its tabs mount
    await rerender(<></>);
    await rerender(
      <>
        <Tab label="Settings">Settings content</Tab>
        <Tab label="Advanced">Advanced content</Tab>
      </>
    );

    expect(selectedTab()).toBe("Settings");
    expect(storedTab(store)).toBe("Settings");
  });

  it("keeps the selected tab when the next component has it", async () => {
    const { store, rerender } = renderTabs(<Layout />);

    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    await rerender(<></>);
    await rerender(
      <>
        <Tab label="Settings">Settings content</Tab>
        <Tab label="B">Other B content</Tab>
      </>
    );

    expect(selectedTab()).toBe("B");
    expect(storedTab(store)).toBe("B");
  });

  it("keeps a tab chosen before it registers, and selects it once it does", async () => {
    const { store, rerender } = renderTabs(
      <Tab label="Settings">Settings content</Tab>,
      { selectedTab: "Advanced" }
    );

    expect(selectedTab()).toBe("Settings");
    expect(storedTab(store)).toBe("Advanced");

    await rerender(
      <>
        <Tab label="Settings">Settings content</Tab>
        <Tab label="Advanced">Advanced content</Tab>
      </>
    );

    expect(selectedTab()).toBe("Advanced");
  });

  it("stays on the tab shown when a tab is added before it", async () => {
    const { rerender } = renderTabs(<Layout />);

    await rerender(<Layout showIntro />);

    expect(tabLabels()).toEqual(["Intro", "A", "B", "C", "D"]);
    expect(selectedTab()).toBe("A");
  });

  it("reorders tabs that move without remounting", async () => {
    const { rerender } = renderTabs(<Layout />);

    await rerender(<Layout swapped />);

    expect(tabLabels()).toEqual(["A", "B", "D", "C"]);
  });

  it("selects tabs with the arrow keys, Home and End", () => {
    renderTabs(<Layout />);

    const tablist = screen.getByRole("tablist");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(selectedTab()).toBe("B");
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();

    fireEvent.keyDown(tablist, { key: "End" });
    expect(selectedTab()).toBe("D");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(selectedTab()).toBe("A");

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(selectedTab()).toBe("D");

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(selectedTab()).toBe("A");
  });

  it("renders no tab row without tabs", () => {
    renderTabs(<p>Fields</p>);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByText("Fields")).toBeInTheDocument();
  });
});

describe("Tab", () => {
  it("throws outside of the fields", () => {
    // React also logs the error it caught
    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Tab label="Alone">Alone content</Tab>)).toThrow(
      "Tab must be used inside the fields"
    );

    error.mockRestore();
  });
});
