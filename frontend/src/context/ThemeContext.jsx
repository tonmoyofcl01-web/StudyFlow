import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'studyflow-theme';
const THEME_MIGRATION_KEY = 'studyflow-theme-v2-initialized';

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const migrated = localStorage.getItem(THEME_MIGRATION_KEY);

    // The previous implementation always stored "light" on first load,
    // even when the interface was actually dark because of the OS setting.
    // On the first upgraded load, follow the OS preference once; thereafter
    // preserve the user's explicit in-app choice.
    if (migrated === 'true' && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(THEME_MIGRATION_KEY, 'true');
    } catch {
      // The theme still works for this page session if storage is unavailable.
    }
  }, [theme]);

  const toggle = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
