import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

// Inline script injected before paint to prevent a theme flash (FOUC).
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('we.theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);

    // Follow system changes only when the user hasn't set an explicit choice.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e) => {
      if (!localStorage.getItem("we.theme")) {
        const next = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        setTheme(next);
      }
    };
    mq.addEventListener?.("change", onSystem);
    return () => mq.removeEventListener?.("change", onSystem);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("we.theme", next);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
