import Phaser from 'phaser';
import { createGameConfig } from './core/GameConfig';
import { BootScene } from './scenes/PreloadScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

/** 入口（DES-01）：Boot → Preload → Game + UIScene 场景流。 */
new Phaser.Game(
  createGameConfig([BootScene, PreloadScene, GameScene, UIScene])
);
