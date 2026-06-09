import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Moon, Sun } from "./icons";

export function ThemeToggleSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  if (!resolvedTheme) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stroke text-gray-600 transition-colors hover:bg-gray/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-dark-3 dark:text-gray-400 dark:hover:bg-dark-3 dark:hover:text-white"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
