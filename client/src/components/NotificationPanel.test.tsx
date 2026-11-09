import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationPanel from "./NotificationPanel";
import type { Notification } from "../types";

const items: Notification[] = [
  { _id: "1", message: "Rahul added 'WiFi bill'", isRead: false, createdAt: "2026-03-01T10:00:00Z" },
  { _id: "2", message: "Priya settled up", isRead: true, createdAt: "2026-03-02T10:00:00Z" },
];

describe("NotificationPanel", () => {
  it("renders nothing while closed", () => {
    render(<NotificationPanel isOpen={false} onClose={() => {}} notifications={items} />);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("lists notifications and marks unread ones", () => {
    const { container } = render(<NotificationPanel isOpen onClose={() => {}} notifications={items} />);
    expect(screen.getByText("Rahul added 'WiFi bill'")).toBeInTheDocument();
    expect(container.querySelectorAll(".notification-panel-item.unread")).toHaveLength(1);
  });

  it("shows an empty state", () => {
    render(<NotificationPanel isOpen onClose={() => {}} notifications={[]} />);
    expect(screen.getByText("No new notifications")).toBeInTheDocument();
  });

  it("closes on Escape and locks page scroll only while open", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<NotificationPanel isOpen onClose={onClose} notifications={items} />);
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
