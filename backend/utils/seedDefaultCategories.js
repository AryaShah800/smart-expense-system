import Category from "../models/Category.js";

const defaults = [
  { name: "Food", type: "expense", icon: "🍔", color: "#22c55e" },
  { name: "Travel", type: "expense", icon: "✈️", color: "#3b82f6" },
  { name: "Bills", type: "expense", icon: "💡", color: "#f59e0b" },
  { name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899" },
  { name: "Entertainment", type: "expense", icon: "🎬", color: "#8b5cf6" },
  { name: "Salary", type: "income", icon: "💰", color: "#16a34a" },
  { name: "Bonus", type: "income", icon: "🎁", color: "#4ade80" },
];

export async function seedDefaultCategories() {
  for (const category of defaults) {
    const exists = await Category.exists({
      name: category.name,
      type: category.type,
      user: null,
    });
    if (!exists) await Category.create(category);
  }
}
