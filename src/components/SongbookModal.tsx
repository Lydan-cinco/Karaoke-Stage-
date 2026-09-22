import { useState, useEffect, type FormEvent } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Music, 
  ExternalLink, 
  User, 
  Check, 
  PlusCircle,
  Loader2
} from 'lucide-react';
import { Song, SongCategory } from '../types';
import { extractYouTubeId, getYouTubeThumbnail, fetchYouTubeVideoInfo } from '../utils/youtube';

interface SongbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  songbook: Song[];
  onQueueSong: (song: Song, singerName: string) => void;
  onAddCustomSong: (newSong: Song) => void;
  currentSingerName: string;
}

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

export function SongbookModal({
  isOpen,
  onClose,
  songbook,
  onQueueSong,
  onAddCustomSong,
  currentSingerName,
}: SongbookModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<SongCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongToQueue, setSelectedSongToQueue] = useState<Song | null>(null);
  const [singerInput, setSingerInput] = useState(currentSingerName || 'Karaoke Star');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New song form states
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [newCategory, setNewCategory] = useState<SongCategory>('Pop');
  const [newDifficulty, setNewDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [formError, setFormError] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    if (!newYoutubeUrl.trim()) return;
    const vidId = extractYouTubeId(newYoutubeUrl);
    if (vidId) {
      setIsLoadingMetadata(true);
      fetchYouTubeVideoInfo(vidId).then((info) => {
        if (!newTitle.trim()) setNewTitle(info.title);
        if (!newArtist.trim()) setNewArtist(info.artist);
        setIsLoadingMetadata(false);
      }).catch(() => {
        setIsLoadingMetadata(false);
      });
    }
  }, [newYoutubeUrl]);

  if (!isOpen) return null;

  // Filter songs
  const filteredSongs = songbook.filter((song) => {
    const matchesCategory = selectedCategory === 'All' || song.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery =
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      song.tags?.some((t) => t.toLowerCase().includes(query));

    return matchesCategory && matchesQuery;
  });

  const handleConfirmQueue = (song: Song) => {
    const name = singerInput.trim() || 'Karaoke Star';
    onQueueSong(song, name);
    setSelectedSongToQueue(null);
  };

  const handleCreateCustomSong = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const videoId = extractYouTubeId(newYoutubeUrl);
    if (!videoId) {
      setFormError('Please enter a valid YouTube video URL or ID');
      return;
    }

    const customSong: Song = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim() || `YouTube Track (${videoId})`,
      artist: newArtist.trim() || 'Karaoke Artist',
      youtubeId: videoId,
      youtubeUrl: newYoutubeUrl.trim(),
      category: newCategory,
      difficulty: newDifficulty,
      isCustom: true,
      tags: ['custom', newCategory.toLowerCase()],
    };

    onAddCustomSong(customSong);
    // Reset form
    setNewTitle('');
    setNewArtist('');
    setNewYoutubeUrl('');
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-sky-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                Karaoke Songbook
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {songbook.length} Tracks
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Browse verified karaoke anthems or save your own YouTube tracks to the book
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="songbook-add-custom-btn"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isAddingNew
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-sky-600 text-white hover:bg-sky-500 shadow-xs'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingNew ? 'Back to List' : 'Add Custom Song'}</span>
            </button>
            <button
              id="songbook-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Custom Song Form Dropdown/View */}
        {isAddingNew ? (
          <div className="p-6 overflow-y-auto bg-sky-50/20">
            <div className="max-w-xl mx-auto bg-white border border-sky-100 rounded-xl p-5 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-sky-600" />
                Add New Song to Songbook
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Enter details and a YouTube karaoke/instrumental link to permanently save it in your songbook.
              </p>

              {formError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateCustomSong} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Song Title *
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Hotel California"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Artist / Band *
                    </label>
                    <input
                      type="text"
                      value={newArtist}
                      onChange={(e) => setNewArtist(e.target.value)}
                      placeholder="e.g. Eagles"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    YouTube Karaoke URL or Video ID *
                  </label>
                  <input
                    type="text"
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Search YouTube for "[Song Name] Karaoke" and paste the link here.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as SongCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
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
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-sky-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Save to Songbook
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Category Tabs */}
            <div className="p-4 border-b border-sky-100 bg-sky-50/40 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song title, artist, or tags (e.g. Adele, Queen, rock)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categories Scrollable Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-sky-50 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Song List Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredSongs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSongs.map((song) => {
                    const isSelected = selectedSongToQueue?.id === song.id;

                    return (
                      <div
                        key={song.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 shadow-2xs ${
                          isSelected
                            ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                            : 'bg-white border-sky-100 hover:border-sky-200 hover:bg-sky-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                            <img
                              src={getYouTubeThumbnail(song.youtubeId)}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {song.duration && (
                              <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-mono text-white">
                                {song.duration}
                              </span>
                            )}
                          </div>

                          {/* Song Info */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-slate-800 truncate">
                              {song.title}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">
                              {song.artist}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                                {song.category}
                              </span>
                              {song.difficulty && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  song.difficulty === 'Legend'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                    : song.difficulty === 'Hard'
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : song.difficulty === 'Medium'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                }`}>
                                  {song.difficulty}
                                </span>
                              )}
                              {song.isCustom && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Custom
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Queue Prompt or Button */}
                        {isSelected ? (
                          <div className="mt-2 pt-2 border-t border-sky-200 flex items-center gap-2">
                            <div className="relative flex-1">
                              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={singerInput}
                                onChange={(e) => setSingerInput(e.target.value)}
                                placeholder="Singer's Name..."
                                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-white border border-sky-300 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => handleConfirmQueue(song)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => setSelectedSongToQueue(null)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-slate-400 hover:text-sky-600 flex items-center gap-1"
                            >
                              <span>Watch video</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              onClick={() => setSelectedSongToQueue(song)}
                              className="px-3 py-1 rounded-lg bg-white hover:bg-sky-600 text-slate-700 hover:text-white border border-slate-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Queue Song</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
                    <Music className="w-6 h-6" />
                  </div>
                  <h5 className="text-base font-semibold text-slate-800">
                    No songs found matching "{searchQuery}"
                  </h5>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Try searching for another artist, or add this song yourself!
                  </p>
                  <button
                    onClick={() => {
                      setIsAddingNew(true);
                      setNewTitle(searchQuery);
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add "{searchQuery}" to Songbook
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
