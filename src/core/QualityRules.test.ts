import { describe, expect, it } from 'vitest';
import qualityConfigJson from '../data/quality.json';
import {
  QualityConfig,
  evaluateMemory,
  evaluateQuality,
  WindowStats
} from './QualityRules';

const config = qualityConfigJson as QualityConfig;

function windows(fpsValues: number[]): WindowStats[] {
  return fpsValues.map((avgFps) => ({ avgFps }));
}

describe('PerformanceMonitor 阈值判定（DES-08）', () => {
  it('高帧率不降级', () => {
    expect(evaluateQuality(0, windows([60, 60]), windows([60, 60]), config)).toEqual({
      level: 0,
      degraded: false
    });
  });

  it('L1：5s 平均 FPS < 25 且连续 2 个窗口触发', () => {
    // 仅 1 个低窗口不触发
    expect(evaluateQuality(0, windows([24]), windows([]), config).degraded).toBe(false);
    // 连续 2 个低窗口触发 L1
    expect(evaluateQuality(0, windows([24, 23]), windows([]), config)).toEqual({
      level: 1,
      degraded: true
    });
  });

  it('L1 后 5s 平均 FPS 仍 < 20 且再连续 2 个窗口触发 L2', () => {
    expect(evaluateQuality(1, windows([19, 18]), windows([19, 18]), config)).toEqual({
      level: 2,
      degraded: true
    });
    // L1 后仍有 25~∞ 之间不升不降
    expect(evaluateQuality(1, windows([25, 30]), windows([25, 30]), config)).toEqual({
      level: 1,
      degraded: false
    });
  });

  it('只降不升：L2 后帧率恢复不再变化', () => {
    expect(evaluateQuality(2, windows([60, 60]), windows([60, 60]), config)).toEqual({
      level: 2,
      degraded: false
    });
  });

  it('L1 阈值边界：25 恰好不触发', () => {
    expect(evaluateQuality(0, windows([25, 25]), windows([25, 25]), config).degraded).toBe(false);
    expect(evaluateQuality(0, windows([24.9, 24.9]), windows([24.9, 24.9]), config).degraded).toBe(true);
  });

  it('内存超 300MB 触发 L2，API 不可用时跳过', () => {
    expect(evaluateMemory(null, config)).toBe(false);
    expect(evaluateMemory(200 * 1024 * 1024, config)).toBe(false);
    expect(evaluateMemory(301 * 1024 * 1024, config)).toBe(true);
  });
});
