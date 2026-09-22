import { useState, useEffect, type FormEvent } from 'react';
import { 
  Tv, 
  Search, 
  Plus, 
  Music, 
  Check, 
  Sparkles, 
  Youtube, 
  BookOpen, 
  ListMusic, 
  Send,
  Volume2,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  Radio,
  Loader2,
  User,
  CheckCircle2,
  Camera,
  CameraOff,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { QueueItem, Song, SongCategory, RemoteReaction } from '../types';
import { 
  extractYouTubeId, 
  fetchYouTubeVideoInfo, 
  getYouTubeThumbnail,
  fetchYouTubeSuggestions,
  searchYouTubeVideos,
  YouTubeSearchResult
} from '../utils/youtube';
import { syncService } from '../utils/syncService';
import { SingerCamera } from './SingerCamera';
import { useTheme } from '../context/ThemeContext';

interface SingerRemoteViewProps {
  roomId: string;
  currentTrack: QueueItem | null;
  queue: QueueItem[];
  songbook: Song[];
  onSwitchToStage: () => void;
  connectedCount: number;
}

export function SingerRemoteView({
  roomId,
  currentTrack,
  queue,
  songbook,
  onSwitchToStage,
  connectedCount,
}: SingerRemoteViewProps) {
  // Singer name saved locally on this device
  const [singerName, setSingerName] = useState(() => {
    return localStorage.getItem('karaoke_remote_singer') || '';
  });

  const [activeTab, setActiveTab] = useState<'link' | 'songbook' | 'queue'>('link');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSelfieCamActive, setIsSelfieCamActive] = useState<boolean>(false);
  const { mode, toggleThemeMode } = useTheme();

  // YouTube Search & Link Form states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [detectedTitle, setDetectedTitle] = useState('');
  const [detectedArtist, setDetectedArtist] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [playPriority, setPlayPriority] = useState<'end' | 'next'>('end');
  const [linkError, setLinkError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // YouTube auto-suggestions & video search states
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const [showRemoteSuggestions, setShowRemoteSuggestions] = useState(false);
  const [remoteSearchResults, setRemoteSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  // Debounced auto-suggestions (like YouTube search dropdown)
  useEffect(() => {
    const q = youtubeUrl.trim();
    if (!q || extractYouTubeId(q)) {
      setRemoteSuggestions([]);
      setShowRemoteSuggestions(false);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        const list = await fetchYouTubeSuggestions(q);
        if (isCurrent) {
          setRemoteSuggestions(list);
          if (list.length > 0) setShowRemoteSuggestions(true);
        }
      } catch {
        // ignore
      }
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [youtubeUrl]);

  // Execute YouTube video search from remote phone
  const handlePerformRemoteSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    if (extractYouTubeId(q)) {
      setShowRemoteSuggestions(false);
      return;
    }

    setIsSearchingRemote(true);
    setShowRemoteSuggestions(false);
    setLinkError('');

    try {
      const results = await searchYouTubeVideos(q);
      setRemoteSearchResults(results);
      if (results.length === 0) {
        setLinkError(`No videos found for "${q}". Try another song!`);
      }
    } catch {
      setLinkError('Search temporarily unavailable. Please try again.');
    } finally {
      setIsSearchingRemote(false);
    }
  };

  const handleSelectRemoteSuggestion = (sug: string) => {
    setYoutubeUrl(sug);
    setShowRemoteSuggestions(false);
    handlePerformRemoteSearch(sug);
  };

  const handleQuickQueueVideo = async (
    video: YouTubeSearchResult, 
    isNextPriority: boolean = false
  ) => {
    const effectiveSinger = singerName.trim() || 'Karaoke Star';
    setIsSubmitting(true);

    const song: Song = {
      id: `remote-${Date.now()}-${video.videoId}`,
      title: video.title,
      artist: video.artist,
      youtubeId: video.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      category: 'Pop',
      duration: video.duration,
      isCustom: true,
      tags: ['remote', 'youtube-search'],
    };

    const res = await syncService.addSong(song, effectiveSinger, false, isNextPriority, roomId);
    setIsSubmitting(false);

    if (res && res.success) {
      showToast(`✨ Queued "${video.title}" for ${effectiveSinger}!`);
    } else {
      setLinkError('Failed to send song to stage. Please try again.');
    }
  };

  // Auto-detect video info when URL changes
  useEffect(() => {
    if (!youtubeUrl.trim()) {
      setDetectedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setLinkError('');
      return;
    }

    const vidId = extractYouTubeId(youtubeUrl);
    if (vidId) {
      setDetectedId(vidId);
      setLinkError('');
      setIsLoadingInfo(true);
      let isCancelled = false;
      fetchYouTubeVideoInfo(vidId).then((info) => {
        if (!isCancelled) {
          setDetectedTitle(info.title);
          setDetectedArtist(info.artist);
          setIsLoadingInfo(false);
        }
      }).catch(() => {
        if (!isCancelled) setIsLoadingInfo(false);
      });
      return () => {
        isCancelled = true;
      };
    } else {
      setDetectedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setLinkError('Please enter a valid YouTube link or video ID');
    }
  }, [youtubeUrl]);

  // Songbook search states
  const [songbookQuery, setSongbookQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SongCategory>('All');

  // Reaction feedback
  const [sentReaction, setSentReaction] = useState<string | null>(null);

  // Save singer name to localStorage
  useEffect(() => {
    if (singerName) {
      localStorage.setItem('karaoke_remote_singer', singerName);
    }
  }, [singerName]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleQueueYoutubeLink = async (e: FormEvent) => {
    e.preventDefault();
    setLinkError('');

    const effectiveSinger = singerName.trim() || 'Karaoke Star';
    const videoId = detectedId || extractYouTubeId(youtubeUrl);

    if (!videoId) {
      setLinkError('Please enter a valid YouTube link or video ID');
      return;
    }

    setIsSubmitting(true);

    const title = detectedTitle.trim() || `YouTube Track (${videoId})`;
    const artist = detectedArtist.trim() || 'Karaoke Artist';

    const song: Song = {
      id: `remote-${Date.now()}-${videoId}`,
      title,
      artist,
      youtubeId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      category: 'Pop',
      difficulty: 'Medium',
      isCustom: true,
      tags: ['remote', 'user-request'],
    };

    const isNext = playPriority === 'next';
    const res = await syncService.addSong(song, effectiveSinger, false, isNext, roomId);

    setIsSubmitting(false);

    if (res && res.success) {
      setYoutubeUrl('');
      setDetectedTitle('');
      setDetectedArtist('');
      setDetectedId(null);
      showToast(`✨ Queued "${title}" for ${effectiveSinger}!`);
    } else {
      setLinkError('Failed to send song to stage. Please try again.');
    }
  };

  const handleQueueFromSongbook = async (song: Song) => {
    const effectiveSinger = singerName.trim() || 'Karaoke Star';
    const res = await syncService.addSong(song, effectiveSinger, false, false, roomId);
    if (res && res.success) {
      showToast(`🎶 Added "${song.title}" for ${effectiveSinger}!`);
    }
  };

  const handleSendReaction = async (type: RemoteReaction['type']) => {
    const effectiveSinger = singerName.trim() || 'Audience';
    setSentReaction(type);
    await syncService.sendReaction(type, effectiveSinger, roomId);
    setTimeout(() => setSentReaction(null), 1200);
  };

  // Filter songbook
  const filteredSongs = songbook.filter((song) => {
    const matchesCat = selectedCategory === 'All' || song.category === selectedCategory;
    const q = songbookQuery.toLowerCase().trim();
    if (!q) return matchesCat;
    const matchesQuery =
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.tags?.some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const categories: SongCategory[] = [
    'All',
    'Pop',
    'Rock & Indie',
    '80s & 90s Classics',
    'Power Ballads',
    'Party & Dance',
    'Duets & R&B',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col max-w-xl mx-auto border-x border-sky-100 dark:border-slate-800 shadow-sm transition-colors">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-3 inset-x-3 max-w-md mx-auto z-50 p-3 rounded-xl bg-sky-600 text-white shadow-lg text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-300" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-sky-200 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-sky-100 dark:border-slate-800 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
                Karaoke Remote
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-slate-800 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-slate-700">
                {roomId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Connected to Stage</span>
              <span>•</span>
              <span>{connectedCount} online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme Dark / Light Toggle */}
          <button
            id="remote-theme-toggle-btn"
            onClick={toggleThemeMode}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="remote-selfie-cam-btn"
            onClick={() => setIsSelfieCamActive((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              isSelfieCamActive
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200 dark:ring-rose-900'
                : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-sky-200 dark:border-slate-700 shadow-2xs'
            }`}
            title="Enable Singer Face Camera"
          >
            {isSelfieCamActive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <Camera className="w-3.5 h-3.5" />
                <span>Cam On</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Selfie Cam</span>
              </>
            )}
          </button>

          <button
            id="remote-switch-to-stage-btn"
            onClick={onSwitchToStage}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 text-xs font-semibold border border-sky-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TV Stage View</span>
            <span className="sm:hidden">Stage</span>
          </button>
        </div>
      </header>

      {/* Floating Singer Face Camera Mirror (if enabled) */}
      <SingerCamera
        isActive={isSelfieCamActive}
        onClose={() => setIsSelfieCamActive(false)}
        singerName={singerName || 'Singer'}
        initialPosition="top-left"
      />

      {/* Persistent Singer Name Input */}
      <div className="p-3 bg-sky-50/50 border-b border-sky-100">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Your Name:
          </span>
          <input
            id="remote-singer-name-input"
            type="text"
            value={singerName}
            onChange={(e) => setSingerName(e.target.value)}
            placeholder="e.g. Alex, Sarah..."
            className="flex-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
          />
          {singerName ? (
            <span className="text-[10px] text-sky-600 font-medium bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
              Saved
            </span>
          ) : (
            <span className="text-[10px] text-amber-600 font-medium">Enter name</span>
          )}
        </div>
      </div>

      {/* "Now Singing on Stage" Card */}
      <div className="p-3">
        <div className="p-3 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-center gap-3">
          {currentTrack ? (
            <>
              <div className="relative w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-sky-200">
                <img
                  src={getYouTubeThumbnail(currentTrack.song.youtubeId)}
                  alt={currentTrack.song.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-sky-400 rounded-full animate-bounce h-2" />
                    <span className="w-1 bg-sky-300 rounded-full animate-bounce h-3 delay-100" />
                    <span className="w-1 bg-sky-500 rounded-full animate-bounce h-1.5 delay-200" />
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-sky-600" />
                    Now on Stage
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                  {currentTrack.song.title}
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  Singer: <span className="font-semibold text-sky-700">{currentTrack.singerName}</span>
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Stage is idle — Queue a song to start!
                </p>
                <p className="text-[11px] text-slate-500">
                  Pick a track below to play on the main screen
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Up Next Banner for remote phone */}
        {queue.length > 0 && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-sky-50/80 border border-sky-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 shrink-0">Up Next:</span>
              <span className="font-semibold text-slate-800 truncate">
                {queue[0].singerName} — {queue[0].song.title}
              </span>
            </div>
            {singerName && queue[0].singerName.toLowerCase().trim() === singerName.toLowerCase().trim() ? (
              <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold shrink-0 animate-pulse">
                You're Next! 🎤
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 shrink-0">
                {queue.length} in queue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Live Crowd Reaction Soundboard */}
      <div className="px-3 pb-2">
        <div className="p-2.5 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center justify-between gap-1 text-center">
          <span className="text-[11px] font-semibold text-slate-500 px-1">
            Send Live Cheers:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSendReaction('cheer')}
              className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-xs font-semibold border border-sky-200 shadow-2xs transition-all cursor-pointer ${
                sentReaction === 'cheer' ? 'scale-110 bg-sky-200' : ''
              }`}
              title="Cheer for the singer"
            >
              👏 Cheer
            </button>
            <button
              onClick={() => handleSendReaction('airhorn')}
              className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-xs font-semibold border border-sky-200 shadow-2xs transition-all cursor-pointer ${
                sentReaction === 'airhorn' ? 'scale-110 bg-sky-200' : ''
              }`}
              title="Airhorn hype"
            >
              📢 Airhorn
            </button>
            <button
              onClick={() => handleSendReaction('fire')}
              className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-xs font-semibold border border-sky-200 shadow-2xs transition-all cursor-pointer ${
                sentReaction === 'fire' ? 'scale-110 bg-sky-200' : ''
              }`}
              title="On fire!"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 inline mr-0.5" />
              Fire
            </button>
            <button
              onClick={() => handleSendReaction('heart')}
              className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-xs font-semibold border border-sky-200 shadow-2xs transition-all cursor-pointer ${
                sentReaction === 'heart' ? 'scale-110 bg-sky-200' : ''
              }`}
              title="Love"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 inline mr-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Search & Queue, Songbook, Queue */}
      <div className="px-3 pt-1">
        <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            id="tab-remote-link"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 text-rose-500" />
            <span>Search & Queue</span>
          </button>
          <button
            id="tab-remote-songbook"
            onClick={() => setActiveTab('songbook')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'songbook'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Songbook</span>
          </button>
          <button
            id="tab-remote-queue"
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Up Next ({queue.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3 flex-1 overflow-y-auto">
        {/* Tab 1: YouTube Search & Auto-Suggest */}
        {activeTab === 'link' && (
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-sky-100 dark:border-slate-800 p-4 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-rose-500" />
                Search & Queue Any YouTube Song
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type any song or artist for live suggestions, or paste a direct YouTube video link.
              </p>
            </div>

            {linkError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs">
                {linkError}
              </div>
            )}

            {/* Search Input with YouTube Auto-Suggestions */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Search Song / Artist or Paste Link *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="remote-youtube-url-input"
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onFocus={() => {
                      if (remoteSuggestions.length > 0) setShowRemoteSuggestions(true);
                    }}
                    placeholder="e.g. Bohemian Rhapsody, My Way, or link..."
                    className="w-full pl-10 pr-9 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-sky-500"
                  />
                  {youtubeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeUrl('');
                        setRemoteSuggestions([]);
                        setShowRemoteSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePerformRemoteSearch(youtubeUrl)}
                  disabled={!youtubeUrl.trim() || isSearchingRemote}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/25 active:scale-95 cursor-pointer shrink-0"
                >
                  {isSearchingRemote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 stroke-[2.5]" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>

              {/* YouTube Auto-Suggestions Dropdown */}
              {showRemoteSuggestions && remoteSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-slate-700 shadow-xl overflow-hidden z-30">
                  <div className="py-1 max-h-48 overflow-y-auto">
                    {remoteSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSelectRemoteSuggestion(sug)}
                        className="w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Search className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sug}</span>
                        </div>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 shrink-0">Search</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular quick chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 text-xs no-scrollbar">
                <span className="text-[10px] font-semibold text-slate-400 shrink-0">Popular:</span>
                {['Bohemian Rhapsody', 'My Way', 'Cruel Summer', 'Shallow', 'Dancing Queen', 'Hotel California'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setYoutubeUrl(chip);
                      handlePerformRemoteSearch(chip);
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Search Results List with 1-click Queueing */}
            {remoteSearchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    YouTube Karaoke Tracks ({remoteSearchResults.length})
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">1-Tap Queue</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {remoteSearchResults.map((video) => (
                    <div
                      key={video.videoId}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2"
                    >
                      <div 
                        onClick={() => {
                          setYoutubeUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
                          setDetectedId(video.videoId);
                          setDetectedTitle(video.title);
                          setDetectedArtist(video.artist);
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {video.duration && (
                            <span className="absolute bottom-0.5 right-0.5 px-0.5 bg-black/80 text-white text-[8px] font-mono rounded">
                              {video.duration}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {video.title}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {video.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickQueueVideo(video, true)}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800 cursor-pointer"
                          title="Play Next (VIP)"
                        >
                          VIP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickQueueVideo(video, false)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Queue</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Link / Selected Track Card */}
            <form onSubmit={handleQueueYoutubeLink} className="space-y-3.5 pt-2 border-t border-sky-100 dark:border-slate-800">
              {detectedId && (
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-3">
                  <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                    <img
                      src={getYouTubeThumbnail(detectedId)}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Ready to Queue</span>
                    </div>
                    {isLoadingInfo ? (
                      <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting song...</span>
                      </div>
                    ) : (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {detectedTitle || `YouTube Track (${detectedId})`}
                        </h5>
                        {detectedArtist && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {detectedArtist}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Singer's Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Singer Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="remote-form-singer-input"
                    type="text"
                    value={singerName}
                    onChange={(e) => setSingerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Priority Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Queue Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayPriority('end')}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      playPriority === 'end'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Add to End of Line</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayPriority('next')}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      playPriority === 'next'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Play Next (VIP)</span>
                  </button>
                </div>
              </div>

              <button
                id="remote-submit-song-btn"
                type="submit"
                disabled={isSubmitting || !detectedId}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending to Stage...' : 'Queue Song to Stage'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Curated Songbook */}
        {activeTab === 'songbook' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={songbookQuery}
                onChange={(e) => setSongbookQuery(e.target.value)}
                placeholder="Search song or artist..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Songbook List */}
            <div className="space-y-2">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="p-2.5 bg-white rounded-xl border border-sky-100 flex items-center justify-between gap-2 shadow-2xs hover:border-sky-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getYouTubeThumbnail(song.youtubeId)}
                      alt={song.title}
                      className="w-12 h-9 rounded-lg object-cover shrink-0 bg-slate-100"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQueueFromSongbook(song)}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Queue</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Up Next Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Live Queue on Stage:</span>
              <span>{queue.length} track{queue.length !== 1 ? 's' : ''} waiting</span>
            </div>

            {queue.length > 0 ? (
              queue.map((item, index) => {
                const isMySong =
                  singerName &&
                  item.singerName.toLowerCase().trim() === singerName.toLowerCase().trim();

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 shadow-2xs ${
                      isMySong
                        ? 'bg-sky-50/90 border-sky-300 ring-1 ring-sky-300/50'
                        : 'bg-white border-sky-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {item.song.title}
                          </h4>
                          {isMySong && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Singer: <strong className="text-slate-700">{item.singerName}</strong>
                        </p>
                      </div>
                    </div>

                    <a
                      href={item.song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-sky-600 p-1 cursor-pointer"
                      title="Preview on YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-sky-100">
                <Music className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">The queue is empty!</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Be the first singer to add a song from the other tabs.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Footer */}
      <footer className="p-3 border-t border-sky-100 bg-white text-center text-[11px] text-slate-400">
        Playing on Room <strong className="text-slate-600">{roomId}</strong> • Real-time Multi-Device Sync
      </footer>
    </div>
  );
}
