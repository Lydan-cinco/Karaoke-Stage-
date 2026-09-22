export type SongCategory = 
  | 'All'
  | 'Pop'
  | 'Rock & Indie'
  | '80s & 90s Classics'
  | 'Power Ballads'
  | 'Party & Dance'
  | 'Duets & R&B'
  | 'Anime & Soundtracks';

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  youtubeUrl: string;
  category: SongCategory;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Legend';
  duration?: string;
  tags?: string[];
  isCustom?: boolean;
}

export interface QueueItem {
  id: string;
  song: Song;
  singerName: string;
  queuedAt: number;
  note?: string;
}

export interface ScoreBreakdown {
  pitchIntonation: number; // 0-100
  vocalEnergy: number;     // 0-100
  rhythmTiming: number;    // 0-100
  stagePresence: number;   // 0-100
  finalScore: number;      // 0-100
  grade: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';
  feedback: string;
  singerComment: string;
}

export interface PerformanceRecord {
  id: string;
  songTitle: string;
  artist: string;
  singerName: string;
  youtubeId: string;
  performedAt: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface MicAnalysisStats {
  samplesCount: number;
  averageVolume: number;
  peakVolume: number;
  vocalStability: number;
  activeSingingDurationSeconds: number;
}

export interface RemoteReaction {
  id: string;
  type: 'cheer' | 'airhorn' | 'fanfare' | 'drumroll' | 'fire' | 'heart' | 'clap';
  from: string;
  timestamp: number;
}

export interface RoomSyncState {
  roomId: string;
  currentTrack: QueueItem | null;
  queue: QueueItem[];
  history: PerformanceRecord[];
  connectedClients: number;
  lastUpdated: number;
}

export type ThemeMode = 'light' | 'dark';

export type BackgroundDesignId = 
  | 'light-sky'
  | 'light-warm'
  | 'dark-neon'
  | 'dark-purple'
  | 'dark-charcoal'
  | 'dark-galaxy';

export interface BackgroundDesignOption {
  id: BackgroundDesignId;
  name: string;
  mode: ThemeMode;
  tagline: string;
  previewGradient: string;
  swatchColors: [string, string, string];
  bgClasses: string;
  cardClasses: string;
  accentTextClass: string;
}

