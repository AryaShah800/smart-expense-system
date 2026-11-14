import { useEffect } from "react";
import { socket } from "../api/socket";
import { useAppDispatch, useAppSelector, selectUser } from "../store/hooks";
import { fetchNotifications, notificationReceived } from "../store/notificationsSlice";
import type { Notification } from "../types/models";

/**
 * Loads notifications and listens for real-time ones while a user is signed in.
 * Mount it once (in Layout); Navbar and Header read the shared slice.
 */
export function useNotificationsSocket() {
  const userId = useAppSelector(selectUser)?._id;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchNotifications());

    socket.connect();
    const joinRoom = () => socket.emit("join_room", userId);
    const onNotification = (notification: Notification) => dispatch(notificationReceived(notification));

    socket.on("connect", joinRoom);
    socket.on("new_notification", onNotification);
    if (socket.connected) joinRoom();

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new_notification", onNotification);
      socket.disconnect();
    };
  }, [userId, dispatch]);
}
