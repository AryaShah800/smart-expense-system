import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import api from "../../api/axios";
import CreateGroupModal from "./CreateGroupModal";
import { renderWithProviders } from "../../test/utils";

afterEach(() => vi.restoreAllMocks());

describe("CreateGroupModal", () => {
  it("tells the user when creating the group fails and stays open", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("offline"));
    const error = vi.spyOn(toast, "error");
    const onClose = vi.fn();
    renderWithProviders(<CreateGroupModal onClose={onClose} onCreated={() => {}} />);

    await userEvent.type(screen.getByRole("textbox"), "Goa trip");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(error).toHaveBeenCalledWith("Couldn't create the group. Please try again.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
