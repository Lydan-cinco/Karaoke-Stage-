import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface RoomData {
  roomId: string;
  currentTrack: any | null;
  queue: any[];
  history: any[];
  lastUpdated: number;
}

const rooms = new Map<string, RoomData>();
const sseClients = new Map<string, Set<Response>>();

function getOrCreateRoom(roomId: string): RoomData {
  const normId = (roomId || 'STAGE1').trim().toUpperCase();
  if (!rooms.has(normId)) {
    rooms.set(normId, {
      roomId: normId,
      currentTrack: {
        id: 'starter-1',
        song: {
          id: 'song-1',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          youtubeId: 'fJ9rUzIMcZQ',
          youtubeUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
          category: 'Rock',
          difficulty: 'Hard',
        },
        singerName: 'Alex',
        queuedAt: Date.now(),
      },
      queue: [
        {
          id: 'starter-2',
          song: {
            id: 'song-2',
            title: "Don't Stop Believin'",
            artist: 'Journey',
            youtubeId: '1k8craCGpgs',
            youtubeUrl: 'https://www.youtube.com/watch?v=1k8craCGpgs',
            category: 'Classic',
            difficulty: 'Medium',
          },
          singerName: 'Sarah & Chris',
          queuedAt: Date.now() + 1000,
        },
        {
          id: 'starter-3',
          song: {
            id: 'song-3',
            title: 'I Want It That Way',
            artist: 'Backstreet Boys',
            youtubeId: '4fndeDfaWCg',
            youtubeUrl: 'https://www.youtube.com/watch?v=4fndeDfaWCg',
            category: 'Pop',
            difficulty: 'Easy',
          },
          singerName: 'Michael',
          queuedAt: Date.now() + 2000,
        },
      ],
      history: [],
      lastUpdated: Date.now(),
    });
  }
  return rooms.get(normId)!;
}

function broadcastToRoom(roomId: string, eventName: string, data: any) {
  const normId = (roomId || 'STAGE1').trim().toUpperCase();
  const clients = sseClients.get(normId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // YouTube video metadata lookup (oEmbed)
  app.get('/api/youtube-info', async (req: Request, res: Response) => {
    const raw = req.query.url || req.query.id;
    if (!raw || typeof raw !== 'string') {
      res.status(400).json({ error: 'Missing url or id parameter' });
      return;
    }
    const match = raw.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|youtube\.com\/live\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i);
    const videoId = match ? match[1] : (/^[a-zA-Z0-9_-]{11}$/.test(raw.trim()) ? raw.trim() : null);

    if (!videoId) {
      res.status(400).json({ error: 'Invalid YouTube URL or ID' });
      return;
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = (await response.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        res.json({
          success: true,
          videoId,
          title: data.title || `YouTube Video (${videoId})`,
          artist: data.author_name || 'YouTube Video',
          thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        });
        return;
      }
    } catch {
      // ignore network errors
    }

    res.json({
      success: true,
      videoId,
      title: `YouTube Karaoke Track (${videoId})`,
      artist: 'Karaoke Video',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  });

  // 1. Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 2. Get room state
  app.get('/api/room/:roomId/state', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.roomId);
    const clients = sseClients.get(room.roomId);
    res.json({
      roomId: room.roomId,
      currentTrack: room.currentTrack,
      queue: room.queue,
      history: room.history,
      connectedClients: (clients?.size || 0) + 1,
      lastUpdated: room.lastUpdated,
    });
  });

  // 3. Add song to queue from ANY device (mobile, laptop, remote)
  app.post('/api/room/:roomId/queue', (req: Request, res: Response) => {
    const { song, singerName, playNow, playNext } = req.body;
    if (!song) {
      res.status(400).json({ error: 'Song object required' });
      return;
    }

    const room = getOrCreateRoom(req.params.roomId);
    const newItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      song,
      singerName: (singerName || 'Karaoke Star').trim(),
      queuedAt: Date.now(),
    };

    if (playNow) {
      room.currentTrack = newItem;
    } else if (playNext) {
      room.queue.unshift(newItem);
    } else {
      room.queue.push(newItem);
    }

    room.lastUpdated = Date.now();

    // Broadcast update and notification to all clients (including Main Stage TV!)
    broadcastToRoom(room.roomId, 'sync', {
      currentTrack: room.currentTrack,
      queue: room.queue,
      history: room.history,
      lastUpdated: room.lastUpdated,
    });

    broadcastToRoom(room.roomId, 'song-queued', {
      item: newItem,
      singerName: newItem.singerName,
      songTitle: song.title,
      playNow: !!playNow,
      playNext: !!playNext,
    });

    res.json({ success: true, item: newItem, queueLength: room.queue.length });
  });

  // 4. Update queue actions (reorder, remove, fast-track)
  app.post('/api/room/:roomId/action', (req: Request, res: Response) => {
    const { action, id, index, newName } = req.body;
    const room = getOrCreateRoom(req.params.roomId);

    if (action === 'remove' && id) {
      room.queue = room.queue.filter((q) => q.id !== id);
    } else if (action === 'moveUp' && typeof index === 'number' && index > 0) {
      const temp = room.queue[index];
      room.queue[index] = room.queue[index - 1];
      room.queue[index - 1] = temp;
    } else if (action === 'moveDown' && typeof index === 'number' && index < room.queue.length - 1) {
      const temp = room.queue[index];
      room.queue[index] = room.queue[index + 1];
      room.queue[index + 1] = temp;
    } else if (action === 'fastTrack' && typeof index === 'number' && index > 0) {
      const [item] = room.queue.splice(index, 1);
      if (item) room.queue.unshift(item);
    } else if (action === 'playNextItem' && typeof index === 'number') {
      const [item] = room.queue.splice(index, 1);
      if (item) {
        room.currentTrack = item;
      }
    } else if (action === 'nextSong' || action === 'skipSong') {
      if (room.queue.length > 0) {
        const nextSong = room.queue.shift();
        room.currentTrack = nextSong || null;
      } else {
        room.currentTrack = null;
      }
    } else if (action === 'rename' && id && newName) {
      const item = room.queue.find((q) => q.id === id);
      if (item) item.singerName = newName.trim();
    }

    room.lastUpdated = Date.now();
    broadcastToRoom(room.roomId, 'sync', {
      currentTrack: room.currentTrack,
      queue: room.queue,
      history: room.history,
      lastUpdated: room.lastUpdated,
    });

    res.json({ success: true, queue: room.queue, currentTrack: room.currentTrack });
  });

  // 5. Stage reports currently playing song, next song, or finishes song
  app.post('/api/room/:roomId/now-playing', (req: Request, res: Response) => {
    const { currentTrack, queue, finishedRecord } = req.body;
    const room = getOrCreateRoom(req.params.roomId);

    if (currentTrack !== undefined) {
      room.currentTrack = currentTrack;
      // If a song is currently playing, ensure it is removed from upcoming queue
      if (currentTrack && currentTrack.id) {
        room.queue = room.queue.filter((q) => q.id !== currentTrack.id);
      }
    }

    // If explicit queue array is provided, sync it
    if (Array.isArray(queue)) {
      room.queue = queue;
      if (room.currentTrack && room.currentTrack.id) {
        room.queue = room.queue.filter((q) => q.id !== room.currentTrack?.id);
      }
    }

    if (finishedRecord) {
      room.history.unshift(finishedRecord);
      if (room.history.length > 50) room.history.pop();
    }

    room.lastUpdated = Date.now();
    broadcastToRoom(room.roomId, 'sync', {
      currentTrack: room.currentTrack,
      queue: room.queue,
      history: room.history,
      lastUpdated: room.lastUpdated,
    });

    res.json({ success: true, currentTrack: room.currentTrack, queue: room.queue });
  });

  // 6. Audience crowd reactions (cheers, airhorns, claps from remote phones)
  app.post('/api/room/:roomId/reaction', (req: Request, res: Response) => {
    const { type, from } = req.body;
    const room = getOrCreateRoom(req.params.roomId);

    const reaction = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: type || 'cheer',
      from: (from || 'Audience').trim(),
      timestamp: Date.now(),
    };

    broadcastToRoom(room.roomId, 'reaction', reaction);
    res.json({ success: true, reaction });
  });

  // 7. Real-time Server-Sent Events (SSE) stream for live device syncing
  app.get('/api/room/:roomId/events', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.roomId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    if (!sseClients.has(room.roomId)) {
      sseClients.set(room.roomId, new Set());
    }
    const clientSet = sseClients.get(room.roomId)!;
    clientSet.add(res);

    // Broadcast updated client count
    broadcastToRoom(room.roomId, 'presence', { count: clientSet.size });

    // Send initial snapshot
    res.write(`event: sync\ndata: ${JSON.stringify({
      currentTrack: room.currentTrack,
      queue: room.queue,
      history: room.history,
      lastUpdated: room.lastUpdated,
    })}\n\n`);

    // Keepalive ping every 15s to prevent cloud proxy timeout
    const keepaliveTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepaliveTimer);
      clientSet.delete(res);
      broadcastToRoom(room.roomId, 'presence', { count: clientSet.size });
    });
  });

  // 8. Mount Vite middleware for dev or serve dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Karaoke Live Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
