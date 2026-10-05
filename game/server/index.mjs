import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = Number(process.env.PORT || 8787);
const rooms = new Map();

function code() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('LUNNEKO ARENA net ok\n');
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws) => {
  ws.room = null;
  ws.seat = null;
  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (m.type === 'create') {
      let c = code();
      while (rooms.has(c)) c = code();
      rooms.set(c, { host: ws, guest: null });
      ws.room = c;
      ws.seat = 0;
      ws.send(JSON.stringify({ type: 'created', code: c, player: 0 }));
      return;
    }
    if (m.type === 'join') {
      const c = String(m.code || '').toUpperCase();
      const r = rooms.get(c);
      if (!r) {
        ws.send(JSON.stringify({ type: 'error', message: '部屋がない' }));
        return;
      }
      if (r.guest) {
        ws.send(JSON.stringify({ type: 'error', message: '満室' }));
        return;
      }
      r.guest = ws;
      ws.room = c;
      ws.seat = 1;
      ws.send(JSON.stringify({ type: 'joined', player: 1, code: c }));
      r.host?.send(JSON.stringify({ type: 'peerJoined' }));
      return;
    }
    const r = rooms.get(ws.room);
    if (!r) return;
    const other = ws === r.host ? r.guest : r.host;
    if (other && other.readyState === 1) other.send(JSON.stringify(m));
  });
  ws.on('close', () => {
    const r = rooms.get(ws.room);
    if (!r) return;
    const other = ws === r.host ? r.guest : r.host;
    if (other && other.readyState === 1) other.send(JSON.stringify({ type: 'left' }));
    rooms.delete(ws.room);
  });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`LUNNEKO net ws://0.0.0.0:${PORT}`);
});
