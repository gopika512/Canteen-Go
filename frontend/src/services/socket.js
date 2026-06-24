export function createSocket() {
  const socket = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:8000/api/live/ws");
  return socket;
}
