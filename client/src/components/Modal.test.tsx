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

describe("Modal accessibility", () => {
  it("is announced as a labelled modal dialog", () => {
    render(<Modal isOpen onClose={() => {}} title="Set budget"><input aria-label="Limit" /></Modal>);
    const dialog = screen.getByRole("dialog", { name: "Set budget" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("gives the close button an accessible name", () => {
    render(<Modal isOpen onClose={() => {}} title="T">x</Modal>);
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
  });

  it("moves focus to the first field on open and restores it to the opener on close", () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button>Open</button>
          <Modal isOpen={open} onClose={() => {}} title="T"><input aria-label="Name" /></Modal>
        </>
      );
    }
    const { rerender } = render(<Harness open={false} />);
    screen.getByRole("button", { name: "Open" }).focus();

    rerender(<Harness open />);
    expect(screen.getByLabelText("Name")).toHaveFocus();

    rerender(<Harness open={false} />);
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="T"><input aria-label="Name" /></Modal>);
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Modal isOpen onClose={() => {}} title="T"><input aria-label="Name" /><button>Save</button></Modal>);
    const close = screen.getByRole("button", { name: "Close dialog" });
    const save = screen.getByRole("button", { name: "Save" });

    save.focus();
    await user.tab();
    expect(close).toHaveFocus(); // wrapped from last to first
    await user.tab({ shift: true });
    expect(save).toHaveFocus(); // wrapped from first to last
  });
});
