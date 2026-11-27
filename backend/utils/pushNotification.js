import User from "../models/user.js";

/** Only the newest notifications are kept, so a busy group cannot grow a user document without bound. */
export const MAX_NOTIFICATIONS = 100;

const capped = (notification) => ({
  $push: { notifications: { $each: [{ isRead: false, ...notification }], $slice: -MAX_NOTIFICATIONS } },
});

/** Appends one in-app notification to the user and drops the oldest beyond MAX_NOTIFICATIONS. */
export const pushNotification = (userId, notification) => User.updateOne({ _id: userId }, capped(notification));

/** The same notification for several users in one database round trip. */
export const pushNotificationToMany = (userIds, notification) =>
  userIds.length === 0 ? Promise.resolve() : User.updateMany({ _id: { $in: userIds } }, capped(notification));
