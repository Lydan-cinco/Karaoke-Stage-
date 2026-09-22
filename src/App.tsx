/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { KaraokeStage } from './components/KaraokeStage';
import { SongQueue } from './components/SongQueue';
import { SongbookModal } from './components/SongbookModal';
import { AddSongModal } from './components/AddSongModal';
import { ScoringModal } from './components/ScoringModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ConnectDeviceModal } from './components/ConnectDeviceModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { SingerRemoteView } from './components/SingerRemoteView';
import { 
  AdminTopBar, 
  AdminQueueManager, 
  AdminSongEntryDesk 
} from './components/AdminPage';
import { INITIAL_SONGBOOK } from './data/songbookData';
import { PerformanceRecord, QueueItem, Song, RemoteReaction } from './types';
import { audioService } from './utils/audioSynth';
import { calculatePerformanceScore } from './utils/scoring';
import { syncService } from './utils/syncService';
import { useTheme } from './context/ThemeContext';

const LOCAL_SONGBOOK_KEY = 'yt_karaoke_songbook_custom';
const LOCAL_HISTORY_KEY = 'yt_karaoke_perf_history';

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

export default function App() {
  // Read URL parameters for initial room and view
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialRoom = (searchParams?.get('room') || 'STAGE1').toUpperCase();
  const initialViewParam = searchParams?.get('view') || searchParams?.get('mode') || 'stage';
  const initialView = (initialViewParam === 'remote' ? 'remote' : initialViewParam === 'admin' ? 'admin' : 'stage') as 'stage' | 'admin' | 'remote';

  const [roomId] = useState<string>(initialRoom);
  const [currentView, setCurrentView] = useState<'stage' | 'admin' | 'remote'>(initialView);
  const [connectedClientsCount, setConnectedClientsCount] = useState<number>(1);

  // Songbook state
  const [songbook, setSongbook] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SONGBOOK_KEY);
      if (saved) {
        const customSongs: Song[] = JSON.parse(saved);
        return [...INITIAL_SONGBOOK, ...customSongs];
      }
    } catch {
      // ignore
    }
    return INITIAL_SONGBOOK;
  });

  // Current playing track on the stage
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(() => ({
    id: 'starter-1',
    song: INITIAL_SONGBOOK[0], // Bohemian Rhapsody
    singerName: 'Alex',
    queuedAt: Date.now(),
  }));

  // Up Next Queue
  const [queue, setQueue] = useState<QueueItem[]>(() => [
    {
      id: 'starter-2',
      song: INITIAL_SONGBOOK[1], // Don't Stop Believin'
      singerName: 'Sarah & Chris',
      queuedAt: Date.now() + 1000,
    },
    {
      id: 'starter-3',
      song: INITIAL_SONGBOOK[2], // I Want It That Way
      singerName: 'Michael',
      queuedAt: Date.now() + 2000,
    },
  ]);

  // Performance history & scores
  const [history, setHistory] = useState<PerformanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Recent singers list for quick selection
  const [recentSingers, setRecentSingers] = useState<string[]>([
    'Alex',
    'Sarah & Chris',
    'Michael',
    'Elena',
    'David',
  ]);

  // Stage live overlays
  const [liveNotices, setLiveNotices] = useState<LiveNotice[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Modals
  const [isSongbookOpen, setIsSongbookOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [activeScoreRecord, setActiveScoreRecord] = useState<PerformanceRecord | null>(null);

  const { activeDesign } = useTheme();

  // Live Microphone Vocal Input
  const [isMicActive, setIsMicActive] = useState(false);

  // Singer Face Camera Mirror
  const [isCameraActive, setIsCameraActive] = useState(false);
  const handleToggleCamera = () => {
    setIsCameraActive((prev) => !prev);
  };

  // Ref to track latest queue and currentTrack for socket/sync handlers
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Real-time synchronization across devices (Mobile Phone -> Stage TV)
  useEffect(() => {
    syncService.connect(roomId);

    // 1. Full state sync listener
    const unsubSync = syncService.onSync((state) => {
      if (state.queue) {
        setQueue(state.queue);
      }
      if (state.currentTrack !== undefined) {
        // If currentTrack changed on server, update
        if (state.currentTrack?.id !== currentTrackRef.current?.id) {
          setCurrentTrack(state.currentTrack);
        }
      }
      if (state.history && state.history.length > 0) {
        setHistory((prev) => {
          const combined = [...state.history, ...prev];
          const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
          return unique.slice(0, 50);
        });
      }
    });

    // 2. Incoming song from mobile device notification
    const unsubSongQueued = syncService.onSongQueued((event) => {
      // Play alert sound on the stage
      audioService.playDing();

      const noticeId = `notice-${Date.now()}`;
      setLiveNotices((prev) => [
        ...prev,
        {
          id: noticeId,
          text: `📱 ${event.singerName} queued a song!`,
          subtext: `"${event.songTitle}" ${event.playNext ? '⚡ Priority' : 'added to line'}`,
        },
      ]);

      setTimeout(() => {
        setLiveNotices((prev) => prev.filter((n) => n.id !== noticeId));
      }, 4500);
    });

    // 3. Incoming crowd reactions from mobile phone soundboard
    const unsubReaction = syncService.onReaction((reaction) => {
      const emojiMap: Record<RemoteReaction['type'], string> = {
        cheer: '👏',
        airhorn: '📢',
        fanfare: '🎺',
        drumroll: '🥁',
        fire: '🔥',
        heart: '❤️',
        clap: '👏',
      };

      const emoji = emojiMap[reaction.type] || '🎉';

      // Play matching SFX on stage speakers
      if (reaction.type === 'airhorn') audioService.playAirhorn();
      else if (reaction.type === 'cheer') audioService.playApplause(2.2);
      else if (reaction.type === 'fanfare') audioService.playFanfare();
      else if (reaction.type === 'drumroll') audioService.playDrumroll();
      else audioService.playDing();

      const rId = `rx-${Date.now()}-${Math.random()}`;
      const leftPercent = 15 + Math.random() * 70;

      setFloatingReactions((prev) => [
        ...prev,
        {
          id: rId,
          emoji,
          from: reaction.from,
          leftPercent,
        },
      ]);

      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== rId));
      }, 3000);
    });

    // 4. Online device counter
    const unsubPresence = syncService.onPresence((count) => {
      setConnectedClientsCount(count);
    });

    return () => {
      unsubSync();
      unsubSongQueued();
      unsubReaction();
      unsubPresence();
      syncService.disconnect();
    };
  }, [roomId]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Toggle Live Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      audioService.stopMic();
      setIsMicActive(false);
    } else {
      const success = await audioService.startMic();
      setIsMicActive(success);
    }
  };

  // Add Singer to recent list
  const registerSinger = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRecentSingers((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 8);
    });
  };

  // Queue a song from Songbook or custom URL
  const handleQueueSong = async (song: Song, singerName: string) => {
    registerSinger(singerName);
    const effectiveSinger = singerName.trim() || 'Karaoke Star';

    if (!currentTrack) {
      const newItem: QueueItem = {
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        song,
        singerName: effectiveSinger,
        queuedAt: Date.now(),
      };
      setCurrentTrack(newItem);
      syncService.updateNowPlaying(newItem, undefined, roomId);
      audioService.resetSongStats();
    } else {
      await syncService.addSong(song, effectiveSinger, false, false, roomId);
    }
  };

  // Add custom song from modal
  const handleAddCustomLink = async (
    song: Song,
    singerName: string,
    playImmediately: boolean,
    playNext: boolean
  ) => {
    registerSinger(singerName);
    const effectiveSinger = singerName.trim() || 'Karaoke Star';

    if (playImmediately || !currentTrack) {
      const newItem: QueueItem = {
        id: `queue-${Date.now()}`,
        song,
        singerName: effectiveSinger,
        queuedAt: Date.now(),
      };
      if (currentTrack) {
        setQueue((prev) => [currentTrack, ...prev]);
      }
      setCurrentTrack(newItem);
      syncService.updateNowPlaying(newItem, undefined, roomId);
      audioService.resetSongStats();
    } else {
      await syncService.addSong(song, effectiveSinger, false, playNext, roomId);
    }
  };

  // Add custom song to the persistent Songbook
  const handleAddSongToSongbook = (newSong: Song) => {
    setSongbook((prev) => {
      const updated = [newSong, ...prev];
      try {
        const customOnly = updated.filter((s) => s.isCustom);
        localStorage.setItem(LOCAL_SONGBOOK_KEY, JSON.stringify(customOnly));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Play next track in queue or specific index
  const handlePlayQueueItem = (index: number) => {
    const selected = queue[index];
    if (!selected) return;

    const remaining = queue.filter((_, i) => i !== index);
    const newQueue = currentTrack ? [currentTrack, ...remaining] : remaining;
    setQueue(newQueue);
    setCurrentTrack(selected);
    syncService.updateNowPlaying(selected, newQueue, undefined, roomId);
    audioService.resetSongStats();
  };

  // Skip current song to next in queue
  const handleSkipCurrent = () => {
    if (queue.length > 0) {
      const [nextItem, ...rest] = queue;
      setCurrentTrack(nextItem);
      setQueue(rest);
      syncService.updateNowPlaying(nextItem, rest, undefined, roomId);
      audioService.resetSongStats();
    } else {
      setCurrentTrack(null);
      setQueue([]);
      syncService.updateNowPlaying(null, [], undefined, roomId);
    }
  };

  // Restart current song
  const handleRestartCurrent = () => {
    audioService.resetSongStats();
  };

  // Finish current song and show KTV Score
  const handleFinishAndScore = () => {
    if (!currentTrack) return;

    // Calculate score depending on singer, mic vocal input, and song dynamics
    const breakdown = calculatePerformanceScore(
      currentTrack.singerName,
      currentTrack.song
    );

    const record: PerformanceRecord = {
      id: `perf-${Date.now()}`,
      songTitle: currentTrack.song.title,
      artist: currentTrack.song.artist,
      singerName: currentTrack.singerName,
      youtubeId: currentTrack.song.youtubeId,
      performedAt: Date.now(),
      scoreBreakdown: breakdown,
    };

    // Add to history and notify room
    setHistory((prev) => [record, ...prev]);
    setActiveScoreRecord(record);
    syncService.updateNowPlaying(currentTrack, queue, record, roomId);
  };

  // After scoring or countdown, proceed cleanly to next singer in queue
  const handlePassMicToNext = () => {
    setActiveScoreRecord(null);
    if (queue.length > 0) {
      const [nextSong, ...rest] = queue;
      setCurrentTrack(nextSong);
      setQueue(rest);
      syncService.updateNowPlaying(nextSong, rest, undefined, roomId);
      audioService.resetSongStats();
    } else {
      setCurrentTrack(null);
      setQueue([]);
      syncService.updateNowPlaying(null, [], undefined, roomId);
    }
  };

  // Sing again current song from score modal
  const handleReplayCurrent = () => {
    setActiveScoreRecord(null);
    audioService.resetSongStats();
  };

  // Re-queue previous song from history or leaderboard
  const handleRequeueFromHistory = (song: Song, singerName: string) => {
    handleQueueSong(song, singerName);
  };

  // Queue reordering
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    syncService.sendAction('moveUp', { index }, roomId);
    setQueue((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= queue.length - 1) return;
    syncService.sendAction('moveDown', { index }, roomId);
    setQueue((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  const handleRemoveFromQueue = (id: string) => {
    syncService.sendAction('remove', { id }, roomId);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Fast-track a song to #1 (VIP)
  const handleFastTrack = (index: number) => {
    if (index <= 0) return;
    syncService.sendAction('fastTrack', { index }, roomId);
    setQueue((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  };

  // Rename singer in the queue
  const handleUpdateSingerName = (id: string, newName: string) => {
    syncService.sendAction('rename', { id, newName }, roomId);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, singerName: newName } : item
      )
    );
  };

  const handleUpdateRecordScore = (updated: PerformanceRecord) => {
    setActiveScoreRecord(updated);
    setHistory((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleClearLeaderboard = () => {
    if (window.confirm('Reset all scores on tonight’s leaderboard?')) {
      setHistory([]);
      localStorage.removeItem(LOCAL_HISTORY_KEY);
    }
  };

  // Top score singer of the night
  const topRecord = history.length > 0
    ? [...history].sort((a, b) => b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore)[0]
    : null;

  const currentSingerName = currentTrack?.singerName || recentSingers[0] || 'Alex';

  // If in dedicated Singer Mobile Remote View:
  if (currentView === 'remote') {
    return (
      <SingerRemoteView
        roomId={roomId}
        currentTrack={currentTrack}
        queue={queue}
        songbook={songbook}
        onSwitchToStage={() => setCurrentView('stage')}
        connectedCount={connectedClientsCount}
      />
    );
  }

  return (
    <div className={`min-h-screen ${activeDesign.bgClasses} ${activeDesign.textClasses} flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-300`}>
      {/* Top Navbar & SFX Bar */}
      <Navbar
        queueCount={queue.length}
        completedCount={history.length}
        topScoreSinger={topRecord ? { name: topRecord.singerName, score: topRecord.scoreBreakdown.finalScore } : null}
        onOpenSongbook={() => setIsSongbookOpen(true)}
        onOpenAddModal={() => setIsAddSongOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        connectedClientsCount={connectedClientsCount}
        roomId={roomId}
        isMicActive={isMicActive}
        onToggleMic={handleToggleMic}
        isCameraActive={isCameraActive}
        onToggleCamera={handleToggleCamera}
        currentView={currentView}
        onSelectView={setCurrentView}
      />

      {/* Main Karaoke Lounge Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-6">
        {/* If in Admin view, show top KJ banner */}
        {currentView === 'admin' && (
          <AdminTopBar
            queueCount={queue.length}
            currentTrack={currentTrack}
            onSwitchToStageView={() => setCurrentView('stage')}
          />
        )}

        {/* Stage & Queue / Admin Split Grid - KaraokeStage stays in the exact same DOM position so video NEVER stops playing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Stage / Monitor Container */}
          <div className={`flex flex-col gap-5 ${currentView === 'stage' ? 'lg:col-span-8' : 'lg:col-span-5'}`}>
            <KaraokeStage
              currentItem={currentTrack}
              nextItem={queue[0] || null}
              queueCount={queue.length}
              onFinishAndScore={handleFinishAndScore}
              onSkipSong={handleSkipCurrent}
              onRestartSong={handleRestartCurrent}
              isMicActive={isMicActive}
              onToggleMic={handleToggleMic}
              isCameraActive={isCameraActive}
              onToggleCamera={handleToggleCamera}
              onOpenSongbook={() => setIsSongbookOpen(true)}
              onOpenAddModal={() => setIsAddSongOpen(true)}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              onQuickStartSong={(song) => handleQueueSong(song, currentSingerName)}
              recommendedStarters={songbook.slice(0, 3)}
              compactMode={currentView === 'admin'}
              liveNotices={liveNotices}
              floatingReactions={floatingReactions}
            />

            {/* In Admin view, show the active queue command center beneath the monitor */}
            {currentView === 'admin' && (
              <AdminQueueManager
                queue={queue}
                onFastTrack={handleFastTrack}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemoveFromQueue}
                onUpdateSingerName={handleUpdateSingerName}
              />
            )}
          </div>

          {/* Right Column: Stage Queue or Admin Song Entry Desk */}
          <div className={currentView === 'stage' ? 'lg:col-span-4 h-full' : 'lg:col-span-7'}>
            {currentView === 'stage' ? (
              <SongQueue
                queue={queue}
                history={history}
                onPlayNext={handlePlayQueueItem}
                onRemove={handleRemoveFromQueue}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRequeue={handleRequeueFromHistory}
                onOpenSongbook={() => setIsSongbookOpen(true)}
                onOpenAddModal={() => setIsAddSongOpen(true)}
                onViewPastScore={(rec) => setActiveScoreRecord(rec)}
              />
            ) : (
              <AdminSongEntryDesk
                songbook={songbook}
                recentSingers={recentSingers}
                currentSingerName={currentSingerName}
                onAddSong={handleAddCustomLink}
                onQueueSongbookSong={async (s, singer, playNext) => {
                  registerSinger(singer);
                  await syncService.addSong(s, singer, false, playNext, roomId);
                }}
                onAddCustomSongToSongbook={handleAddSongToSongbook}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-sky-100 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span>Room {roomId} • Multi-Device YouTube Karaoke Queue & Songbook • Live Singing Pitch & Lounge Scoring</span>
        <div className="flex items-center gap-3">
          <button
            id="footer-theme-btn"
            onClick={() => setIsThemeModalOpen(true)}
            className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer font-medium"
          >
            Themes & Backgrounds
          </button>
          <span>•</span>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            Connect Phone (QR Code)
          </button>
          <span>•</span>
          <button
            onClick={() => setIsSongbookOpen(true)}
            className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            Songbook ({songbook.length})
          </button>
          <span>•</span>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            Leaderboard
          </button>
        </div>
      </footer>

      {/* Modals */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <ConnectDeviceModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        roomId={roomId}
        onSwitchToRemoteView={() => setCurrentView('remote')}
        connectedClientsCount={connectedClientsCount}
      />

      <SongbookModal
        isOpen={isSongbookOpen}
        onClose={() => setIsSongbookOpen(false)}
        songbook={songbook}
        onQueueSong={handleQueueSong}
        onAddCustomSong={handleAddSongToSongbook}
        currentSingerName={currentSingerName}
      />

      <AddSongModal
        isOpen={isAddSongOpen}
        onClose={() => setIsAddSongOpen(false)}
        onAddSong={handleAddCustomLink}
        recentSingers={recentSingers}
        currentSingerName={currentSingerName}
      />

      <ScoringModal
        isOpen={activeScoreRecord !== null}
        onClose={() => setActiveScoreRecord(null)}
        record={activeScoreRecord}
        nextItem={queue[0] || null}
        onNextSinger={handlePassMicToNext}
        onReplaySong={handleReplayCurrent}
        onOpenLeaderboard={() => {
          setActiveScoreRecord(null);
          setIsLeaderboardOpen(true);
        }}
        onUpdateScore={handleUpdateRecordScore}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        performances={history}
        onClearLeaderboard={handleClearLeaderboard}
        onRequeue={(rec) =>
          handleRequeueFromHistory(
            {
              id: rec.youtubeId,
              title: rec.songTitle,
              artist: rec.artist,
              youtubeId: rec.youtubeId,
              youtubeUrl: `https://www.youtube.com/watch?v=${rec.youtubeId}`,
              category: 'Pop',
            },
            rec.singerName
          )
        }
      />
    </div>
  );
}
