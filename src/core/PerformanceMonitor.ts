import { EventBus, GameEvents } from './EventBus';
import qualityConfigJson from '../data/quality.json';
import {
  QualityConfig,
  QualityLevel,
  WindowStats,
  evaluateMemory,
  evaluateQuality,
  average
} from './QualityRules';

/**
 * 性能监控（DES-08 / REQ-009）：
 * 每 500ms 采样实际 FPS，5s 滑动窗口均值，按阈值只降不升级；
 * H5 端默认启用降级，Web 端仅采样不降级。
 */
export class PerformanceMonitor {
  private config: QualityConfig = qualityConfigJson as QualityConfig;
  private level: QualityLevel = 0;
  private samples: number[] = [];
  private l1Windows: WindowStats[] = [];
  private l2Windows: WindowStats[] = [];
  private memoryTouchedL2 = false;

  constructor(
    private getFps: () => number,
    private degradeEnabled: boolean,
    private getMemoryUsage: () => number | null = () => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return perf.memory ? perf.memory.usedJSHeapSize : null;
    }
  ) {}

  /** 由场景 update 按节流间隔调用。 */
  tick(now: number, lastTickAt: number): number {
    return now - lastTickAt;
  }

  shouldSample(now: number, lastSampleAt: number): boolean {
    return now - lastSampleAt >= this.config.sampleIntervalMs;
  }

  /** 采样一次 FPS；返回当前质量等级。 */
  sample(): QualityLevel {
    this.samples.push(this.getFps());
    if (this.samples.length > this.config.windowSamples) {
      this.samples.shift();
    }
    if (this.samples.length === this.config.windowSamples) {
      const stats: WindowStats = { avgFps: average(this.samples) };
      this.l1Windows.push(stats);
      this.l2Windows.push(stats);
      if (this.l1Windows.length > 8) this.l1Windows.shift();
      if (this.l2Windows.length > 8) this.l2Windows.shift();
    }

    if (!this.degradeEnabled) return this.level;

    let result = evaluateQuality(this.level, this.l1Windows, this.l2Windows, this.config);
    if (!result.degraded && !this.memoryTouchedL2 && evaluateMemory(this.getMemoryUsage(), this.config)) {
      // 内存超阈值直接 L2（只降一次，避免重复广播）
      result = { level: 2, degraded: true };
      this.memoryTouchedL2 = true;
    }
    if (result.degraded) {
      this.level = result.level;
      EventBus.emit(GameEvents.QualityDegraded, this.level);
    }
    return this.level;
  }

  get currentLevel(): QualityLevel {
    return this.level;
  }

  get renderScale(): number {
    return this.level >= 2 ? this.config.l2.renderScale : 1;
  }
}
