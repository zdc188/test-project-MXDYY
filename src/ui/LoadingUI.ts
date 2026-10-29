import Phaser from 'phaser';

/** 加载进度与失败重试 UI（DES-02 / REQ-007）：进度条 + “资源加载失败，点击重试”遮罩。 */
export class LoadingUI {
  private bar: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private retryOverlay: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.border = scene.add
      .rectangle(width / 2, height / 2, 420, 26)
      .setStrokeStyle(2, 0xffffff);
    this.bar = scene.add
      .rectangle(width / 2 - 207, height / 2, 0, 18, 0x4caf50)
      .setOrigin(0, 0.5);
    this.text = scene.add
      .text(width / 2, height / 2 - 40, '加载中 0%', {
        color: '#ffffff',
        fontSize: '20px'
      })
      .setOrigin(0.5);
  }

  setProgress(progress: number): void {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    this.bar.width = 414 * p;
    this.text.setText(`加载中 ${Math.floor(p * 100)}%`);
  }

  showRetry(message: string, onRetry: () => void): void {
    if (this.retryOverlay) return;
    const { width, height } = this.scene.scale;
    const overlay = this.scene.add.container(0, 0).setDepth(1000);
    const bg = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(width / 2, height / 2 - 20, message, {
        color: '#ff6b6b',
        fontSize: '24px'
      })
      .setOrigin(0.5);
    const hint = this.scene.add
      .text(width / 2, height / 2 + 24, '点击重试', {
        color: '#ffffff',
        fontSize: '18px'
      })
      .setOrigin(0.5);
    overlay.add([bg, label, hint]);
    bg.once('pointerdown', () => {
      overlay.destroy();
      this.retryOverlay = null;
      onRetry();
    });
    this.retryOverlay = overlay;
  }

  destroy(): void {
    this.bar.destroy();
    this.border.destroy();
    this.text.destroy();
    this.retryOverlay?.destroy();
    this.retryOverlay = null;
  }
}
