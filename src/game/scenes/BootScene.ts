import Phaser from 'phaser';
import { buildAllTextures } from '../art_chars';
import { bus } from '../bus';
import { flags } from '../services';

/** Genera todo el arte de forma procedural y espera la orden de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const base = import.meta.env.BASE_URL + 'images/';
    this.load.image('portrait-melinoe', base + 'portrait-melinoe.jpg');
    this.load.image('portrait-hecate', base + 'portrait-hecate.jpg');
    this.load.image('portrait-captain', base + 'portrait-captain.jpg');
    this.load.image('portrait-phantom', base + 'portrait-phantom.jpg');
  }

  create() {
    const fonts = ['600 20px Cinzel', '700 20px Cinzel', '800 20px Cinzel', '600 20px Rajdhani', '700 20px Rajdhani'];
    const go = () => {
      buildAllTextures(this);
      flags.ready = true;
      bus.emit('ready');
    };
    Promise.all(fonts.map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(go);
    const off = bus.on('start', () => {
      off();
      this.scene.start('Game');
    });
    this.events.once('shutdown', () => off());
  }
}
