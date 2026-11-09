// Category icon and emoji helper
const iconMap: Record<string, string> = {
  food: "🍔",
  dining: "🍽️",
  groceries: "🛒",
  grocery: "🛒",
  bills: "📄",
  bill: "📄",
  utilities: "💡",
  electricity: "⚡",
  water: "💧",
  internet: "🌐",
  wifi: "📶",
  salary: "💰",
  income: "💵",
  wage: "💵",
  freelance: "💻",
  investment: "📈",
  investments: "📈",
  entertainment: "🎬",
  movies: "🍿",
  shopping: "🛍️",
  travel: "✈️",
  transport: "🚗",
  fuel: "⛽",
  health: "🏥",
  medical: "💊",
  fitness: "🏋️",
  gym: "💪",
  education: "📚",
  rent: "🏠",
  home: "🏡",
  personal: "👤",
  gift: "🎁",
  subscriptions: "📺",
  subscription: "📺",
  coffee: "☕",
};

type IconSource = string | { name?: string; icon?: string } | null | undefined;

export const getCategoryIcon = (category: IconSource, fallbackType: string = "expense"): string => {
  if (!category) return fallbackType === "income" ? "💰" : "🏷️";

  // If category is just a string name
  const name = typeof category === "string" ? category : category.name || "";
  const icon = typeof category === "object" ? category.icon : "";

  // If icon is already a valid emoji (not 'default-icon' and not an empty/broken string)
  if (icon && icon !== "default-icon" && !icon.includes("default") && icon.trim().length > 0) {
    return icon;
  }

  // Match by category name
  const cleanName = name.toLowerCase().trim();
  for (const [key, emoji] of Object.entries(iconMap)) {
    if (cleanName.includes(key)) {
      return emoji;
    }
  }

  return fallbackType === "income" ? "💰" : "🏷️";
};

export default getCategoryIcon;
