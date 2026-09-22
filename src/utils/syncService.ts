import { QueueItem, PerformanceRecord, Song, RemoteReaction } from '../types';

export interface RoomStatePayload {
  currentTrack: QueueItem | null;
  queue: QueueItem[];
  history: PerformanceRecord[];
  lastUpdated: number;
}

export interface SongQueuedEvent {
  item: QueueItem;
  singerName: string;
  songTitle: string;
  playNow: boolean;
  playNext: boolean;
}

type SyncListener = (state: RoomStatePayload) => void;
type SongQueuedListener = (event: SongQueuedEvent) => void;
type ReactionListener = (reaction: RemoteReaction) => void;
type PresenceListener = (count: number) => void;

class RoomSyncService {
  private eventSource: EventSource | null = null;
  private currentRoomId: string = 'STAGE1';
  private syncListeners: Set<SyncListener> = new Set();
  private songQueuedListeners: Set<SongQueuedListener> = new Set();
  private reactionListeners: Set<ReactionListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('karaoke-device-sync');
      this.broadcastChannel.onmessage = (e) => {
        const { type, payload, roomId } = e.data || {};
        if (roomId && roomId !== this.currentRoomId) return;

        if (type === 'sync') {
          this.syncListeners.forEach((cb) => cb(payload));
        } else if (type === 'song-queued') {
          this.songQueuedListeners.forEach((cb) => cb(payload));
        } else if (type === 'reaction') {
          this.reactionListeners.forEach((cb) => cb(payload));
        }
      };
    }
  }

  connect(roomId: string) {
    const norm = (roomId || 'STAGE1').trim().toUpperCase();
    if (this.currentRoomId === norm && this.eventSource) {
      return;
    }
    this.currentRoomId = norm;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource(`/api/room/${norm}/events`);

      this.eventSource.addEventListener('sync', (e: MessageEvent) => {
        try {
          const data: RoomStatePayload = JSON.parse(e.data);
          this.syncListeners.forEach((cb) => cb(data));
        } catch (err) {
          console.error('Error parsing sync payload', err);
        }
      });

      this.eventSource.addEventListener('song-queued', (e: MessageEvent) => {
        try {
          const data: SongQueuedEvent = JSON.parse(e.data);
          this.songQueuedListeners.forEach((cb) => cb(data));
        } catch (err) {
          console.error('Error parsing song-queued payload', err);
        }
      });

      this.eventSource.addEventListener('reaction', (e: MessageEvent) => {
        try {
          const data: RemoteReaction = JSON.parse(e.data);
          this.reactionListeners.forEach((cb) => cb(data));
        } catch (err) {
          console.error('Error parsing reaction payload', err);
        }
      });

      this.eventSource.addEventListener('presence', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.presenceListeners.forEach((cb) => cb(data.count));
        } catch (err) {
          console.error('Error parsing presence payload', err);
        }
      });

      this.eventSource.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (e) {
      console.warn('Failed to establish SSE, will use HTTP fallback', e);
    }

    // Also fetch initial state once via HTTP immediately
    this.fetchState(norm);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  async fetchState(roomId = this.currentRoomId): Promise<RoomStatePayload | null> {
    try {
      const res = await fetch(`/api/room/${roomId}/state`);
      if (!res.ok) return null;
      const data = await res.json();
      const state: RoomStatePayload = {
        currentTrack: data.currentTrack,
        queue: data.queue || [],
        history: data.history || [],
        lastUpdated: data.lastUpdated || Date.now(),
      };
      this.syncListeners.forEach((cb) => cb(state));
      return state;
    } catch {
      return null;
    }
  }

  async addSong(
    song: Song,
    singerName: string,
    playNow = false,
    playNext = false,
    roomId = this.currentRoomId
  ) {
    try {
      const res = await fetch(`/api/room/${roomId}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, singerName, playNow, playNext }),
      });
      const data = await res.json();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'song-queued',
          roomId,
          payload: {
            item: data.item,
            singerName,
            songTitle: song.title,
            playNow,
            playNext,
          },
        });
      }
      return data;
    } catch (err) {
      console.error('Error adding song to room queue', err);
      return null;
    }
  }

  async updateNowPlaying(
    currentTrack: QueueItem | null,
    queue?: QueueItem[],
    finishedRecord?: PerformanceRecord,
    roomId = this.currentRoomId
  ) {
    try {
      await fetch(`/api/room/${roomId}/now-playing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTrack, queue, finishedRecord }),
      });
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'sync',
          roomId,
          payload: { currentTrack, queue },
        });
      }
    } catch (err) {
      console.error('Error updating now playing', err);
    }
  }

  async sendAction(
    action: 'remove' | 'moveUp' | 'moveDown' | 'fastTrack' | 'playNextItem' | 'rename',
    payload: { id?: string; index?: number; newName?: string },
    roomId = this.currentRoomId
  ) {
    try {
      await fetch(`/api/room/${roomId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch (err) {
      console.error('Error performing queue action', err);
    }
  }

  async sendReaction(type: RemoteReaction['type'], from: string, roomId = this.currentRoomId) {
    try {
      const res = await fetch(`/api/room/${roomId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, from }),
      });
      const data = await res.json();
      if (this.broadcastChannel && data.reaction) {
        this.broadcastChannel.postMessage({
          type: 'reaction',
          roomId,
          payload: data.reaction,
        });
      }
      return data.reaction;
    } catch (err) {
      console.error('Error sending reaction', err);
      return null;
    }
  }

  onSync(cb: SyncListener) {
    this.syncListeners.add(cb);
    return () => this.syncListeners.delete(cb);
  }

  onSongQueued(cb: SongQueuedListener) {
    this.songQueuedListeners.add(cb);
    return () => this.songQueuedListeners.delete(cb);
  }

  onReaction(cb: ReactionListener) {
    this.reactionListeners.add(cb);
    return () => this.reactionListeners.delete(cb);
  }

  onPresence(cb: PresenceListener) {
    this.presenceListeners.add(cb);
    return () => this.presenceListeners.delete(cb);
  }
}

export const syncService = new RoomSyncService();
