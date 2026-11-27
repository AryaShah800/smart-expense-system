import User from "../models/user.js";

/** Only the newest notifications are kept, so a busy group cannot grow a user document without bound. */
export const MAX_NOTIFICATIONS = 100;

/** Appends one in-app notification to the user and drops the oldest beyond MAX_NOTIFICATIONS. */
export const pushNotification = (userId, notification) =>
  User.updateOne(
    { _id: userId },
    { $push: { notifications: { $each: [{ isRead: false, ...notification }], $slice: -MAX_NOTIFICATIONS } } }
  );
