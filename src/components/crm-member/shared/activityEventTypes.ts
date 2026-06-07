import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  FileSignature,
  FileText,
  Leaf,
  Send,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { RecordIconIntent } from "./recordRowIcons";

export type ActivityEventVisual = {
  icon: LucideIcon;
  dotClass: string;
  borderClass: string;
  iconIntent: RecordIconIntent;
};

export function getStageChangeEventVisual(): ActivityEventVisual {
  return {
    icon: ArrowRightLeft,
    dotClass: "bg-blue",
    borderClass: "border-blue-200 dark:border-blue-600",
    iconIntent: "blue",
  };
}

export function getOfferActivityEventVisual(activityType: string): ActivityEventVisual {
  const t = activityType.toLowerCase();

  if (t.includes("quote")) {
    return {
      icon: Send,
      dotClass: "bg-amber",
      borderClass: "border-amber-200 dark:border-amber-700",
      iconIntent: "amber",
    };
  }
  if (t === "comparison") {
    return {
      icon: BarChart3,
      dotClass: "bg-blue",
      borderClass: "border-blue-200 dark:border-blue-600",
      iconIntent: "blue",
    };
  }
  if (t.includes("engagement")) {
    return {
      icon: ClipboardList,
      dotClass: "bg-green",
      borderClass: "border-green-light-3 dark:border-green-dark",
      iconIntent: "green",
    };
  }
  if (t.includes("base2")) {
    return {
      icon: FileText,
      dotClass: "bg-violet-500",
      borderClass: "border-violet-200 dark:border-violet-700",
      iconIntent: "purple",
    };
  }
  if (t.includes("contract") || t === "loa" || t === "service_agreement") {
    return {
      icon: FileSignature,
      dotClass: "bg-green",
      borderClass: "border-green-light-3 dark:border-green-dark",
      iconIntent: "green",
    };
  }
  if (t.includes("ghg")) {
    return {
      icon: Leaf,
      dotClass: "bg-green",
      borderClass: "border-green-light-3 dark:border-green-dark",
      iconIntent: "green",
    };
  }
  if (t.includes("upload") || t === "manual_document" || t === "member_document_upload") {
    return {
      icon: Upload,
      dotClass: "bg-gray-4 dark:bg-dark-3",
      borderClass: "border-gray-200 dark:border-gray-600",
      iconIntent: "neutral",
    };
  }

  return {
    icon: FileText,
    dotClass: "bg-gray-4 dark:bg-dark-3",
    borderClass: "border-gray-200 dark:border-gray-600",
    iconIntent: "neutral",
  };
}
