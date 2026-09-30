import { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { SelectField } from "@/core/types";

type LucideIconName = keyof typeof dynamicIconImports;

const iconNames = [
  "align-left",
  "feather",
  "git-merge",
  "github",
  "pen-tool",
  "plug",
  "activity",
  "badge-check",
  "book-open",
  "briefcase",
  "building-2",
  "chart-no-axes-column-increasing",
  "circle-check",
  "cloud",
  "code",
  "database",
  "globe",
  "heart",
  "lightbulb",
  "lock",
  "rocket",
  "shield-check",
  "sparkles",
  "users",
] as const satisfies readonly LucideIconName[];

type IconName = (typeof iconNames)[number];

const iconComponents = Object.fromEntries(
  // Use dynamic imports to load each icon component on demand instead of bundling all icons upfront
  iconNames.map((name) => [name, dynamic(dynamicIconImports[name])])
) as Record<IconName, ComponentType<LucideProps>>;

/**
 * Field for picking an icon
 */
export const iconField: SelectField = {
  type: "select",
  options: iconNames.map((name) => ({ label: name, value: name })),
};

/**
 * Renders an icon by name. Unknown names render nothing.
 */
export const Icon = ({ name, ...props }: LucideProps & { name?: string }) => {
  const IconComponent = iconComponents[name as IconName];

  return IconComponent ? <IconComponent aria-hidden {...props} /> : null;
};
