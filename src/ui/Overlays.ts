import Phaser from 'phaser';

/** 全屏遮罩集合（DES-02/DES-06/DES-07/DES-08）：死亡、旋转提示、降级提示。 */
export function showDeathOverlay(scene: Phaser.Scene, onRespawn: () => void): void {
  const { width, height } = scene.scale;
  const bg = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x8b0000, 0.7)
    .setDepth(1100)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(width / 2, height / 2 - 20, '你倒下了…', {
      color: '#ffffff',
      fontSize: '32px'
    })
    .setOrigin(0.5)
    .setDepth(1101);
  const hint = scene.add
    .text(width / 2, height / 2 + 28, '点击屏幕或按任意键复活', {
      color: '#dddddd',
      fontSize: '16px'
    })
    .setOrigin(0.5)
    .setDepth(1101);
  const respawn = () => {
    bg.destroy();
    text.destroy();
    hint.destroy();
    scene.input.keyboard?.off('keydown', respawn);
    onRespawn();
  };
  bg.once('pointerdown', respawn);
  scene.input.keyboard?.once('keydown', respawn);
}

/** 竖屏旋转提示（DES-07）：仅提示不阻断。 */
export class RotateHint {
  private overlay: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.overlay = scene.add.container(0, 0).setDepth(1200).setVisible(false);
    const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    const text = scene.add
      .text(width / 2, height / 2, '请旋转设备至横屏体验', {
        color: '#ffffff',
        fontSize: '22px'
      })
      .setOrigin(0.5);
    this.overlay.add([bg, text]);
    scene.scale.on(Phaser.Scale.Events.RESIZE, () => this.update());
    this.update();
  }

  private update(): void {
    const { width, height } = (this.overlay.scene as Phaser.Scene).scale;
    // 视口异常（如 0 尺寸）兜底为横屏提示隐藏，不阻断游戏（DES-07）
    if (width <= 0 || height <= 0) {
      this.overlay.setVisible(false);
      return;
    }
    this.overlay.setVisible(height > width);
  }
}

/** 降级提示（DES-08）：轻提示，不打断游玩。 */
export function showDegradeToast(scene: Phaser.Scene, level: number): void {
  const { width } = scene.scale;
  const msg = level >= 2 ? '已切换至流畅模式（低画质）' : '已关闭部分特效以保证流畅';
  const toast = scene.add
    .text(width / 2, 60, msg, {
      color: '#ffe082',
      fontSize: '14px',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setDepth(1150);
  scene.time.delayedCall(2500, () => toast.destroy());
}
