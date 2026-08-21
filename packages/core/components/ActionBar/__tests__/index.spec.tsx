import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ActionBar } from "../index";

jest.mock("../styles.module.css");

describe("ActionBar.DragHandle", () => {
  it("renders a labelled button", () => {
    render(<ActionBar.DragHandle label="Drag to reorder" />);

    const handle = screen.getByRole("button", { name: "Drag to reorder" });
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("title", "Drag to reorder");
  });

  it("forwards its ref so callers can register a drag handle", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ActionBar.DragHandle label="Drag" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("can be disabled when the user lacks drag permission", () => {
    render(<ActionBar.DragHandle label="Drag" disabled />);

    expect(screen.getByRole("button", { name: "Drag" })).toBeDisabled();
  });

  it("stops click propagation so grabbing does not bubble to selection", () => {
    const onParentClick = jest.fn();

    render(
      <div onClick={onParentClick}>
        <ActionBar.DragHandle label="Drag" />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Drag" }));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
