import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { input, net, pose } from './services';
import { bus } from './bus';
import { run } from './state';

export function createGame(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#020608',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    disableContextMenu: true,
    scene: [BootScene, GameScene, UIScene],
  });
  // la entrada se muestrea una vez por fotograma, antes de actualizar las escenas
  game.events.on(Phaser.Core.Events.PRE_STEP, () => input.update(performance.now()));
  game.events.on(Phaser.Core.Events.POST_STEP, () => input.endFrame());
  // utilidades de depuración / pruebas
  Object.assign(window, { __game: game, __input: input, __net: net, __pose: pose, __bus: bus, __run: run });
  return game;
}
