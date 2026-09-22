import React, { useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  X, 
  Palette,
  Eye
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BackgroundDesignId, ThemeMode } from '../types';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  const { mode, designId, setThemeMode, setBackgroundDesign, designs } = useTheme();
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const lightDesigns = designs.filter((d) => d.mode === 'light');
  const darkDesigns = designs.filter((d) => d.mode === 'dark');

  const handleSelectDesign = (id: BackgroundDesignId) => {
    setBackgroundDesign(id);
  };

  const handleSelectMode = (newMode: ThemeMode) => {
    setThemeMode(newMode);
  };

  return (
    <div
      id="theme-selector-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        id="theme-selector-modal"
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Theme & Background Designs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between Light and Dark mode, or pick a custom background ambiance
              </p>
            </div>
          </div>
          <button
            id="close-theme-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Light / Dark Mode Segmented Switch */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Primary Theme Mode</span>
              <span className="text-[11px] font-normal text-slate-400">
                Currently: <strong className="capitalize text-sky-600 dark:text-sky-400">{mode} Mode</strong>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                id="select-mode-light-btn"
                onClick={() => handleSelectMode('light')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'light'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className={`w-4 h-4 ${mode === 'light' ? 'text-amber-500 fill-amber-400/30' : ''}`} />
                <span>Light Theme</span>
                {mode === 'light' && <Check className="w-3.5 h-3.5 text-sky-600 ml-1" />}
              </button>

              <button
                id="select-mode-dark-btn"
                onClick={() => handleSelectMode('dark')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-700 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className={`w-4 h-4 ${mode === 'dark' ? 'text-sky-400 fill-sky-400/30' : ''}`} />
                <span>Dark Theme</span>
                {mode === 'dark' && <Check className="w-3.5 h-3.5 text-sky-400 ml-1" />}
              </button>
            </div>
          </div>

          {/* Dark Background Designs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dark Stage & Lounge Backgrounds
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Atmospheric Night Vibe</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {darkDesigns.map((design) => {
                const isSelected = designId === design.id;
                return (
                  <button
                    key={design.id}
                    id={`theme-card-${design.id}`}
                    onClick={() => handleSelectDesign(design.id)}
                    className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-400 shadow-md ring-2 ring-sky-500/20'
                        : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Name and Colors */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {design.name}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 rounded-full bg-sky-500 text-white">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Swatch dots */}
                      <div className="flex items-center gap-1">
                        {design.swatchColors.map((color, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Gradient preview bar */}
                    <div
                      className={`h-2.5 w-full rounded-md bg-gradient-to-r ${design.previewGradient} border border-white/10`}
                    />

                    {/* Tagline */}
                    <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                      {design.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Light Background Designs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Light Lounge Backgrounds
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Crisp Daylight Vibe</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {lightDesigns.map((design) => {
                const isSelected = designId === design.id;
                return (
                  <button
                    key={design.id}
                    id={`theme-card-${design.id}`}
                    onClick={() => handleSelectDesign(design.id)}
                    className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-slate-800/90 border-sky-400 shadow-md ring-2 ring-sky-500/20'
                        : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/70 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Name and Colors */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {design.name}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 rounded-full bg-sky-600 text-white">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Swatch dots */}
                      <div className="flex items-center gap-1">
                        {design.swatchColors.map((color, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-white/20 shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Gradient preview bar */}
                    <div
                      className={`h-2.5 w-full rounded-md bg-gradient-to-r ${design.previewGradient} border border-slate-200 dark:border-white/10`}
                    />

                    {/* Tagline */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                      {design.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Theme auto-saves to your browser</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
