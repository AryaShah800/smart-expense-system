import Category from "../models/Category.js";

// A category is usable by a user if it is a shared default (user: null) or one they created.
// Looking it up by id alone would let one user attach another user's private category.
export const findUsableCategory = (categoryId, userId) =>
  Category.findOne({ _id: categoryId, $or: [{ user: null }, { user: userId }] });
