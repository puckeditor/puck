import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IconButton } from "../IconButton";

jest.mock("../IconButton.module.css");

describe("IconButton", () => {
  it("exposes the title as aria-label on the button for an icon-only accessible name", () => {
    const { container } = render(
      <IconButton title="Switch to Mobile viewport">
        <svg data-testid="icon" />
      </IconButton>
    );

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute("aria-label", "Switch to Mobile viewport");
  });

  it("renders the icon children inside the button", () => {
    const { container, getByTestId } = render(
      <IconButton title="Click me">
        <svg data-testid="icon" />
      </IconButton>
    );

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(getByTestId("icon")).toBeInTheDocument();
    expect(button).toContainElement(getByTestId("icon"));
  });
});
