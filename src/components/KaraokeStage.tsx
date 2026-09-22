import { useEffect, useRef, useState } from 'react';
import { 
  SkipForward, 
  RotateCcw, 
  Award, 
  Mic, 
  MicOff, 
  Camera,
  CameraOff,
  ExternalLink, 
  Music, 
  PlusCircle, 
  BookOpen,
  Smartphone,
  Sparkles,
  Maximize,
  Minimize
} from 'lucide-react';
import { QueueItem, Song } from '../types';
import { audioService } from '../utils/audioSynth';
import { buildYouTubeWatchUrl } from '../utils/youtube';
import { SingerCamera } from './SingerCamera';

interface LiveNotice {
  id: string;
  text: string;
  subtext?: string;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  from: string;
  leftPercent: number;
}

interface KaraokeStageProps {
  currentItem: QueueItem | null;
  nextItem?: QueueItem | null;
  queueCount?: number;
  onFinishAndScore: () => void;
  onSkipSong: () => void;
  onRestartSong: () => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
  onOpenSongbook: () => void;
  onOpenAddModal: () => void;
  onOpenConnectModal?: () => void;
  onQuickStartSong: (song: Song) => void;
  recommendedStarters: Song[];
  compactMode?: boolean;
  liveNotices?: LiveNotice[];
  floatingReactions?: FloatingReaction[];
}

export function KaraokeStage({
  currentItem,
  nextItem,
  queueCount = 0,
  onFinishAndScore,
  onSkipSong,
  onRestartSong,
  isMicActive,
  onToggleMic,
  isCameraActive,
  onToggleCamera,
  onOpenSongbook,
  onOpenAddModal,
  onOpenConnectModal,
  onQuickStartSong,
  recommendedStarters,
  compactMode = false,
  liveNotices = [],
  floatingReactions = [],
}: KaraokeStageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [pitchHz, setPitchHz] = useState<number | null>(null);
  const [visBars, setVisBars] = useState<number[]>(new Array(16).fill(5));
  const [keyOffset, setKeyOffset] = useState<number>(0);
  const [internalCamera, setInternalCamera] = useState<boolean>(false);

  // Fullscreen Stage Handling (ensures camera and overlays stay visible)
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFsControls, setShowFsControls] = useState<boolean>(true);
  const fsControlTimeoutRef = useRef<number | null>(null);

  // Sync fullscreen state with browser Fullscreen API
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      if (fsControlTimeoutRef.current) clearTimeout(fsControlTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcut 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    const elem = stageViewportRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  const handleViewportMouseMove = () => {
    if (isFullscreen) {
      setShowFsControls(true);
      if (fsControlTimeoutRef.current) clearTimeout(fsControlTimeoutRef.current);
      fsControlTimeoutRef.current = window.setTimeout(() => {
        setShowFsControls(false);
      }, 3500);
    }
  };

  const cameraActive = isCameraActive !== undefined ? isCameraActive : internalCamera;
  const toggleCamera = onToggleCamera || (() => setInternalCamera((p) => !p));

  // Listen to YouTube postMessage events for video ending
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        // YouTube Player API onStateChange: 0 = ENDED
        if (data.event === 'onStateChange' && data.info === 0) {
          onFinishAndScore();
          return;
        }

        // YouTube infoDelivery playerState: 0 = ENDED
        if (
          data.event === 'infoDelivery' &&
          data.info &&
          typeof data.info === 'object' &&
          data.info.playerState === 0
        ) {
          onFinishAndScore();
          return;
        }
      } catch {
        // Non-JSON message
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onFinishAndScore]);

  // YouTube API Handshake: periodically ensure the iframe is listening for onStateChange
  useEffect(() => {
    if (!currentItem) return;

    const interval = setInterval(() => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'listening', id: 1 }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'addEventListener',
              args: ['onStateChange'],
            }),
            '*'
          );
        }
      } catch {
        // Safe ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentItem, keyOffset]);

  // Real-time microphone audio visualizer loop
  useEffect(() => {
    let animId: number;

    const updateLoop = () => {
      if (isMicActive) {
        const sample = audioService.sampleMic();
        setMicVolume(sample.volumePercent);
        setPitchHz(sample.estimatedPitchHz);

        const bars: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = sample.frequencyData[i] || 0;
          bars.push(Math.min(100, Math.max(8, Math.round((val / 255) * 100))));
        }
        setVisBars(bars);
      } else {
        setMicVolume(0);
        setPitchHz(null);
        setVisBars(new Array(16).fill(6));
      }
      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [isMicActive]);

  const handleRestart = () => {
    setKeyOffset((prev) => prev + 1);
    audioService.resetSongStats();
    onRestartSong();
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative transition-colors ${
      compactMode ? 'text-xs' : ''
    }`}>
      {/* Live Remote Device Notifications Overlay (Top Right of Stage) */}
      <div className="absolute top-16 right-4 z-30 flex flex-col gap-2 pointer-events-none max-w-sm">
        {liveNotices.map((notice) => (
          <div
            key={notice.id}
            className="p-3 rounded-xl bg-white/95 backdrop-blur-md border border-sky-300 text-slate-800 shadow-lg text-xs flex items-center gap-2.5 animate-bounce shadow-sky-500/10"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{notice.text}</div>
              {notice.subtext && <div className="text-[11px] text-sky-700">{notice.subtext}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Reaction Bubbles (Crowd cheers from mobile remotes) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-12 flex flex-col items-center animate-pulse duration-1000 transition-all"
            style={{
              left: `${r.leftPercent}%`,
              animation: 'floatUp 2.8s ease-out forwards',
            }}
          >
            <div className="text-3xl filter drop-shadow-md">{r.emoji}</div>
            <span className="text-[10px] font-bold bg-white/90 text-slate-800 px-1.5 py-0.2 rounded-full border border-sky-200 shadow-xs">
              {r.from}
            </span>
          </div>
        ))}
      </div>

      {/* Top Singer Spotlight Header */}
      {currentItem && (
        <div className={`bg-sky-50/70 dark:bg-slate-800/90 border-b border-sky-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 ${
          compactMode ? 'px-3 py-2' : 'px-4 py-3'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`rounded-full bg-sky-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
              compactMode ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
            }`}>
              {currentItem.singerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Singing:
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-['Outfit'] truncate">
                  {currentItem.singerName}
                </span>
              </div>
              <h2 className={`font-semibold text-slate-800 dark:text-slate-200 truncate ${
                compactMode ? 'text-xs max-w-[200px] sm:max-w-xs' : 'text-sm md:text-base'
              }`}>
                {currentItem.song.title} <span className="text-slate-500 dark:text-slate-400 font-normal">({currentItem.song.artist})</span>
              </h2>
            </div>
          </div>

          {/* Up Next Preview Banner (if queue has songs) */}
          {nextItem && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Next In Queue:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {nextItem.singerName} ({nextItem.song.title})
              </span>
            </div>
          )}

          {/* Quick Stage Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Singer Face Cam Toggle Button */}
            <button
              id="stage-camera-toggle-btn"
              onClick={toggleCamera}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-xs ring-2 ring-rose-200 dark:ring-rose-900'
                  : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title={cameraActive ? 'Turn Off Singer Camera' : 'Enable Singer Face Cam (View face on stage)'}
            >
              {cameraActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cam On</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Singer Cam</span>
                  <span className="sm:hidden">Cam</span>
                </>
              )}
            </button>

            {/* Stage Fullscreen Button (ensures camera is always displayed) */}
            <button
              id="stage-fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Full Screen Stage with Camera (Shortcut: F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="hidden sm:inline">Exit Full</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>

            {onOpenConnectModal && (
              <button
                onClick={onOpenConnectModal}
                className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-750 text-sky-700 dark:text-sky-300 text-xs font-semibold border border-sky-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                title="Connect phone to queue songs while singing"
              >
                <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Add via Phone</span>
              </button>
            )}
            <button
              id="restart-song-btn"
              onClick={handleRestart}
              className="p-1.5 rounded-lg bg-white hover:bg-sky-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Restart Song"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              id="skip-song-btn"
              onClick={onSkipSong}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              title={nextItem ? `Play next song: ${nextItem.singerName} - ${nextItem.song.title}` : 'Skip Song'}
            >
              <SkipForward className="w-3.5 h-3.5 text-sky-600" />
              <span>{nextItem ? `Next (${nextItem.singerName})` : 'Next Song'}</span>
            </button>
            <button
              id="finish-score-btn"
              onClick={onFinishAndScore}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Finish Singing & Reveal Score"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{compactMode ? 'Score Song' : 'Finish & Score'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Stage Viewport */}
      <div 
        ref={stageViewportRef}
        onMouseMove={handleViewportMouseMove}
        className={`relative w-full bg-slate-950 flex items-center justify-center overflow-hidden group transition-all ${
          isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' : 'aspect-video'
        }`}
      >
        {/* Fullscreen Floating Stage HUD Overlay (appears on mouse move in fullscreen) */}
        {isFullscreen && (
          <div
            className={`absolute top-0 inset-x-0 z-50 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none flex items-center justify-between ${
              showFsControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-3 pointer-events-auto">
              {currentItem && (
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-bold text-sky-400 text-xs sm:text-sm">{currentItem.singerName}</span>
                  <span className="text-white/40">•</span>
                  <span className="font-semibold text-slate-200 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs">{currentItem.song.title}</span>
                </div>
              )}
              <div className="hidden md:flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                <span>Camera movable with mouse</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Singer Cam toggle */}
              <button
                onClick={toggleCamera}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  cameraActive 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/50' 
                    : 'bg-black/60 hover:bg-black/80 text-slate-200 border border-white/20'
                }`}
                title="Toggle Singer Face Camera"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Cam On' : 'Turn On Cam'}</span>
              </button>

              {/* Mic toggle */}
              <button
                onClick={onToggleMic}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  isMicActive 
                    ? 'bg-sky-600 hover:bg-sky-500 text-white' 
                    : 'bg-black/60 hover:bg-black/80 text-slate-200 border border-white/20'
                }`}
                title="Toggle Microphone"
              >
                {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>{isMicActive ? `${micVolume}%` : 'Mic Off'}</span>
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-colors cursor-pointer"
                title="Restart Song"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Skip */}
              <button
                onClick={onSkipSong}
                className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-colors cursor-pointer"
                title="Skip Song"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Finish & Score */}
              <button
                onClick={onFinishAndScore}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                title="Finish and reveal score"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Score Song</span>
              </button>

              {/* Exit Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/20 transition-colors cursor-pointer"
                title="Exit Full Screen (Esc / F)"
              >
                <Minimize className="w-3.5 h-3.5" />
                <span>Exit Full</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Full Screen Button (top-right hover overlay on standard stage) */}
        {!isFullscreen && currentItem && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/75 hover:bg-black/90 text-white border border-white/20 hover:border-sky-400 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer"
            title="Full Screen Stage with Camera (Shortcut: F)"
          >
            <Maximize className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden sm:inline">Full Screen (with Camera)</span>
          </button>
        )}

        {/* Singer Face Camera Mirror PIP */}
        <SingerCamera
          isActive={cameraActive}
          onClose={toggleCamera}
          singerName={currentItem?.singerName || 'Singer Cam'}
          initialPosition="top-left"
        />

        {currentItem ? (
          <iframe
            key={`${currentItem.id}-${keyOffset}`}
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${currentItem.song.youtubeId}?autoplay=1&enablejsapi=1&fs=0&origin=${encodeURIComponent(
              typeof window !== 'undefined' ? window.location.origin : '*'
            )}&rel=0&modestbranding=1`}
            title={`${currentItem.song.title} Karaoke`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : (
          /* Empty Stage / Lounge Welcome Screen */
          <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center mb-4 text-sky-600">
              <Music className="w-8 h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 font-['Outfit']">
              The Stage is Ready
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Add any song by pasting a YouTube link, picking from our curated songbook, or scan with your phone!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {onOpenConnectModal && (
                <button
                  id="empty-connect-phone"
                  onClick={onOpenConnectModal}
                  className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs md:text-sm font-semibold flex items-center gap-2 border border-sky-200 transition-all cursor-pointer shadow-2xs"
                >
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  <span>Connect Phone (QR Code)</span>
                </button>
              )}
              <button
                id="empty-open-songbook"
                onClick={onOpenSongbook}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs md:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Songbook</span>
              </button>
              <button
                id="empty-paste-link"
                onClick={onOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-sky-600" />
                <span>Paste YouTube Link</span>
              </button>
            </div>

            {/* Quick Starters */}
            {recommendedStarters.length > 0 && (
              <div className="w-full border-t border-sky-100 pt-4">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2.5 block">
                  Quick Starters (1-Click Sing):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {recommendedStarters.slice(0, 3).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => onQuickStartSong(song)}
                      className="p-2.5 rounded-xl bg-sky-50/50 hover:bg-sky-100/70 border border-sky-100 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-700 truncate">
                        {song.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {song.artist}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Audio Visualizer & Stage Footer */}
      <div className="p-3 bg-sky-50/40 dark:bg-slate-850 border-t border-sky-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Real-time Vocal Pitch & Energy Visualizer */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMic}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isMicActive 
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800' 
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
              title={isMicActive ? 'Click to Mute Mic' : 'Click to Enable Mic'}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isMicActive ? 'Mic:' : 'Mic Off'}
            </span>
          </div>

          {/* Singer Face Cam Footer Toggle */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-sky-200/60 dark:border-slate-700">
            <button
              id="stage-footer-camera-btn"
              onClick={toggleCamera}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                cameraActive 
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800' 
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
              title={cameraActive ? 'Turn Off Singer Camera' : 'Enable Singer Face Camera (View face)'}
            >
              {cameraActive ? <Camera className="w-4 h-4 text-rose-600 dark:text-rose-400" /> : <CameraOff className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">
              {cameraActive ? 'Cam On' : 'Cam Off'}
            </span>
          </div>

          {/* Fullscreen Footer Toggle */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-sky-200/60 dark:border-slate-700">
            <button
              id="stage-footer-fullscreen-btn"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Full Screen Stage with Camera (Shortcut: F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <Maximize className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">
              {isFullscreen ? 'Exit Full' : 'Full Screen'}
            </span>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="flex items-end gap-1 h-6 w-36 sm:w-48 px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800">
            {visBars.map((heightPercent, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-t-xs transition-all duration-75 ${
                  isMicActive
                    ? 'bg-sky-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            ))}
          </div>

          {/* Volume & Pitch feedback */}
          {isMicActive && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                micVolume > 20 ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'text-slate-400'
              }`}>
                {micVolume}% VOL
              </span>
              {pitchHz && (
                <span className="text-sky-700 text-[11px] hidden md:inline">
                  ~{pitchHz}Hz
                </span>
              )}
            </div>
          )}
        </div>

        {/* Source link & Song Info */}
        {currentItem && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden md:inline text-slate-500">
              Genre: {currentItem.song.category}
            </span>
            <a
              href={buildYouTubeWatchUrl(currentItem.song.youtubeId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-600 transition-colors"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
