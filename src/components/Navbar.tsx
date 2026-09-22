import { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Camera,
  CameraOff,
  PlusCircle, 
  BookOpen, 
  Trophy, 
  Settings2,
  Tv,
  Volume2,
  Smartphone,
  Radio,
  Sun,
  Moon,
  Palette,
  Search
} from 'lucide-react';
import { audioService } from '../utils/audioSynth';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  queueCount: number;
  completedCount: number;
  topScoreSinger: { name: string; score: number } | null;
  onOpenSongbook: () => void;
  onOpenAddModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenConnectModal: () => void;
  onOpenThemeModal?: () => void;
  connectedClientsCount: number;
  roomId: string;
  isMicActive: boolean;
  onToggleMic: () => void;
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
  currentView: 'stage' | 'admin' | 'remote';
  onSelectView: (view: 'stage' | 'admin' | 'remote') => void;
}

export function Navbar({
  queueCount: _queueCount,
  completedCount,
  onOpenSongbook,
  onOpenAddModal,
  onOpenLeaderboard,
  onOpenConnectModal,
  onOpenThemeModal,
  connectedClientsCount,
  roomId,
  isMicActive,
  onToggleMic,
  isCameraActive = false,
  onToggleCamera,
  currentView,
  onSelectView,
}: NavbarProps) {
  const [fxActive, setFxActive] = useState<string | null>(null);
  const { mode, activeDesign, toggleThemeMode } = useTheme();

  const triggerFx = (name: string, fn: () => void) => {
    setFxActive(name);
    fn();
    setTimeout(() => setFxActive(null), 800);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-sky-100 dark:border-slate-800 px-4 py-3 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none" 
            onClick={() => onSelectView('stage')}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white font-['Outfit']">
                  Karaoke<span className="text-sky-600 dark:text-sky-400">Stage</span>
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Room: {roomId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Queue songs, connect phones to add tracks live, and score performances
              </p>
            </div>
          </div>

          {/* Mobile Actions Shortcut */}
          <div className="flex items-center gap-1.5 md:hidden">
            {/* Quick Mobile Theme Toggle Button */}
            <button
              id="mobile-theme-toggle-btn"
              onClick={toggleThemeMode}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                mode === 'dark'
                  ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
              }`}
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {mode === 'dark' ? (
                <Sun className="w-4 h-4 fill-amber-300/30 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-sky-600" />
              )}
            </button>

            {onOpenThemeModal && (
              <button
                id="mobile-theme-designs-btn"
                onClick={onOpenThemeModal}
                className="p-2 rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-slate-700"
                title="Choose Background Design"
              >
                <Palette className="w-4 h-4" />
              </button>
            )}

            {onToggleCamera && (
              <button
                id="mobile-camera-toggle-btn"
                onClick={onToggleCamera}
                className={`p-2 rounded-lg border transition-all ${
                  isCameraActive
                    ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sky-50'
                }`}
                title={isCameraActive ? 'Turn Off Singer Camera' : 'Enable Singer Face Camera'}
              >
                {isCameraActive ? <Camera className="w-4 h-4 text-rose-600" /> : <CameraOff className="w-4 h-4 text-slate-500" />}
              </button>
            )}
            <button
              id="mobile-connect-phone-btn"
              onClick={onOpenConnectModal}
              className="p-2 rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-slate-700"
              title="Connect Other Devices"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              id="mobile-admin-toggle"
              onClick={() => onSelectView(currentView === 'admin' ? 'stage' : 'admin')}
              className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                currentView === 'admin'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sky-50'
              }`}
              title="Admin Console"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              id="mobile-add-btn"
              onClick={onOpenAddModal}
              className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-xs"
              title="Add YouTube Song"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher: Stage vs KJ Admin Page vs Mobile Remote */}
        <div className="hidden sm:flex items-center bg-sky-50/80 dark:bg-slate-800/80 p-1 rounded-xl border border-sky-100 dark:border-slate-700">
          <button
            id="nav-stage-tab"
            onClick={() => onSelectView('stage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'stage'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-sky-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Stage Screen</span>
          </button>
          <button
            id="nav-admin-tab"
            onClick={() => onSelectView('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-sky-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </button>
          <button
            id="nav-remote-tab"
            onClick={() => onSelectView('remote')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'remote'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-sky-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Singer Remote</span>
          </button>
        </div>

        {/* Quick Party Sound FX Toolbar */}
        <div className="hidden xl:flex items-center gap-1 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 pr-1.5 border-r border-slate-100 dark:border-slate-800">
            <Volume2 className="w-3.5 h-3.5 text-sky-500" />
            SFX
          </span>
          <button
            id="sfx-cheer"
            onClick={() => triggerFx('cheer', () => audioService.playApplause())}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              fxActive === 'cheer'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            👏 Cheer
          </button>
          <button
            id="sfx-fanfare"
            onClick={() => triggerFx('fanfare', () => audioService.playFanfare())}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              fxActive === 'fanfare'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            🎺 Fanfare
          </button>
          <button
            id="sfx-airhorn"
            onClick={() => triggerFx('airhorn', () => audioService.playAirhorn())}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              fxActive === 'airhorn'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            📢 Airhorn
          </button>
          <button
            id="sfx-drumroll"
            onClick={() => triggerFx('drumroll', () => audioService.playDrumroll())}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              fxActive === 'drumroll'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            🥁 Drumroll
          </button>
          <button
            id="sfx-videoke-score"
            onClick={() => triggerFx('score', () => {
              audioService.playDrumroll();
              setTimeout(() => {
                audioService.playScoreTick(0.8);
                audioService.playVideokeScoreImpact(98);
                setTimeout(() => audioService.playVideokeFanfare(98), 260);
                setTimeout(() => audioService.playCheeringAndApplause(3.5), 650);
              }, 500);
            })}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              fxActive === 'score'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
            title="Play Videoke Score & Applause Sound Effect"
          >
            🎯 Score
          </button>
        </div>

        {/* Main Nav Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Connect Phone QR Code Button */}
          <button
            id="connect-phone-nav-btn"
            onClick={onOpenConnectModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-slate-700 transition-all shadow-2xs cursor-pointer"
            title="Connect smartphones to queue songs"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Connect Phone</span>
            <span className="sm:hidden">Remote</span>
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-700 font-mono">
              <Radio className="w-2.5 h-2.5 text-emerald-500" />
              {connectedClientsCount}
            </span>
          </button>

          {/* Theme Mode Toggle Button (Light / Dark) */}
          <button
            id="theme-mode-toggle-btn"
            onClick={toggleThemeMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              mode === 'dark'
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-200'
            }`}
            title={`Switch to ${mode === 'dark' ? 'Light Theme' : 'Dark Theme'}`}
          >
            {mode === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 fill-amber-300/30 text-amber-300" />
                <span className="font-semibold hidden lg:inline">Light</span>
                <span className="lg:hidden">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold hidden lg:inline">Dark</span>
                <span className="lg:hidden">Dark</span>
              </>
            )}
          </button>

          {/* Theme Background Designs Choice Button */}
          {onOpenThemeModal && (
            <button
              id="theme-designs-choice-btn"
              onClick={onOpenThemeModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer group"
              title="Choose Background Design Theme"
            >
              <Palette className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-12 transition-transform" />
              <span className="hidden xl:inline">{activeDesign.name}</span>
              <span className="xl:hidden">Designs</span>
            </button>
          )}

          {/* Live Mic Monitor Toggle */}
          <button
            id="mic-toggle-btn"
            onClick={onToggleMic}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              isMicActive
                ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700'
            }`}
          >
            {isMicActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="font-semibold">Mic Active</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Enable Mic</span>
              </>
            )}
          </button>

          {/* Singer Face Camera Toggle */}
          {onToggleCamera && (
            <button
              id="desktop-camera-toggle-btn"
              onClick={onToggleCamera}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isCameraActive
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700'
              }`}
              title={isCameraActive ? 'Turn Off Singer Camera' : 'Enable Singer Face Camera (View face on stage)'}
            >
              {isCameraActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <Camera className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-semibold">Singer Cam On</span>
                </>
              ) : (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Singer Cam</span>
                </>
              )}
            </button>
          )}

          {/* Songbook Button */}
          <button
            id="open-songbook-btn"
            onClick={onOpenSongbook}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Songbook</span>
          </button>

          {/* Leaderboard Button */}
          <button
            id="open-leaderboard-btn"
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs relative cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Scores</span>
            {completedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                {completedCount}
              </span>
            )}
          </button>

          {/* Search & Add YouTube Song Button */}
          <button
            id="open-add-song-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/20 transition-all active:scale-95 cursor-pointer"
            title="Search YouTube & Auto-Suggest (Queue Song)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Add Song</span>
          </button>
        </div>
      </div>
    </header>
  );
}
