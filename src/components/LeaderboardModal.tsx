import { X, Trophy, Star, Trash2 } from 'lucide-react';
import { PerformanceRecord } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  performances: PerformanceRecord[];
  onClearLeaderboard: () => void;
  onRequeue: (record: PerformanceRecord) => void;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  performances,
  onClearLeaderboard,
  onRequeue,
}: LeaderboardModalProps) {
  if (!isOpen) return null;

  // Sort descending by final score
  const sorted = [...performances].sort(
    (a, b) => b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore
  );

  const champion = sorted.length > 0 ? sorted[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between bg-sky-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500 shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
                Leaderboard
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Hall of Fame
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top karaoke performances ranked by points and crowd rating
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Champion Spotlight Banner (if at least 1 record) */}
        {champion && (
          <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  👑
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Singer of the Night
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {champion.singerName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    "{champion.songTitle}" — {champion.artist}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-['Chakra_Petch']">
                  {champion.scoreBreakdown.finalScore}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  RANK {champion.scoreBreakdown.grade}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Ranks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sorted.length > 0 ? (
            sorted.map((record, index) => {
              const rankNumber = index + 1;

              return (
                <div
                  key={record.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-2xs ${
                    rankNumber === 1
                      ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                      : rankNumber === 2
                      ? 'bg-sky-50/30 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60'
                      : rankNumber === 3
                      ? 'bg-slate-50/50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-800/80 border-sky-100 dark:border-slate-800 hover:border-sky-200 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Rank badge & details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-['Chakra_Petch'] ${
                      rankNumber === 1
                        ? 'bg-amber-500 text-white font-bold'
                        : rankNumber === 2
                        ? 'bg-sky-500 text-white font-bold'
                        : rankNumber === 3
                        ? 'bg-slate-400 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      #{rankNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                          {record.singerName}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded font-['Chakra_Petch'] ${
                          record.scoreBreakdown.grade === 'SSS' || record.scoreBreakdown.grade === 'SS'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                            : record.scoreBreakdown.grade === 'S'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {record.scoreBreakdown.grade}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {record.songTitle} <span className="text-slate-400 dark:text-slate-500">• {record.artist}</span>
                      </p>
                    </div>
                  </div>

                  {/* Score & Requeue */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        {record.scoreBreakdown.finalScore}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        pts
                      </div>
                    </div>

                    <button
                      onClick={() => onRequeue(record)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 text-xs font-semibold border border-slate-200 dark:border-slate-600 transition-all cursor-pointer"
                      title="Sing this song again"
                    >
                      Sing Again
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h5 className="text-base font-semibold text-slate-800">
                No Scores Recorded Yet
              </h5>
              <p className="text-xs text-slate-500 mt-1">
                Sing tracks on stage to fill the leaderboard!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="p-3 border-t border-sky-100 dark:border-slate-800 bg-sky-50/30 dark:bg-slate-850 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {sorted.length} performance{sorted.length > 1 ? 's' : ''} recorded
            </span>
            <button
              onClick={onClearLeaderboard}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Leaderboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
