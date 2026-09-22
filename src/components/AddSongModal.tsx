import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { 
  X, 
  Search,
  User, 
  Play, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Music,
  Clock,
  Sparkles,
  Flame,
  ListPlus,
  ArrowRight
} from 'lucide-react';
import { Song } from '../types';
import { 
  extractYouTubeId, 
  fetchYouTubeVideoInfo, 
  getYouTubeThumbnail,
  fetchYouTubeSuggestions,
  searchYouTubeVideos,
  YouTubeSearchResult
} from '../utils/youtube';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (
    song: Song,
    singerName: string,
    playImmediately: boolean,
    playNext: boolean
  ) => void;
  recentSingers: string[];
  currentSingerName: string;
}

const POPULAR_KARAOKE_SEARCHES = [
  'Bohemian Rhapsody',
  'My Way',
  'Cruel Summer',
  'Shallow Lady Gaga',
  "Don't Stop Believin'",
  'Dancing Queen ABBA',
  'Careless Whisper',
  'Hotel California',
  'Perfect Ed Sheeran',
  'Rolling in the Deep',
  'Anak Freddie Aguilar',
];

export function AddSongModal({
  isOpen,
  onClose,
  onAddSong,
  recentSingers,
  currentSingerName,
}: AddSongModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [singerName, setSingerName] = useState(currentSingerName || 'Karaoke Star');
  const [actionType, setActionType] = useState<'queue' | 'playNext' | 'playNow'>('queue');

  // Auto-suggestions states (like YouTube search dropdown)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Video search results states
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected song for queueing
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    duration?: string;
  } | null>(null);

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [error, setError] = useState('');

  // Sync default singer name when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSingerName(currentSingerName || 'Karaoke Star');
  }, [isOpen, currentSingerName]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced auto-suggestions (like YouTube search)
  useEffect(() => {
    const query = searchInput.trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    // If input is a direct YouTube link, don't query search suggestions
    if (extractYouTubeId(query)) {
      setSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        const list = await fetchYouTubeSuggestions(query);
        if (isCurrent) {
          setSuggestions(list);
          if (list.length > 0) {
            setShowSuggestionsDropdown(true);
          }
        }
      } catch {
        // ignore
      }
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchInput]);

  // Handle direct YouTube URL pasted into the input
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const directId = extractYouTubeId(trimmed);
    if (directId) {
      setError('');
      setIsLoadingMetadata(true);
      fetchYouTubeVideoInfo(directId)
        .then((info) => {
          setSelectedVideo({
            videoId: directId,
            title: info.title,
            artist: info.artist,
            thumbnailUrl: info.thumbnailUrl,
          });
          setIsLoadingMetadata(false);
        })
        .catch(() => {
          setSelectedVideo({
            videoId: directId,
            title: `YouTube Track (${directId})`,
            artist: 'YouTube Video',
            thumbnailUrl: getYouTubeThumbnail(directId),
          });
          setIsLoadingMetadata(false);
        });
    }
  }, [searchInput]);

  // Execute YouTube video search
  const performSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    // Check if it's already a YouTube URL
    const directId = extractYouTubeId(q);
    if (directId) {
      setShowSuggestionsDropdown(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setShowSuggestionsDropdown(false);
    setError('');

    try {
      const results = await searchYouTubeVideos(q);
      setSearchResults(results);
      if (results.length === 0) {
        setError(`No karaoke videos found for "${q}". Try another song title or artist!`);
      }
    } catch {
      setError('Unable to reach YouTube search. Please check your connection or try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      const chosen = suggestions[highlightedIndex];
      setSearchInput(chosen);
      performSearch(chosen);
    } else {
      performSearch(searchInput);
    }
  };

  const handleSelectSuggestion = (sug: string) => {
    setSearchInput(sug);
    setShowSuggestionsDropdown(false);
    performSearch(sug);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestionsDropdown(false);
    }
  };

  // 1-Click quick queue of a video result
  const handleQuickAdd = (
    video: YouTubeSearchResult, 
    overrideAction: 'queue' | 'playNext' | 'playNow' = 'queue'
  ) => {
    const finalSinger = singerName.trim() || 'Karaoke Star';
    const newSong: Song = {
      id: `yt-${video.videoId}-${Date.now()}`,
      title: video.title,
      artist: video.artist,
      youtubeId: video.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      category: 'Pop',
      duration: video.duration,
      isCustom: true,
    };

    onAddSong(
      newSong,
      finalSinger,
      overrideAction === 'playNow',
      overrideAction === 'playNext'
    );

    // Reset & close
    handleClose();
  };

  // Submit the selected song
  const handleFinalSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVideo) {
      setError('Please search and select a song, or paste a YouTube video link.');
      return;
    }

    const finalSinger = singerName.trim() || 'Karaoke Star';
    const newSong: Song = {
      id: `yt-${selectedVideo.videoId}-${Date.now()}`,
      title: selectedVideo.title,
      artist: selectedVideo.artist,
      youtubeId: selectedVideo.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${selectedVideo.videoId}`,
      category: 'Pop',
      duration: selectedVideo.duration,
      isCustom: true,
    };

    onAddSong(
      newSong,
      finalSinger,
      actionType === 'playNow',
      actionType === 'playNext'
    );

    handleClose();
  };

  const handleClose = () => {
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestionsDropdown(false);
    setSearchResults([]);
    setSelectedVideo(null);
    setHasSearched(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between bg-sky-50/60 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Search & Queue Songs
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  YouTube Auto-Suggest
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type any song title, singer, or paste a link for instant suggestions
              </p>
            </div>
          </div>

          <button
            id="add-song-close-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* Search Box with YouTube Auto-Suggestions Dropdown */}
          <div ref={searchContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Song Search or YouTube Link
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Type to see live suggestions
              </span>
            </label>

            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="modal-youtube-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestionsDropdown(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Bohemian Rhapsody, Cruel Summer, or paste YouTube link..."
                  className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 shadow-sm transition-all"
                  autoFocus
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSuggestions([]);
                      setShowSuggestionsDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                id="modal-run-search-btn"
                type="submit"
                disabled={!searchInput.trim() || isSearching}
                className="px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {/* YouTube Search Auto-Suggestions Dropdown */}
            {showSuggestionsDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-slate-700 shadow-xl overflow-hidden z-30 animate-fadeIn">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-semibold px-3">
                  <span>YouTube Suggestions</span>
                  <span className="text-[10px]">Click or press Enter</span>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        index === highlightedIndex
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-medium'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular / Trending Karaoke Quick Tags */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3 text-amber-500" />
                Popular:
              </span>
              {POPULAR_KARAOKE_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchInput(tag);
                    performSearch(tag);
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Track Banner (if a video has been picked or pasted) */}
          {selectedVideo && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50/60 dark:from-slate-800 dark:to-sky-950/40 border-2 border-sky-300 dark:border-sky-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-20 sm:w-24 h-14 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-sky-200 dark:border-slate-700">
                  <img
                    src={selectedVideo.thumbnailUrl}
                    alt={selectedVideo.title}
                    className="w-full h-full object-cover"
                  />
                  {selectedVideo.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 text-white text-[9px] font-mono rounded">
                      {selectedVideo.duration}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected Track Ready to Queue</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedVideo.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedVideo.artist}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="px-3 py-1 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
              >
                Change Song
              </button>
            </div>
          )}

          {/* Video Search Results List */}
          {searchResults.length > 0 && !selectedVideo && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  YouTube Karaoke Results ({searchResults.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Tap card to select, or click "Queue" for 1-click add
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.map((video) => (
                  <div
                    key={video.videoId}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-sky-400 dark:hover:border-sky-500 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div 
                      onClick={() => setSelectedVideo(video)}
                      className="flex items-start gap-2.5 cursor-pointer"
                    >
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 text-white text-[9px] font-mono rounded">
                            {video.duration}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {video.artist}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-750">
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(video)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Customize
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(video, 'playNext')}
                          className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-slate-650 text-sky-700 dark:text-sky-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Play Next in Queue"
                        >
                          Play Next
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(video, 'queue')}
                          className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Queue for ${singerName || 'current singer'}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Queue</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Details: Singer Name & Queue Placement */}
          <form onSubmit={handleFinalSubmit} className="space-y-4 pt-2 border-t border-sky-100 dark:border-slate-800">
            {/* Singer's Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Singer's Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="modal-singer-name-input"
                  type="text"
                  value={singerName}
                  onChange={(e) => setSingerName(e.target.value)}
                  placeholder="Enter the name of the singer"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>

              {/* Quick-select Recent Singers */}
              {recentSingers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">Tonight's singers:</span>
                  {recentSingers.map((singer) => (
                    <button
                      key={singer}
                      type="button"
                      onClick={() => setSingerName(singer)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors cursor-pointer ${
                        singerName === singer
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {singer}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Queue Placement Actions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Queue Placement
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActionType('queue')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    actionType === 'queue'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-750'
                  }`}
                >
                  Add to End
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('playNext')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    actionType === 'playNext'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-750'
                  }`}
                >
                  Play Next
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('playNow')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    actionType === 'playNow'
                      ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-750'
                  }`}
                >
                  Play Now!
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="modal-submit-song-btn"
                type="submit"
                disabled={!selectedVideo}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {actionType === 'playNow' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Singing Now</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{actionType === 'playNext' ? 'Queue to Play Next' : 'Add to Queue'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
