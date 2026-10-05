export type NetMsg =
  | { type: 'created'; code: string; player: 0 }
  | { type: 'joined'; player: 1; code: string }
  | { type: 'peerJoined' }
  | { type: 'action'; player: 0 | 1; action: unknown }
  | { type: 'state'; state: unknown }
  | { type: 'hello'; name: string; deck: string[]; seed: number }
  | { type: 'error'; message: string }
  | { type: 'left' }
  | { type: 'chat'; text: string; name: string };

export class NetClient {
  ws: WebSocket | null = null;
  onMsg: ((m: NetMsg) => void) | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('接続に失敗しました'));
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(String(ev.data)) as NetMsg;
          this.onMsg?.(m);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => this.onMsg?.({ type: 'left' });
    });
  }

  send(m: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(m));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}

const configuredRelay = import.meta.env ? import.meta.env.VITE_WS_URL : undefined;

export function hasOnlineRelay(): boolean {
  return Boolean(new URLSearchParams(window.location.search).get('ws') || configuredRelay || window.location.protocol === 'http:');
}

export function defaultWsUrl(): string {
  const loc = window.location;
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const q = new URLSearchParams(loc.search);
  if (q.get('ws')) return q.get('ws')!;
  if (configuredRelay) return configuredRelay;
  return `${proto}//${loc.hostname}:8787`;
}
