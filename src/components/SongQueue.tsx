import { useState } from 'react';
import { 
  ListMusic, 
  History, 
  Play, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  User, 
  PlusCircle, 
  BookOpen,
  Search
} from 'lucide-react';
import { PerformanceRecord, QueueItem, Song } from '../types';
import { getYouTubeThumbnail } from '../utils/youtube';

interface SongQueueProps {
  queue: QueueItem[];
  history: PerformanceRecord[];
  onPlayNext: (index: number) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRequeue: (song: Song, singerName: string) => void;
  onOpenSongbook: () => void;
  onOpenAddModal: () => void;
  onViewPastScore: (record: PerformanceRecord) => void;
}

export function SongQueue({
  queue,
  history,
  onPlayNext,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRequeue,
  onOpenSongbook,
  onOpenAddModal,
  onViewPastScore,
}: SongQueueProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  return (
    <div className="bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm transition-colors">
      {/* Tab Navigation */}
      <div className="p-3 border-b border-sky-100 dark:border-slate-800 bg-sky-50/40 dark:bg-slate-850 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-sky-100 dark:border-slate-700 shadow-2xs">
          <button
            id="tab-queue-btn"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Up Next</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'queue' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {queue.length}
            </span>
          </button>

          <button
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'history' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {history.length}
            </span>
          </button>
        </div>

        {/* Quick Add Actions */}
        <div className="flex items-center gap-2">
          <button
            id="queue-add-btn"
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-sky-500/20 active:scale-95 transition-all cursor-pointer"
            title="Search YouTube & Auto-Suggest (Queue Song)"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>Search & Add</span>
          </button>
          <button
            id="queue-songbook-btn"
            onClick={onOpenSongbook}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Browse Songbook"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[320px] max-h-[600px]">
        {activeTab === 'queue' ? (
          queue.length > 0 ? (
            queue.map((item, index) => (
              <div
                key={item.id}
                className="group p-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-sky-50/50 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-800 hover:border-sky-200 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                {/* Index & Thumbnail */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center font-mono">
                    #{index + 1}
                  </span>

                  <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={getYouTubeThumbnail(item.song.youtubeId)}
                      alt={item.song.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Song & Singer Details */}
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {item.song.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.song.artist}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200 dark:border-sky-800">
                        <User className="w-2.5 h-2.5" />
                        {item.singerName}
                      </span>
                      {item.song.difficulty && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          • {item.song.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Queue Reorder & Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Play Now / Move to Top */}
                  <button
                    onClick={() => onPlayNext(index)}
                    className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-600 hover:text-white transition-all text-xs font-medium cursor-pointer"
                    title="Play this song now"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  {/* Move Up */}
                  <button
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => onMoveDown(index)}
                    disabled={index === queue.length - 1}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
                <ListMusic className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-semibold text-slate-800 mb-1">
                Queue is Empty
              </h5>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                No songs waiting. Search YouTube or select songs from the songbook!
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-sm shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Search YouTube</span>
                </button>
                <button
                  onClick={onOpenSongbook}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                  <span>Open Songbook</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* History View */
          history.length > 0 ? (
            history.map((record) => (
              <div
                key={record.id}
                onClick={() => onViewPastScore(record)}
                className="group p-2.5 rounded-xl bg-white hover:bg-sky-50/50 border border-sky-100 hover:border-sky-200 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Grade Badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-['Chakra_Petch'] shrink-0 ${
                    record.scoreBreakdown.grade === 'SSS' || record.scoreBreakdown.grade === 'SS'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : record.scoreBreakdown.grade === 'S'
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {record.scoreBreakdown.grade}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-sky-700 transition-colors">
                      {record.songTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {record.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="text-slate-700 font-medium">
                        🎤 {record.singerName}
                      </span>
                      <span>•</span>
                      <span>Score: {record.scoreBreakdown.finalScore} pts</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequeue(
                        {
                          id: record.youtubeId,
                          title: record.songTitle,
                          artist: record.artist,
                          youtubeId: record.youtubeId,
                          youtubeUrl: `https://www.youtube.com/watch?v=${record.youtubeId}`,
                          category: 'Pop',
                        },
                        record.singerName
                      );
                    }}
                    className="p-1.5 rounded-lg bg-white hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200 transition-colors text-xs cursor-pointer"
                    title="Sing this song again"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
                <History className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-semibold text-slate-800 mb-1">
                No Performances Yet
              </h5>
              <p className="text-xs text-slate-500">
                Sing a song to the end to save and view past scores here!
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
