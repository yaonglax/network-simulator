import { create } from "zustand";

// Определяем интерфейс для состояния
interface ThemeState {
  theme: string;
  setTheme: (newTheme: string) => void;
  toggleTheme: () => void;
}

const useThemeStore = create<ThemeState>((set) => {
  // Установка начального значения
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  return {
    theme: savedTheme,
    setTheme: (newTheme: string) =>
      set(() => {
        if (typeof window !== "undefined") {
          document.documentElement.setAttribute("data-theme", newTheme);
        }
        localStorage.setItem("theme", newTheme);
        return { theme: newTheme };
      }),
    toggleTheme: () =>
      set((state) => {
        const newTheme = state.theme === "dark" ? "light" : "dark";
        if (typeof window !== "undefined") {
          document.documentElement.setAttribute("data-theme", newTheme);
        }
        localStorage.setItem("theme", newTheme);
        return { theme: newTheme };
      }),
  };
});

export default useThemeStore;
