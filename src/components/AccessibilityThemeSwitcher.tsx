import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type ThemeMode = "default" | "protanopia" | "deuteranopia" | "tritanopia" | "high-contrast";

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: "default", label: "Default Theme" },
  { id: "protanopia", label: "Protanopia (Red-Blind)" },
  { id: "deuteranopia", label: "Deuteranopia (Green-Blind)" },
  { id: "tritanopia", label: "Tritanopia (Blue-Blind)" },
  { id: "high-contrast", label: "High Contrast" },
];

export function AccessibilityThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeMode>("default");

  useEffect(() => {
    // On mount, read from localStorage or HTML data-theme
    const stored = localStorage.getItem("khal.accessibility.theme") as ThemeMode | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    if (newTheme === "default") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("khal.accessibility.theme");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("khal.accessibility.theme", newTheme);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Accessibility Color Settings"
          title="Accessibility Color Settings"
          className="rounded-md border border-border p-2 text-foreground/80 hover:bg-accent hover:text-accent-foreground transition"
        >
          <Palette className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Accessibility Colors</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => handleThemeChange(t.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            {t.label}
            {theme === t.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
