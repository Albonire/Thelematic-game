// ─────────────────────────────────────────────────────────────
//  HADES.NET · Relay WebSocket para la práctica de Telemática
//  Uso:   node server/relay.mjs          (puerto 8080 por defecto)
//         PORT=9000 node server/relay.mjs
//
//  Reenvía los mensajes de gestos entre los portátiles de una
//  misma "sala" y responde a los ping para medir latencia.
//  Filtro de Wireshark sugerido:  tcp.port == 8080  &&  websocket
// ─────────────────────────────────────────────────────────────
import { WebSocketServer } from 'ws';
import os from 'node:os';

const PORT = Number(process.env.PORT || 8080);
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });
const rooms = new Map(); // nombre -> Set<ws>
let nextId = 1;
let msgCount = 0;

function peersOf(room) {
  return rooms.get(room) ?? new Set();
}

function broadcastPeers(room) {
  const set = peersOf(room);
  const payload = JSON.stringify({ t: 'peers', n: set.size });
  for (const c of set) if (c.readyState === 1) c.send(payload);
}

wss.on('connection', (ws, req) => {
  ws.id = 'P' + nextId++;
  ws.room = null;
  console.log(`[+] ${ws.id} conectado desde ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    msgCount++;
    let m;
    try {
      m = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (m.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong', ts: m.ts }));
      return;
    }
    if (m.t === 'hello') {
      ws.room = String(m.room || 'default').slice(0, 40);
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      rooms.get(ws.room).add(ws);
      ws.send(JSON.stringify({ t: 'welcome', id: ws.id, n: rooms.get(ws.room).size }));
      broadcastPeers(ws.room);
      console.log(`    ${ws.id} entra en la sala "${ws.room}" (${rooms.get(ws.room).size} jugadores)`);
      return;
    }
    if (!ws.room) return;
    m.from = ws.id;
    const payload = JSON.stringify(m);
    for (const c of peersOf(ws.room)) if (c !== ws && c.readyState === 1) c.send(payload);
  });

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      broadcastPeers(ws.room);
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
    }
    console.log(`[-] ${ws.id} desconectado`);
  });
});

setInterval(() => {
  if (msgCount) console.log(`    · ${(msgCount / 5).toFixed(0)} msg/s en el relay`);
  msgCount = 0;
}, 5000);

console.log('\n  ⚔  HADES.NET relay WebSocket activo');
console.log(`  Puerto: ${PORT}`);
for (const list of Object.values(os.networkInterfaces())) {
  for (const i of list ?? []) {
    if (i.family === 'IPv4' && !i.internal) console.log(`  URL para los otros portátiles:  ws://${i.address}:${PORT}`);
  }
}
console.log(`  Local:                          ws://localhost:${PORT}\n`);
