import { createElement } from "react";
import type { CategoryLike } from "../utils/categoryIcons";
import type { TransactionType } from "../types/models";
import { pickCategoryIcon } from "../utils/pickCategoryIcon";

interface Props {
  category: CategoryLike;
  type?: TransactionType;
  size?: number;
}

/** One consistent line icon per category, chosen by name. Replaces the emoji stored on categories. */
export default function CategoryIcon({ category, type = "expense", size = 18 }: Props) {
  return createElement(pickCategoryIcon(category, type), { size, strokeWidth: 1.75, "aria-hidden": true });
}
