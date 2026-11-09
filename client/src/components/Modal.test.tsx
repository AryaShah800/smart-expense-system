import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Add category">content</Modal>);
    expect(screen.queryByText("Add category")).not.toBeInTheDocument();
  });

  it("shows the title and children when open", () => {
    render(<Modal isOpen onClose={() => {}} title="Add category"><p>Body text</p></Modal>);
    expect(screen.getByText("Add category")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("closes from the × button and from the backdrop, but not from clicks inside", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Modal isOpen onClose={onClose} title="T"><p>Inside</p></Modal>);

    await user.click(screen.getByText("Inside"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector(".modal-overlay") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
