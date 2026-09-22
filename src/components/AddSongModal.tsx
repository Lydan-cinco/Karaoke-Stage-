import { useState, useEffect, type FormEvent } from 'react';
import { 
  X, 
  Link as LinkIcon, 
  User, 
  Play, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Music
} from 'lucide-react';
import { Song } from '../types';
import { extractYouTubeId, fetchYouTubeVideoInfo, getYouTubeThumbnail } from '../utils/youtube';

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

export function AddSongModal({
  isOpen,
  onClose,
  onAddSong,
  recentSingers,
  currentSingerName,
}: AddSongModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [singerName, setSingerName] = useState(currentSingerName || 'Karaoke Star');
  const [extractedId, setExtractedId] = useState<string | null>(null);
  const [detectedTitle, setDetectedTitle] = useState('');
  const [detectedArtist, setDetectedArtist] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [error, setError] = useState('');
  const [actionType, setActionType] = useState<'queue' | 'playNext' | 'playNow'>('queue');

  useEffect(() => {
    if (!isOpen) return;
    setSingerName(currentSingerName || 'Karaoke Star');
  }, [isOpen, currentSingerName]);

  // Check URL on input & automatically fetch video title
  useEffect(() => {
    if (!youtubeUrl.trim()) {
      setExtractedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setError('');
      return;
    }

    const vidId = extractYouTubeId(youtubeUrl);
    if (vidId) {
      setExtractedId(vidId);
      setError('');
      setIsLoadingInfo(true);
      
      let isCancelled = false;
      fetchYouTubeVideoInfo(vidId).then((info) => {
        if (!isCancelled) {
          setDetectedTitle(info.title);
          setDetectedArtist(info.artist);
          setIsLoadingInfo(false);
        }
      }).catch(() => {
        if (!isCancelled) {
          setIsLoadingInfo(false);
        }
      });

      return () => {
        isCancelled = true;
      };
    } else {
      setExtractedId(null);
      setDetectedTitle('');
      setDetectedArtist('');
      setError('Please provide a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...)');
    }
  }, [youtubeUrl]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!extractedId) {
      setError('A valid YouTube video link is required.');
      return;
    }

    const finalSinger = singerName.trim() || 'Karaoke Star';
    const finalTitle = detectedTitle.trim() || `YouTube Track (${extractedId})`;
    const finalArtist = detectedArtist.trim() || 'Karaoke Artist';

    const newSong: Song = {
      id: `yt-${extractedId}-${Date.now()}`,
      title: finalTitle,
      artist: finalArtist,
      youtubeId: extractedId,
      youtubeUrl: `https://www.youtube.com/watch?v=${extractedId}`,
      category: 'Pop',
      isCustom: true,
    };

    onAddSong(
      newSong,
      finalSinger,
      actionType === 'playNow',
      actionType === 'playNext'
    );

    // Reset & close
    setYoutubeUrl('');
    setDetectedTitle('');
    setDetectedArtist('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-sky-100 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                Add YouTube Karaoke Link
              </h3>
              <p className="text-xs text-slate-500">
                Paste the YouTube link and enter the singer's name
              </p>
            </div>
          </div>

          <button
            id="add-song-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Only YouTube Link & Singer Name */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 1. YouTube URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              YouTube Video Link *
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="modal-youtube-url-input"
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:border-sky-500 shadow-2xs"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          {/* Video Preview Card with Detected Song Details */}
          {extractedId && (
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/80 flex items-center gap-3">
              <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                <img
                  src={getYouTubeThumbnail(extractedId)}
                  alt="YouTube Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Valid YouTube Link</span>
                </div>
                {isLoadingInfo ? (
                  <div className="flex items-center gap-1.5 text-xs text-sky-700 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting song info...</span>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                      <Music className="w-3 h-3 text-sky-600 shrink-0" />
                      <span className="truncate">{detectedTitle || `YouTube Track (${extractedId})`}</span>
                    </h4>
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

          {/* 2. Name of the Singer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-sky-500 shadow-2xs"
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
                        : 'bg-white hover:bg-sky-50 text-slate-600 border border-slate-200'
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Queue Placement
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActionType('queue')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                  actionType === 'queue'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
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
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
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
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                }`}
              >
                Play Now!
              </button>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-600 text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="modal-submit-song-btn"
              type="submit"
              disabled={!extractedId}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {actionType === 'playNow' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Singing Now</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Queue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
