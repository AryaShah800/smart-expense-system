import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../api/socket";
import { queryKeys } from "../api/queryClient";
import { useAppDispatch, useAppSelector, selectUser } from "../store/hooks";
import { fetchNotifications, notificationReceived } from "../store/notificationsSlice";
import type { Notification } from "../types/models";

/**
 * Loads notifications and listens for real-time ones while a user is signed in.
 * Mount it once (in Layout); Navbar and Header read the shared slice.
 * Socket events also invalidate the affected TanStack Query data.
 */
export function useNotificationsSocket() {
  const userId = useAppSelector(selectUser)?._id;
  const dispatch = useAppDispatch();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchNotifications());

    socket.connect();
    const joinRoom = () => socket.emit("join_room", userId);
    const onNotification = (notification: Notification) => {
      dispatch(notificationReceived(notification));
      // A notification usually means a group changed (new expense, member joined, settlement).
      qc.invalidateQueries({ queryKey: queryKeys.groups });
      qc.invalidateQueries({ queryKey: ["group"] });
    };
    const onInvite = () => {
      qc.invalidateQueries({ queryKey: queryKeys.invitations });
    };

    socket.on("connect", joinRoom);
    socket.on("new_notification", onNotification);
    socket.on("new_invite", onInvite);
    if (socket.connected) joinRoom();

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new_notification", onNotification);
      socket.off("new_invite", onInvite);
      socket.disconnect();
    };
  }, [userId, dispatch, qc]);
}
