import Category from "../models/Category.js";
import GroupCategory from "../models/GroupCategory.js";
import Group from "../models/Group.js";

/* ===================== GLOBAL DEFAULT CATEGORIES ===================== */

// Get all categories (Global + User specific)
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [{ user: null }, { user: req.user._id }]
    }).sort({ type: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new custom category
export const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    // Check if category already exists for this user or globally
    const existing = await Category.findOne({
      name,
      type,
      $or: [{ user: null }, { user: req.user._id }]
    });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      type,
      user: req.user._id,
      icon,
      color
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ===================== GROUP CATEGORIES ===================== */

// Create Group Category
export const createGroupCategory = async (req, res) => {
  try {
    const { groupId, name, color } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some(m => m.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const category = new GroupCategory({
      name,
      groupId,
      color,
      createdBy: req.user._id,
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Group Categories
export const getGroupCategories = async (req, res) => {
  try {
    const { groupId } = req.params;
    const categories = await GroupCategory.find({ groupId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};