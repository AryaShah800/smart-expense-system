import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "../../api/axios";
import Groups from "../../pages/Groups";
import AddExpenseModal from "./AddExpenseModal";
import { renderWithProviders } from "../../test/utils";

afterEach(() => vi.restoreAllMocks());

describe("groups with a keyboard", () => {
  it("each group card is a link to the group", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => ({
      data: url === "/groups" ? [{ _id: "g1", name: "Goa trip", type: "Trip", members: [{ _id: "u1" }, { _id: "u2" }] }] : [],
    }));
    renderWithProviders(<Groups />);

    const card = await screen.findByRole("link", { name: /Goa trip/ });
    expect(card).toHaveAttribute("href", "/groups/g1");
  });

  it("equal-split members are checkboxes toggled with Space", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    renderWithProviders(
      <AddExpenseModal groupId="g1" groupMembers={[{ _id: "u2", username: "riya" }]} onClose={() => {}} onAdded={() => {}} />
    );

    const riya = await screen.findByRole("checkbox", { name: "riya" });
    const before = riya.getAttribute("aria-checked");
    riya.focus();
    await userEvent.keyboard(" ");
    expect(riya.getAttribute("aria-checked")).not.toBe(before);
    await userEvent.keyboard("{Enter}");
    expect(riya.getAttribute("aria-checked")).toBe(before);
  });
});
