import Phaser from 'phaser';

/** 全局游戏配置（DES-01 / DES-07）：设计分辨率 960×540，FIT + CENTER_BOTH 自适应。 */
export const DESIGN_WIDTH = 960;
export const DESIGN_HEIGHT = 540;

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[]
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO, // WebGL 优先，Canvas 自动回退（低端 H5）
    parent: 'game',
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: '#2d2d44',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    fps: { target: 60 },
    scene: scenes
  };
}
