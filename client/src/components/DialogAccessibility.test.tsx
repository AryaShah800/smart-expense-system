import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import AddExpenseModal from "./groups/AddExpenseModal";
import CreateGroupModal from "./groups/CreateGroupModal";
import InviteMemberModal from "./groups/InviteMemberModal";
import JoinGroupModal from "./groups/JoinGroupModal";
import SettleUpModal from "./groups/SettleUpModal";
import Recurring from "../pages/Recurring";

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (url) => ({
    data: url === "/recurring" ? { recurring: [] } : [],
  }));
  vi.spyOn(api, "post").mockResolvedValue({ data: {} });
});
afterEach(() => vi.restoreAllMocks());

const members = [{ _id: "u2", username: "riya" }];
const onSaved = () => {};
const dialogs = [
  {
    name: "Add Expense",
    render: (onClose: () => void) => <AddExpenseModal groupId="g1" groupMembers={members} onClose={onClose} onAdded={onSaved} />,
  },
  {
    name: "Create New Group",
    render: (onClose: () => void) => <CreateGroupModal onClose={onClose} onCreated={onSaved} />,
  },
  {
    name: "Invite Member",
    render: (onClose: () => void) => <InviteMemberModal groupId="g1" onClose={onClose} />,
  },
  {
    name: "Join Group",
    render: (onClose: () => void) => <JoinGroupModal onClose={onClose} onJoined={onSaved} />,
  },
  {
    name: "Record Payment",
    render: (onClose: () => void) => <SettleUpModal groupId="g1" groupMembers={members} onClose={onClose} onSettled={onSaved} />,
  },
];

describe.each(dialogs)("$name accessibility", ({ name, render }) => {
  it("has a named dialog and a Close button that closes without submitting", async () => {
    const onClose = vi.fn();
    renderWithProviders(render(onClose));

    const dialog = screen.getByRole("dialog", { name });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(close).toHaveAttribute("type", "button");
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(render(onClose));

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("Recurring dialog accessibility", () => {
  it("has a named dialog and closes via Escape and Close without submitting", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Recurring />);
    const opener = await screen.findByRole("button", { name: /Add Schedule/ });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Create Recurring Schedule" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    const close = within(screen.getByRole("dialog")).getByRole("button", { name: "Close" });
    expect(close).toHaveAttribute("type", "button");
    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(api.post).not.toHaveBeenCalled();
  });
});
