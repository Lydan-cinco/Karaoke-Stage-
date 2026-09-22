import { useState, type FormEvent } from 'react';
import { 
  PlusCircle, 
  Link as LinkIcon, 
  Music, 
  User, 
  Search, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Settings2,
  Tv,
  ListOrdered,
  Loader2
} from 'lucide-react';
import { QueueItem, Song, SongCategory } from '../types';
import { extractYouTubeId, getYouTubeThumbnail, fetchYouTubeVideoInfo } from '../utils/youtube';
import { audioService } from '../utils/audioSynth';

const CATEGORIES: SongCategory[] = [
  'All',
  'Pop',
  'Rock & Indie',
  '80s & 90s Classics',
  'Power Ballads',
  'Party & Dance',
  'Duets & R&B',
  'Anime & Soundtracks',
];

// 1. Top Ribbon Component for Admin Mode
interface AdminTopBarProps {
  queueCount: number;
  currentTrack: QueueItem | null;
  onSwitchToStageView: () => void;
}

export function AdminTopBar({
  queueCount,
  currentTrack,
  onSwitchToStageView,
}: AdminTopBarProps) {
  return (
    <div className="p-4 bg-white border border-sky-100 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">
              KJ Admin Console
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Live Stage Playing
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {currentTrack ? (
              <span>
                Singing now: <strong className="text-sky-700">{currentTrack.singerName}</strong> — {currentTrack.song.title}
              </span>
            ) : (
              <span>Stage is idle • {queueCount} song(s) in queue</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick SFX Soundboard for Host */}
        <div className="hidden sm:flex items-center gap-1 bg-sky-50/60 px-2.5 py-1.5 rounded-xl border border-sky-100 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Host SFX:</span>
          <button
            onClick={() => audioService.playApplause()}
            className="px-2 py-1 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-white transition-colors cursor-pointer"
          >
            👏 Cheer
          </button>
          <button
            onClick={() => audioService.playAirhorn()}
            className="px-2 py-1 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-white transition-colors cursor-pointer"
          >
            📢 Airhorn
          </button>
          <button
            onClick={() => audioService.playFanfare()}
            className="px-2 py-1 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-white transition-colors cursor-pointer"
          >
            🎺 Fanfare
          </button>
          <button
            onClick={() => audioService.playDrumroll()}
            className="px-2 py-1 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-white transition-colors cursor-pointer"
          >
            🥁 Drumroll
          </button>
          <button
            onClick={() => {
              audioService.playDrumroll();
              setTimeout(() => {
                audioService.playScoreTick(0.85);
                audioService.playVideokeScoreImpact(98);
                setTimeout(() => audioService.playVideokeFanfare(98), 260);
                setTimeout(() => audioService.playCheeringAndApplause(4), 650);
              }, 500);
            }}
            className="px-2 py-1 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-white transition-colors cursor-pointer"
            title="Play Videoke Score, Drumroll, Impact & Applause"
          >
            🎯 Videoke Score
          </button>
          <button
            onClick={() => {
              audioService.playCheeringAndApplause(4);
            }}
            className="px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer font-medium"
            title="Play enthusiastic crowd cheering, clapping & whistling"
          >
            👏 Cheering & Clapping
          </button>
        </div>

        {/* Switch to Full Stage View */}
        <button
          id="admin-switch-stage-btn"
          onClick={onSwitchToStageView}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Tv className="w-4 h-4" />
          <span>Switch to Big Stage</span>
        </button>
      </div>
    </div>
  );
}

// 2. Queue Manager in Admin Mode
interface AdminQueueManagerProps {
  queue: QueueItem[];
  onFastTrack: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onUpdateSingerName: (id: string, newName: string) => void;
}

export function AdminQueueManager({
  queue,
  onFastTrack,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateSingerName,
}: AdminQueueManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  return (
    <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-3.5 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Up Next Queue ({queue.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-500">
          Click singer to rename • VIP fast-track
        </span>
      </div>

      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {queue.length > 0 ? (
          queue.map((item, idx) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-white border border-sky-100 hover:border-sky-200 hover:bg-sky-50/30 flex items-center justify-between gap-2.5 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 text-center text-xs font-bold text-slate-400 font-mono">
                  #{idx + 1}
                </span>
                <div className="w-10 h-8 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img
                    src={getYouTubeThumbnail(item.song.youtubeId)}
                    alt={item.song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {item.song.title}
                  </div>
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="text"
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        className="px-1.5 py-0.5 rounded bg-white border border-sky-500 text-[10px] text-slate-800 w-24"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdateSingerName(item.id, editNameInput.trim() || item.singerName);
                          setEditingId(null);
                        }}
                        className="text-[10px] px-1.5 py-0.5 bg-sky-600 text-white rounded font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setEditingId(item.id);
                        setEditNameInput(item.singerName);
                      }}
                      className="text-[10px] text-sky-700 truncate cursor-pointer hover:underline flex items-center gap-1"
                      title="Click to rename singer"
                    >
                      <User className="w-2.5 h-2.5" />
                      <span>{item.singerName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Bump to Next */}
                <button
                  onClick={() => onFastTrack(idx)}
                  disabled={idx === 0}
                  className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white text-[10px] font-bold border border-sky-200 disabled:opacity-20 transition-colors cursor-pointer"
                  title="Fast-track to #1 next"
                >
                  VIP
                </button>

                {/* Move Up */}
                <button
                  onClick={() => onMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>

                {/* Move Down */}
                <button
                  onClick={() => onMoveDown(idx)}
                  disabled={idx === queue.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Remove */}
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Queue is clear. Enter a song on the right to start queuing!
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Fast Song Entry Desk (Right Column)
interface AdminSongEntryDeskProps {
  songbook: Song[];
  recentSingers: string[];
  currentSingerName: string;
  onAddSong: (
    song: Song,
    singerName: string,
    playImmediately: boolean,
    playNext: boolean
  ) => void;
  onQueueSongbookSong: (song: Song, singerName: string, playNext?: boolean) => void;
  onAddCustomSongToSongbook: (newSong: Song) => void;
}

export function AdminSongEntryDesk({
  songbook,
  recentSingers,
  currentSingerName,
  onAddSong,
  onQueueSongbookSong,
  onAddCustomSongToSongbook,
}: AdminSongEntryDeskProps) {
  // Rapid YouTube Entry Form State - streamlined to YouTube URL and Singer Name only
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [detectedTitle, setDetectedTitle] = useState('');
  const [detectedArtist, setDetectedArtist] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [singerName, setSingerName] = useState(currentSingerName || 'Karaoke Star');
  const [extractedId, setExtractedId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState('');
  const [queuePlacement, setQueuePlacement] = useState<'next' | 'end' | 'now'>('next');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Songbook Search State
  const [songbookQuery, setSongbookQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SongCategory>('All');
  const [songbookSinger, setSongbookSinger] = useState(currentSingerName || 'Karaoke Star');
  const [activeTab, setActiveTab] = useState<'link' | 'songbook' | 'catalog'>('link');

  // Catalog Add Form State
  const [catalogTitle, setCatalogTitle] = useState('');
  const [catalogArtist, setCatalogArtist] = useState('');
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<SongCategory>('Pop');
  const [catalogDifficulty, setCatalogDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [catalogSuccessMsg, setCatalogSuccessMsg] = useState('');

  // Handle URL change for quick extraction & auto song title fetching
  const handleUrlChange = (val: string) => {
    setYoutubeUrl(val);
    if (!val.trim()) {
      setExtractedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setUrlError('');
      return;
    }
    const id = extractYouTubeId(val);
    if (id) {
      setExtractedId(id);
      setUrlError('');
      setIsLoadingInfo(true);
      fetchYouTubeVideoInfo(id).then((info) => {
        setDetectedTitle(info.title);
        setDetectedArtist(info.artist);
        setIsLoadingInfo(false);
      }).catch(() => {
        setIsLoadingInfo(false);
      });
    } else {
      setExtractedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setUrlError('Invalid YouTube URL or video ID');
    }
  };

  // Submit quick song link
  const handleQuickAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!extractedId) {
      setUrlError('Please provide a valid YouTube karaoke link.');
      return;
    }

    const songTitle = detectedTitle.trim() || `YouTube Track (${extractedId})`;
    const artistName = detectedArtist.trim() || 'Karaoke Artist';
    const singer = singerName.trim() || 'Karaoke Star';

    const newSong: Song = {
      id: `admin-yt-${extractedId}-${Date.now()}`,
      title: songTitle,
      artist: artistName,
      youtubeId: extractedId,
      youtubeUrl: `https://www.youtube.com/watch?v=${extractedId}`,
      category: 'Pop',
      isCustom: true,
    };

    onAddSong(
      newSong,
      singer,
      queuePlacement === 'now',
      queuePlacement === 'next'
    );

    setAddSuccessMsg(`Queued "${songTitle}" for ${singer}!`);
    setTimeout(() => setAddSuccessMsg(''), 3000);

    // Reset URL and Detected Info
    setYoutubeUrl('');
    setDetectedTitle('');
    setDetectedArtist('');
    setExtractedId(null);
  };

  // Submit new song into catalog
  const handleAddCatalogSong = (e: FormEvent) => {
    e.preventDefault();
    if (!catalogTitle.trim() || !catalogArtist.trim()) return;
    const vidId = extractYouTubeId(catalogUrl);
    if (!vidId) {
      alert('Please enter a valid YouTube URL for this catalog entry.');
      return;
    }

    const customSong: Song = {
      id: `catalog-${Date.now()}`,
      title: catalogTitle.trim(),
      artist: catalogArtist.trim(),
      youtubeId: vidId,
      youtubeUrl: catalogUrl.trim(),
      category: catalogCategory,
      difficulty: catalogDifficulty,
      isCustom: true,
      tags: ['catalog', catalogCategory.toLowerCase()],
    };

    onAddCustomSongToSongbook(customSong);
    setCatalogSuccessMsg(`Added "${customSong.title}" to Songbook catalog!`);
    setTimeout(() => setCatalogSuccessMsg(''), 3000);

    setCatalogTitle('');
    setCatalogArtist('');
    setCatalogUrl('');
  };

  // Filtered songbook for quick picker
  const filteredSongbook = songbook.filter((s) => {
    const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
    const q = songbookQuery.toLowerCase().trim();
    if (!q) return matchCat;
    const matchQ =
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  return (
    <div className="bg-white border border-sky-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs for Ingestion Mode */}
      <div className="p-3 border-b border-sky-100 bg-sky-50/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            id="admin-tab-link"
            onClick={() => setActiveTab('link')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Enter YouTube Song</span>
          </button>
          <button
            id="admin-tab-songbook"
            onClick={() => setActiveTab('songbook')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'songbook'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pick from Songbook</span>
          </button>
          <button
            id="admin-tab-catalog"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add to Catalog</span>
          </button>
        </div>

        {addSuccessMsg && (
          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{addSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* TAB 1: Fast YouTube Link Ingestion Form */}
      {activeTab === 'link' && (
        <form onSubmit={handleQuickAdd} className="p-5 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                YouTube Karaoke Link or Video ID *
              </label>
              <span className="text-[11px] text-slate-400">
                e.g. youtu.be/...
              </span>
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Paste YouTube karaoke URL..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:border-sky-500 shadow-2xs"
                autoFocus
              />
            </div>
            {urlError && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {urlError}
              </p>
            )}
          </div>

          {/* Instant Thumbnail Preview with Auto-Detected Song Info */}
          {extractedId && (
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/80 flex items-center gap-3">
              <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                <img
                  src={getYouTubeThumbnail(extractedId)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid YouTube Video Linked</span>
                </div>
                {isLoadingInfo ? (
                  <div className="flex items-center gap-1.5 text-xs text-sky-700 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting song info...</span>
                  </div>
                ) : (
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                      <Music className="w-3 h-3 text-sky-600 shrink-0" />
                      <span className="truncate">{detectedTitle || `YouTube Track (${extractedId})`}</span>
                    </h5>
                    {detectedArtist && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {detectedArtist}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Singer Name & Quick Pick */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Singer's Name *
              </label>
              <span className="text-[11px] text-slate-400">
                Who will sing this track?
              </span>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="admin-singer-name-input"
                type="text"
                value={singerName}
                onChange={(e) => setSingerName(e.target.value)}
                placeholder="Enter the name of the singer"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Quick Select Frequent Singers */}
            {recentSingers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">Singers tonight:</span>
                {recentSingers.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSingerName(s)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors cursor-pointer ${
                      singerName === s
                        ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                        : 'bg-white hover:bg-sky-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Insertion Priority Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Queue Placement
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQueuePlacement('next')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  queuePlacement === 'next'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                }`}
              >
                <div className="text-xs font-bold">Play Next (#1)</div>
                <div className="text-[10px] opacity-85">VIP fast-track</div>
              </button>
              <button
                type="button"
                onClick={() => setQueuePlacement('end')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  queuePlacement === 'end'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                }`}
              >
                <div className="text-xs font-bold">Add to End</div>
                <div className="text-[10px] opacity-85">Next in regular turn</div>
              </button>
              <button
                type="button"
                onClick={() => setQueuePlacement('now')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  queuePlacement === 'now'
                    ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                }`}
              >
                <div className="text-xs font-bold">Play Now</div>
                <div className="text-[10px] opacity-85">Switch track immediately</div>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!extractedId}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {queuePlacement === 'now'
                  ? 'Switch on Stage Now'
                  : queuePlacement === 'next'
                  ? 'Queue Next (#1 VIP)'
                  : 'Add to Queue'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Songbook Direct Picker */}
      {activeTab === 'songbook' && (
        <div className="p-4 space-y-3">
          {/* Singer assignment bar for songbook */}
          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              <span className="text-xs text-slate-700 font-semibold">Singer:</span>
              <input
                type="text"
                value={songbookSinger}
                onChange={(e) => setSongbookSinger(e.target.value)}
                placeholder="Singer Name"
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Pick track to enter into queue without stopping current music
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={songbookQuery}
                onChange={(e) => setSongbookQuery(e.target.value)}
                placeholder="Search title, artist, genre..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-sky-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Songbook List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {filteredSongbook.length > 0 ? (
              filteredSongbook.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-white border border-sky-100 hover:border-sky-200 hover:bg-sky-50/40 flex items-center justify-between gap-2.5 shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 h-9 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={getYouTubeThumbnail(s.youtubeId)}
                        alt={s.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-800 truncate">
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {s.artist}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {s.category} {s.difficulty ? `• ${s.difficulty}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onQueueSongbookSong(s, songbookSinger, true);
                        setAddSuccessMsg(`Queued "${s.title}" next!`);
                        setTimeout(() => setAddSuccessMsg(''), 3000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold shadow-2xs cursor-pointer"
                      title="Queue this track next in line (#1)"
                    >
                      Queue Next
                    </button>
                    <button
                      onClick={() => {
                        onQueueSongbookSong(s, songbookSinger, false);
                        setAddSuccessMsg(`Added "${s.title}" to end!`);
                        setTimeout(() => setAddSuccessMsg(''), 3000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-slate-700 text-[11px] font-medium border border-slate-200 cursor-pointer"
                      title="Add to bottom of queue"
                    >
                      + End
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No songs found for "{songbookQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Add to Permanent Songbook Catalog */}
      {activeTab === 'catalog' && (
        <form onSubmit={handleAddCatalogSong} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Add New Track to Lounge Songbook
            </h4>
            {catalogSuccessMsg && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {catalogSuccessMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Song Title *
              </label>
              <input
                type="text"
                value={catalogTitle}
                onChange={(e) => setCatalogTitle(e.target.value)}
                placeholder="e.g. Careless Whisper"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Artist *
              </label>
              <input
                type="text"
                value={catalogArtist}
                onChange={(e) => setCatalogArtist(e.target.value)}
                placeholder="e.g. George Michael"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              YouTube Karaoke URL or Video ID *
            </label>
            <input
              type="text"
              value={catalogUrl}
              onChange={(e) => setCatalogUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value as SongCategory)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-sky-500"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty
              </label>
              <select
                value={catalogDifficulty}
                onChange={(e) => setCatalogDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Save into Catalog
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
