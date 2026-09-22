import React, { createContext, useContext, useEffect, useState } from 'react';
import { BackgroundDesignId, BackgroundDesignOption, ThemeMode } from '../types';
import {
  applyThemeModeToDocument,
  BACKGROUND_DESIGNS,
  getDesignById,
  getInitialBackgroundDesign,
  getInitialThemeMode,
  saveBackgroundDesignPreference,
} from '../utils/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  designId: BackgroundDesignId;
  activeDesign: BackgroundDesignOption;
  toggleThemeMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setBackgroundDesign: (designId: BackgroundDesignId) => void;
  designs: BackgroundDesignOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialThemeMode());
  const [designId, setDesignIdState] = useState<BackgroundDesignId>(() =>
    getInitialBackgroundDesign(getInitialThemeMode())
  );

  // Apply on mount and state change
  useEffect(() => {
    applyThemeModeToDocument(mode);
  }, [mode]);

  const setThemeMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    applyThemeModeToDocument(newMode);

    // If current design doesn't match new mode, pick standard default for that mode
    const currentDesign = getDesignById(designId);
    if (currentDesign.mode !== newMode) {
      const fallbackDesign = newMode === 'dark' ? 'dark-neon' : 'light-sky';
      setDesignIdState(fallbackDesign);
      saveBackgroundDesignPreference(fallbackDesign);
    }
  };

  const toggleThemeMode = () => {
    const nextMode = mode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
  };

  const setBackgroundDesign = (newDesignId: BackgroundDesignId) => {
    const design = getDesignById(newDesignId);
    setDesignIdState(newDesignId);
    saveBackgroundDesignPreference(newDesignId);

    // If design has different mode, also update mode
    if (design.mode !== mode) {
      setModeState(design.mode);
      applyThemeModeToDocument(design.mode);
    }
  };

  const activeDesign = getDesignById(designId);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        designId,
        activeDesign,
        toggleThemeMode,
        setThemeMode,
        setBackgroundDesign,
        designs: BACKGROUND_DESIGNS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
