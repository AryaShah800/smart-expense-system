import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import api from "../api/axios";
import GroupDetails from "./GroupDetails";
import { renderWithProviders } from "../test/utils";

afterEach(() => vi.restoreAllMocks());

const httpError = (status?: number) =>
  new AxiosError(
    "failed",
    status ? "ERR_BAD_RESPONSE" : "ERR_NETWORK",
    undefined,
    undefined,
    status ? { status, statusText: "", headers: {}, config: { headers: new AxiosHeaders() }, data: {} } : undefined
  );

const openGroup = () =>
  renderWithProviders(
    <Routes>
      <Route path="/groups/:id" element={<GroupDetails />} />
    </Routes>,
    { route: "/groups/g1" }
  );

describe("GroupDetails errors", () => {
  it("a network or server error offers a retry instead of claiming the group doesn't exist", async () => {
    vi.spyOn(api, "get").mockRejectedValue(httpError(500));
    openGroup();

    expect(await screen.findByText("Group unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Group not found")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeInTheDocument();
  });

  it("a 404 still says the group was not found", async () => {
    vi.spyOn(api, "get").mockRejectedValue(httpError(404));
    openGroup();

    expect(await screen.findByText("Group not found")).toBeInTheDocument();
  });
});
