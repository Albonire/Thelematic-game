import { PoseController } from './pose';
import { NetClient } from './net';
import { InputManager } from './input';
import { Sfx } from './audio';

/** Servicios compartidos entre la interfaz React y las escenas Phaser */
export const pose = new PoseController();
export const net = new NetClient();
export const input = new InputManager(pose, net);
export const sfx = new Sfx();

export const flags = { ready: false };
