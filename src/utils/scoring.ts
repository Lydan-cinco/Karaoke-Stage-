import { ScoreBreakdown, Song } from '../types';
import { audioService } from './audioSynth';

// Deterministic pseudo-random seed generator from singer name
function getSingerSeed(singerName: string): number {
  let hash = 0;
  for (let i = 0; i < singerName.length; i++) {
    hash = (hash << 5) - hash + singerName.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const PRAISE_PHRASES = [
  'Blew the roof off the room!',
  'Pure arena rockstar energy!',
  'Smooth, velvety tones and pristine control.',
  'Unbelievable crowd engagement and passion!',
  'Nailed the emotional peak with goosebumps!',
  'Electrifying vocal projection from start to finish!',
  'Flawless pitch landing right in the sweet spot.',
  'Brought the entire lounge to their feet!',
];

const ENCOURAGING_PHRASES = [
  'Awesome stage confidence and killer enthusiasm!',
  'Heartfelt effort that got everyone clapping along!',
  'Great energy on the chorus, keep that groove going!',
  'Brave song selection delivered with true karaoke spirit!',
];

export function calculatePerformanceScore(
  singerName: string,
  song: Song,
  manualJudgeBonus = 0
): ScoreBreakdown {
  const cleanName = singerName.trim() || 'Mystery Singer';
  const seed = getSingerSeed(cleanName);
  const stats = audioService.getAccumulatedStats();

  let pitchBase: number;
  let energyBase: number;
  let rhythmBase: number;
  let presenceBase: number;

  if (stats.hasMicData) {
    // Score directly influenced by live microphone vocal analysis!
    const micEnergyRatio = Math.min(1, stats.avgVolume / 35);
    const micActiveRatio = Math.min(1, stats.singingRatio * 2.2);

    pitchBase = Math.round(stats.stabilityScore * 0.9 + (seed % 10));
    energyBase = Math.round(55 + micEnergyRatio * 35 + (stats.peakVolume > 70 ? 8 : 0));
    rhythmBase = Math.round(70 + micActiveRatio * 24 + ((seed >> 2) % 6));
    presenceBase = Math.round(75 + ((seed >> 3) % 20) + (stats.peakVolume > 50 ? 5 : 0));
  } else {
    // If no mic input, derive based on singer personality seed + song difficulty
    const diffOffset = song.difficulty === 'Legend' ? 4 : song.difficulty === 'Hard' ? 2 : 0;
    pitchBase = 78 + (seed % 18) - diffOffset;
    energyBase = 80 + ((seed >> 2) % 18);
    rhythmBase = 79 + ((seed >> 4) % 17);
    presenceBase = 82 + ((seed >> 6) % 16);
  }

  // Factor in judge/audience bonus
  const pitchIntonation = Math.min(100, Math.max(50, pitchBase + Math.round(manualJudgeBonus * 0.8)));
  const vocalEnergy = Math.min(100, Math.max(50, energyBase + manualJudgeBonus));
  const rhythmTiming = Math.min(100, Math.max(50, rhythmBase + Math.round(manualJudgeBonus * 0.7)));
  const stagePresence = Math.min(100, Math.max(50, presenceBase + manualJudgeBonus));

  // Weighted aggregate score
  const rawScore = (pitchIntonation * 0.35) + (vocalEnergy * 0.25) + (rhythmTiming * 0.20) + (stagePresence * 0.20);
  const finalScore = Math.min(100, Math.max(45, Math.round(rawScore)));

  // Determine KTV Letter Grade
  let grade: ScoreBreakdown['grade'] = 'B';
  if (finalScore >= 98) grade = 'SSS';
  else if (finalScore >= 95) grade = 'SS';
  else if (finalScore >= 90) grade = 'S';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else grade = 'C';

  // Custom feedback for the singer
  const praise = finalScore >= 88 
    ? PRAISE_PHRASES[seed % PRAISE_PHRASES.length]
    : ENCOURAGING_PHRASES[seed % ENCOURAGING_PHRASES.length];

  const feedback = `${cleanName} delivered a sensational performance of "${song.title}"! ${praise}`;

  let singerComment = '';
  if (grade === 'SSS' || grade === 'SS') {
    singerComment = `👑 ${cleanName} is on absolute fire tonight! Master-tier vocal delivery!`;
  } else if (grade === 'S') {
    singerComment = `🔥 Outstanding singing! ${cleanName} owned the spotlight!`;
  } else if (grade === 'A') {
    singerComment = `⭐ Great performance by ${cleanName}! The room loved the vibe!`;
  } else {
    singerComment = `🎤 Fun singing by ${cleanName}! Ready for the next round!`;
  }

  return {
    pitchIntonation,
    vocalEnergy,
    rhythmTiming,
    stagePresence,
    finalScore,
    grade,
    feedback,
    singerComment,
  };
}
