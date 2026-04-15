
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    // Carrega o tema salvo no localStorage assim que o componente monta
    const savedTheme = localStorage.getItem("rappi_commander_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Se não tiver nada salvo, verifica a preferência do sistema
      const isDark = document.documentElement.classList.contains("dark") || 
                     window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = isDark ? "dark" : "light";
      setTheme(initialTheme);
      if (initialTheme === "dark") document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("rappi_commander_theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      className="rounded-full h-9 w-9 hover:bg-primary/10 transition-colors"
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-blue-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
