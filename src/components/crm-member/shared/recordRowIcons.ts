import {
  Bolt,
  Droplet,
  FileText,
  Flame,
  Recycle,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type RecordIconIntent = "blue" | "amber" | "green" | "neutral" | "purple";

export const RECORD_ICON_CHIP: Record<RecordIconIntent, string> = {
  blue: "bg-blue-5 text-blue-dark dark:bg-blue/25 dark:text-blue-light-2",
  amber: "bg-yellow-light-4 text-yellow-dark-2 dark:bg-yellow-dark/25 dark:text-yellow-light",
  green: "bg-green-light-6 text-green-dark dark:bg-green-dark/25 dark:text-green-light-2",
  neutral: "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-gray-5",
  purple: "bg-violet-100 text-violet-800 dark:bg-violet-900/25 dark:text-violet-200",
};

export type RecordRowIconConfig = {
  icon: LucideIcon;
  intent: RecordIconIntent;
};

export function getRecordRowIcon(category: string): RecordRowIconConfig {
  const key = category.toLowerCase();

  if (key.includes("electric")) {
    return { icon: Bolt, intent: "blue" };
  }
  if (key.includes("gas")) {
    return { icon: Flame, intent: "amber" };
  }
  if (key.includes("waste") || key.includes("recycl")) {
    return { icon: Recycle, intent: "green" };
  }
  if (key.includes("oil")) {
    return { icon: Droplet, intent: "amber" };
  }
  if (key.includes("water")) {
    return { icon: Droplet, intent: "blue" };
  }
  if (key.includes("telecom") || key.includes("robot") || key.includes("cleaning")) {
    return { icon: Smartphone, intent: "purple" };
  }

  return { icon: FileText, intent: "neutral" };
}
