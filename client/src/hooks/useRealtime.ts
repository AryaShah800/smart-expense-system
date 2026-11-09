import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../api/socket";
import { queryKeys } from "../api/queryClient";
import { useAuth } from "../context/AuthContext";
import type { Notification } from "../types";

/**
 * Owns the one socket connection for the signed-in session and turns server events
 * into cache updates, so every screen showing that data refreshes without polling.
 */
export function useRealtime(): void {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

    const onNotification = (notification: Notification) => {
      qc.setQueryData<Notification[]>(queryKeys.notifications, (prev) => [notification, ...(prev ?? [])]);
      // A notification usually means a group changed (new expense, member joined, settlement).
      qc.invalidateQueries({ queryKey: queryKeys.groups });
      qc.invalidateQueries({ queryKey: ["group"] });
    };
    const onInvite = () => {
      qc.invalidateQueries({ queryKey: queryKeys.invitations });
    };

    socket.on("new_notification", onNotification);
    socket.on("new_invite", onInvite);
    socket.connect(); // the server joins this user's room after verifying the token

    return () => {
      socket.off("new_notification", onNotification);
      socket.off("new_invite", onInvite);
      socket.disconnect();
    };
  }, [userId, qc]);
}
