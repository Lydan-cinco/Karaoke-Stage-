import { BackgroundDesignId, BackgroundDesignOption, ThemeMode } from '../types';

export const BACKGROUND_DESIGNS: BackgroundDesignOption[] = [
  {
    id: 'light-sky',
    name: 'Daybreak Sky',
    mode: 'light',
    tagline: 'Crisp morning lounge with airy sky blue highlights',
    previewGradient: 'from-sky-100 via-white to-sky-200',
    swatchColors: ['#0284c7', '#e0f2fe', '#ffffff'],
    bgClasses: 'bg-gradient-to-b from-sky-50/80 via-white to-sky-50/50 text-slate-800',
    cardClasses: 'bg-white/95 border-sky-100 shadow-sm',
    accentTextClass: 'text-sky-600',
  },
  {
    id: 'light-warm',
    name: 'Sunset Velvet',
    mode: 'light',
    tagline: 'Warm golden hour café with peach & amber tones',
    previewGradient: 'from-amber-100 via-orange-50 to-rose-100',
    swatchColors: ['#f59e0b', '#fed7aa', '#fff7ed'],
    bgClasses: 'bg-gradient-to-b from-amber-50/70 via-orange-50/30 to-rose-50/40 text-stone-800',
    cardClasses: 'bg-white/95 border-amber-100 shadow-sm',
    accentTextClass: 'text-amber-600',
  },
  {
    id: 'dark-neon',
    name: 'Midnight Club',
    mode: 'dark',
    tagline: 'Electric karaoke stage with glowing cyan beams',
    previewGradient: 'from-slate-950 via-slate-900 to-sky-950',
    swatchColors: ['#38bdf8', '#0f172a', '#0369a1'],
    bgClasses: 'bg-gradient-to-b from-slate-950 via-[#0b1220] to-[#040814] text-slate-100',
    cardClasses: 'bg-slate-900/90 border-slate-800 shadow-lg shadow-black/40',
    accentTextClass: 'text-sky-400',
  },
  {
    id: 'dark-purple',
    name: 'Cyber Stage',
    mode: 'dark',
    tagline: 'Tokyo neon karaoke lounge with laser magenta vibes',
    previewGradient: 'from-purple-950 via-slate-950 to-fuchsia-950',
    swatchColors: ['#c084fc', '#1e1035', '#ec4899'],
    bgClasses: 'bg-gradient-to-b from-[#120726] via-[#170930] to-[#0a0314] text-purple-100',
    cardClasses: 'bg-[#1b1030]/90 border-purple-900/50 shadow-lg shadow-black/40',
    accentTextClass: 'text-fuchsia-400',
  },
  {
    id: 'dark-charcoal',
    name: 'Studio Carbon',
    mode: 'dark',
    tagline: 'Sleek sound booth with matte graphite and amber meters',
    previewGradient: 'from-zinc-950 via-zinc-900 to-neutral-950',
    swatchColors: ['#e4e4e7', '#18181b', '#f59e0b'],
    bgClasses: 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100',
    cardClasses: 'bg-zinc-900/90 border-zinc-800 shadow-lg shadow-black/40',
    accentTextClass: 'text-amber-400',
  },
  {
    id: 'dark-galaxy',
    name: 'Deep Galaxy',
    mode: 'dark',
    tagline: 'Cosmic celestial arena with starry sapphire aura',
    previewGradient: 'from-indigo-950 via-slate-950 to-blue-950',
    swatchColors: ['#818cf8', '#0c122c', '#2563eb'],
    bgClasses: 'bg-gradient-to-b from-[#060919] via-[#09112e] to-[#040612] text-blue-100',
    cardClasses: 'bg-[#0e1633]/90 border-indigo-900/50 shadow-lg shadow-black/40',
    accentTextClass: 'text-indigo-400',
  },
];

const THEME_STORAGE_KEY = 'karaoke_theme_pref_mode';
const DESIGN_STORAGE_KEY = 'karaoke_theme_pref_design';

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // LocalStorage fallback
  }
  return 'light';
}

export function getInitialBackgroundDesign(mode: ThemeMode): BackgroundDesignId {
  if (typeof window === 'undefined') return mode === 'dark' ? 'dark-neon' : 'light-sky';
  try {
    const saved = localStorage.getItem(DESIGN_STORAGE_KEY) as BackgroundDesignId | null;
    if (saved) {
      const found = BACKGROUND_DESIGNS.find((d) => d.id === saved);
      if (found) {
        // If mode matches saved design's mode, keep it
        if (found.mode === mode) return saved;
      }
    }
  } catch {
    // LocalStorage fallback
  }
  return mode === 'dark' ? 'dark-neon' : 'light-sky';
}

export function applyThemeModeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {}
}

export function saveBackgroundDesignPreference(designId: BackgroundDesignId) {
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, designId);
  } catch {}
}

export function getDesignById(id: BackgroundDesignId): BackgroundDesignOption {
  return BACKGROUND_DESIGNS.find((d) => d.id === id) || BACKGROUND_DESIGNS[0];
}
