import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReactNode, StrictMode, useCallback, useState } from "react";
import { Tab, Tabs, TabsChangeReason, TabValue } from "../index";

type Change = { value: TabValue; reason: TabsChangeReason };

const renderTabs = (
  layout: ReactNode,
  {
    strict = false,
    value: initialValue,
    applyMissing = true,
  }: { strict?: boolean; value?: TabValue; applyMissing?: boolean } = {}
) => {
  const changes: Change[] = [];

  const Parent = ({ children }: { children: ReactNode }) => {
    const [value, setValue] = useState(initialValue);

    const onChange = useCallback(
      (next: TabValue, { reason }: { reason: TabsChangeReason }) => {
        changes.push({ value: next, reason });

        if (reason === "selected" || applyMissing) setValue(next);
      },
      []
    );

    return (
      <>
        <output data-testid="parent-value">{String(value)}</output>
        <Tabs value={value} onChange={onChange}>
          {children}
        </Tabs>
      </>
    );
  };

  const wrap = (node: ReactNode) => {
    const tree = <Parent>{node}</Parent>;

    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
  const result = render(wrap(layout));

  return {
    changes,
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

const parentValue = () => screen.getByTestId("parent-value").textContent;

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
  it("renders the tabs list in layout order and selects the first tab when no value is provided", () => {
    const { changes } = renderTabs(<Layout />);

    expect(tabLabels()).toEqual(["A", "B", "C", "D"]);
    expect(selectedTab()).toBe("A");
    expect(screen.getByText("A content")).toBeInTheDocument();
    expect(screen.queryByText("B content")).toBeNull();
    expect(screen.getByText("Always shown")).toBeInTheDocument();

    expect(changes).toEqual([{ value: "A", reason: "missing" }]);
    expect(parentValue()).toBe("A");
  });

  it("calls onChange when a tab's panel is selected", () => {
    const { changes } = renderTabs(<Layout />);

    fireEvent.click(screen.getByRole("tab", { name: "C" }));

    expect(changes).toContainEqual({ value: "C", reason: "selected" });
    expect(selectedTab()).toBe("C");
    expect(screen.getByText("C content")).toBeInTheDocument();
    expect(screen.queryByText("A content")).toBeNull();
  });

  it("places a tab rendered later in the list where it is located in the layout", async () => {
    const { rerender } = renderTabs(<Layout showB={false} />);

    expect(tabLabels()).toEqual(["A", "C", "D"]);

    await rerender(<Layout />);

    expect(tabLabels()).toEqual(["A", "B", "C", "D"]);
  });

  it("calls onChange with the first tab when the selected one is removed", async () => {
    const { changes, rerender } = renderTabs(<Layout />, { value: "B" });

    await rerender(<Layout showB={false} />);

    expect(changes).toEqual([{ value: "A", reason: "missing" }]);
    expect(selectedTab()).toBe("A");
  });

  it("shows the first tab when the value doesn't match any tab", async () => {
    const { rerender } = renderTabs(
      <Tab label="Settings">Settings content</Tab>,
      { value: "Advanced", applyMissing: false }
    );

    expect(selectedTab()).toBe("Settings");
    expect(parentValue()).toBe("Advanced");

    await rerender(
      <>
        <Tab label="Settings">Settings content</Tab>
        <Tab label="Advanced">Advanced content</Tab>
      </>
    );

    expect(selectedTab()).toBe("Advanced");
  });

  it("doesn't call onChange when there're no tabs", async () => {
    const { changes, rerender } = renderTabs(<Layout />, { value: "B" });

    await rerender(<></>);

    expect(changes).toEqual([]);
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

  it("keeps a selected tab when StrictMode runs the effects twice", () => {
    const { changes } = renderTabs(<Layout />, { strict: true, value: "C" });

    expect(selectedTab()).toBe("C");
    expect(changes).toEqual([]);
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
    const { changes } = renderTabs(<p>Fields</p>);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByText("Fields")).toBeInTheDocument();
    expect(changes).toEqual([]);
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
