type Handler = (...args: any[]) => void;

/** Mini bus de eventos entre React (interfaz) y Phaser (juego). */
class Bus {
  private map = new Map<string, Set<Handler>>();
  on(event: string, h: Handler) {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(h);
    return () => this.off(event, h);
  }
  off(event: string, h: Handler) {
    this.map.get(event)?.delete(h);
  }
  emit(event: string, ...args: any[]) {
    this.map.get(event)?.forEach((h) => h(...args));
  }
}

export const bus = new Bus();
