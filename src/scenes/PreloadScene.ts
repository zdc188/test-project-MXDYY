import Phaser from 'phaser';
import { LoadingUI } from '../ui/LoadingUI';

export const LOAD_TIMEOUT_MS = 30000;

/**
 * PreloadScene（DES-02 / REQ-007）：
 * 核心资源分包加载 + 进度条 + loaderror 失败重试 + 30s 超时。
 */
export class PreloadScene extends Phaser.Scene {
  static readonly KEY = 'PreloadScene';

  private loadingUI!: LoadingUI;
  private failedKeys: string[] = [];
  private timeoutTimer: Phaser.Time.TimerEvent | null = null;
  private finished = false;
  private timedOut = false;

  constructor() {
    super(PreloadScene.KEY);
  }

  create(): void {
    this.loadingUI = new LoadingUI(this);
    this.registerHooks();
    this.beginLoad();
  }

  private registerHooks(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      this.loadingUI.setProgress(p);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failedKeys.push(file.key);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.timeoutTimer?.remove();
      if (this.timedOut) return;
      if (this.failedKeys.length > 0) {
        this.showRetry('资源加载失败', this.failedKeys.length);
      } else {
        this.enterGame();
      }
    });
  }

  private beginLoad(): void {
    this.failedKeys = [];
    // 核心资源包（DES-02 分包机制，后续玩法包按需追加）
    this.load.pack('core', 'assets/packs/core.json');
    this.load.start();
    // 30s 超时：独立定时器（DES-02）
    this.timeoutTimer?.remove();
    this.timeoutTimer = this.time.delayedCall(LOAD_TIMEOUT_MS, () => {
      if (this.finished) return;
      this.timedOut = true;
      this.load.reset();
      this.showRetry('资源加载超时', this.failedKeys.length);
    });
  }

  /** 重试：重新加载资源包，已成功的资源自动跳过，仅失败项重载。 */
  private showRetry(message: string, failedCount: number): void {
    this.timeoutTimer?.remove();
    this.loadingUI.showRetry(
    failedCount > 0 ? `${message}（${failedCount} 项资源）` : message,
      () => {
      this.timedOut = false;
    this.beginLoad();
  }
      );
    }

  private enterGame(): void {
    this.finished = true;
    this.loadingUI.destroy();
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}

/** BootScene：场景流入口（DES-02）。 */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
  }

  create(): void {
    this.scene.start(PreloadScene.KEY);
  }
}
