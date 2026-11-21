import {
  Utensils, ShoppingCart, Receipt, Zap, Wallet, Laptop, TrendingUp, Clapperboard, ShoppingBag, Plane,
  Car, HeartPulse, GraduationCap, Home, Gift, Tv, Coffee, Tag, Banknote, Wifi, Dumbbell, User,
  type LucideIcon,
} from "lucide-react";
import type { CategoryLike } from "./categoryIcons";
import type { TransactionType } from "../types/models";

// First keyword found in the category name wins.
const ICONS: Array<[string, LucideIcon]> = [
  ["groceries", ShoppingCart], ["grocery", ShoppingCart], ["food", Utensils], ["dining", Utensils],
  ["coffee", Coffee], ["bill", Receipt], ["utilit", Zap], ["electric", Zap], ["internet", Wifi], ["wifi", Wifi],
  ["salary", Wallet], ["wage", Wallet], ["freelance", Laptop], ["invest", TrendingUp],
  ["entertain", Clapperboard], ["movie", Clapperboard], ["shopping", ShoppingBag], ["travel", Plane],
  ["transport", Car], ["fuel", Car], ["health", HeartPulse], ["medical", HeartPulse], ["fitness", Dumbbell],
  ["gym", Dumbbell], ["education", GraduationCap], ["rent", Home], ["home", Home], ["gift", Gift], ["bonus", Gift],
  ["subscription", Tv], ["personal", User], ["income", Banknote],
];

export function pickCategoryIcon(category: CategoryLike, type: TransactionType = "expense"): LucideIcon {
  const name = (typeof category === "string" ? category : category?.name ?? "").toLowerCase();
  for (const [key, Icon] of ICONS) if (name.includes(key)) return Icon;
  return type === "income" ? Banknote : Tag;
}

