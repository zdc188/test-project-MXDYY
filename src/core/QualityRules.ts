/** PerformanceMonitor 阈值判定纯逻辑（DES-08 / REQ-009）。 */
export interface QualityConfig {
  targetFps: number;
  sampleIntervalMs: number;
  windowSamples: number;
  l1: { avgFpsBelow: number; consecutiveWindows: number };
  l2: { avgFpsBelow: number; consecutiveWindows: number; renderScale: number };
  memory: { maxUsedJsHeapBytes: number };
}

export type QualityLevel = 0 | 1 | 2;

export interface WindowStats {
  avgFps: number;
}

/**
 * 只降不升：根据当前等级、窗口均值与连续低窗口计数计算下一等级。
 * 返回新的等级与是否发生降级。
 */
export function evaluateQuality(
  currentLevel: QualityLevel,
  l1Windows: WindowStats[],
  l2Windows: WindowStats[],
  config: QualityConfig
): { level: QualityLevel; degraded: boolean } {
  if (currentLevel >= 2) return { level: 2, degraded: false };

  const belowThreshold = (windows: WindowStats[], threshold: number, need: number): boolean => {
    if (windows.length < need) return false;
    return windows.slice(-need).every((w) => w.avgFps < threshold);
  };

  if (currentLevel === 0) {
    if (belowThreshold(l1Windows, config.l1.avgFpsBelow, config.l1.consecutiveWindows)) {
      return { level: 1, degraded: true };
    }
    return { level: 0, degraded: false };
  }

  // currentLevel === 1，评估是否进一步降为 L2
  if (belowThreshold(l2Windows, config.l2.avgFpsBelow, config.l2.consecutiveWindows)) {
    return { level: 2, degraded: true };
  }
  return { level: 1, degraded: false };
}

/** 内存判定（Chrome 系可用时）：usedJSHeapSize 超阈值直接触发 L2。 */
export function evaluateMemory(usedJsHeapBytes: number | null, config: QualityConfig): boolean {
  if (usedJsHeapBytes == null) return false;
  return usedJsHeapBytes > config.memory.maxUsedJsHeapBytes;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
