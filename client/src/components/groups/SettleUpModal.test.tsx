import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "../../api/axios";
import SettleUpModal from "./SettleUpModal";
import { renderWithProviders } from "../../test/utils";

afterEach(() => vi.restoreAllMocks());

const others = [
  { _id: "u2", username: "riya" },
  { _id: "u3", username: "kabir" },
];

const open = () =>
  renderWithProviders(<SettleUpModal groupId="g1" groupMembers={others} onClose={() => {}} onSettled={() => {}} />);

describe("SettleUpModal", () => {
  it("when you paid, the recipient is one of the other members", () => {
    open();
    const to = screen.getByLabelText("Paid To");
    expect([...to.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Select Recipient", "riya", "kabir"]);
  });

  it("records that another member paid you back", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    open();

    await userEvent.selectOptions(screen.getByLabelText("Paid From"), "u2");
    const to = screen.getByLabelText("Paid To") as HTMLSelectElement;
    expect([...to.options].map((o) => o.textContent)).toEqual(["You (Me)"]);
    expect(to.value).toBe("u1");

    await userEvent.type(screen.getByLabelText("Amount"), "250");
    await userEvent.click(screen.getByRole("button", { name: /record|settle|save/i }));

    expect(post).toHaveBeenCalledWith("/groups/g1/settle", { fromUserId: "u2", toUserId: "u1", amount: 250 });
  });

  it("switching the payer back to you clears the forced recipient", async () => {
    open();
    await userEvent.selectOptions(screen.getByLabelText("Paid From"), "u2");
    await userEvent.selectOptions(screen.getByLabelText("Paid From"), "");
    expect((screen.getByLabelText("Paid To") as HTMLSelectElement).value).toBe("");
  });
});
