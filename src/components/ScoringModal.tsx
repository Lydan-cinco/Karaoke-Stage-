import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, SkipForward, X } from 'lucide-react';
import { PerformanceRecord, QueueItem } from '../types';
import { audioService } from '../utils/audioSynth';

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PerformanceRecord | null;
  nextItem?: QueueItem | null;
  onNextSinger: () => void;
  onReplaySong: () => void;
  onOpenLeaderboard?: () => void;
  onUpdateScore?: (updatedRecord: PerformanceRecord) => void;
}

export function ScoringModal({
  isOpen,
  onClose,
  record,
  nextItem,
  onNextSinger,
  onReplaySong,
}: ScoringModalProps) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(true);
  const [isScoreLocked, setIsScoreLocked] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Auto-advance countdown timer when next song is in queue
  useEffect(() => {
    if (!isOpen || !record) return;

    setCountdown(10);
    setIsAutoAdvancing(!!nextItem);
  }, [isOpen, record, nextItem]);

  useEffect(() => {
    if (!isOpen || !nextItem || !isAutoAdvancing) return;

    if (countdown <= 0) {
      onNextSinger();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, nextItem, isAutoAdvancing, countdown, onNextSinger]);

  // Authentic Videoke Scoring Sound & Animation Sequence
  const triggerVideokeScoreSequence = (targetScore: number) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    audioService.stopSpeech();
    setIsScoreLocked(false);
    setDisplayedScore(0);

    // 1. Initial suspense drum roll building anticipation
    audioService.playDrumroll();

    const duration = 1400; // ms for score counting
    const startTime = performance.now();
    let lastTickValue = 0;

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic for classic videoke accelerating-then-decelerating roll
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(eased * targetScore);
      setDisplayedScore(currentVal);

      // Play retro videoke tally tick blip every 2-3 points
      if (currentVal - lastTickValue >= 3 || (progress >= 1 && currentVal > lastTickValue)) {
        lastTickValue = currentVal;
        audioService.playScoreTick(progress);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateCount);
      } else {
        // --- SCORE HAS LOCKED IN ---
        setIsScoreLocked(true);

        // 2. Climax impact hit (videoke gong + tubular bell + sub kick + crash cymbal)
        audioService.playVideokeScoreImpact(targetScore);

        // 3. Confetti shower for celebratory scores
        if (targetScore >= 80) {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.58 },
            colors: ['#0284c7', '#38bdf8', '#e0f2fe', '#f59e0b', '#10b981'],
          });
        }

        // 4. Videoke Brass Fanfare Jingle (260ms after lock-in)
        setTimeout(() => {
          audioService.playVideokeFanfare(targetScore);
        }, 260);

        // 5. Enthusiastic crowd cheers, whistling, clapping, and roaring applause (650ms)
        setTimeout(() => {
          audioService.playCheeringAndApplause(4.5);
        }, 650);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateCount);
  };

  useEffect(() => {
    if (!isOpen || !record) return;

    const targetScore = record.scoreBreakdown.finalScore;
    triggerVideokeScoreSequence(targetScore);

    return () => {
      audioService.stopSpeech();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  return (
    <div 
      id="score-page-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-center flex flex-col p-6 sm:p-8 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-score-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close score display"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Singer Name */}
        <div 
          id="score-singer-name"
          className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest"
        >
          {record.singerName}
        </div>

        {/* Song Title */}
        <h2 
          id="score-song-title"
          className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Outfit'] mt-1 px-4 truncate"
          title={record.songTitle}
        >
          {record.songTitle}
        </h2>

        {/* Score Display (Centered, Large, Celebratory) */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-sky-50 dark:bg-slate-800 border-4 ${
            isScoreLocked 
              ? 'border-sky-500 ring-8 ring-sky-100 dark:ring-sky-950/70 shadow-lg scale-105' 
              : 'border-sky-200 dark:border-slate-700'
          } transition-all duration-300 flex flex-col items-center justify-center`}>
            <div 
              id="score-number-display"
              className={`text-7xl sm:text-8xl font-black font-['Chakra_Petch'] leading-none tracking-tight ${
                isScoreLocked ? 'text-sky-600 dark:text-sky-400' : 'text-sky-500 dark:text-sky-400'
              }`}
            >
              {displayedScore}
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-3">
              {isScoreLocked ? 'SCORE' : 'TALLYING...'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="replay-song-btn"
            onClick={onReplaySong}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sing Again</span>
          </button>

          <button
            id="next-song-score-btn"
            onClick={onNextSinger}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <span>
              {nextItem 
                ? `Next Song (${countdown}s)` 
                : 'Done'}
            </span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
