import { describe, expect, it } from 'vitest';
import {
  createSafePosTracker,
  fallbackToSafePos,
  isCollisionAbnormal,
  isPositionInvalid,
  maybeSampleSafePos,
  overlapDepth,
  SAFE_POS_SAMPLE_MS
} from './SafePosition';

describe('lastSafePos 回退规则（DES-04）', () => {
  it('位置 NaN 或速度异常判定非法', () => {
    expect(isPositionInvalid({ x: NaN, y: 100 }, 100)).toBe(true);
    expect(isPositionInvalid({ x: 100, y: NaN }, 100)).toBe(true);
    expect(isPositionInvalid({ x: 100, y: 100 }, 2401)).toBe(true);
    expect(isPositionInvalid({ x: 100, y: 100 }, 240)).toBe(false);
  });

  it('重叠深度超过 32px 判定碰撞异常', () => {
    const player = { x: 0, y: 0, width: 28, height: 36 };
    // 完全重叠：最小穿透轴深度 = 宽度和 56
    expect(overlapDepth(player, { x: 0, y: 0, width: 28, height: 36 })).toBe(56);
    expect(isCollisionAbnormal(overlapDepth(player, { x: 0, y: 0, width: 28, height: 36 }), { x: 0, y: 0 }, 100)).toBe(true);
    // 轻微接触（深度 ≤ 32）不判定异常
    expect(overlapDepth(player, { x: 26, y: 0, width: 28, height: 36 })).toBe(4);
    expect(isCollisionAbnormal(33, { x: 0, y: 0 }, 100)).toBe(true);
    expect(isCollisionAbnormal(32, { x: 0, y: 0 }, 100)).toBe(false);
  });

  it('每 500ms 且无碰撞时采样安全点', () => {
    const tracker = createSafePosTracker({ x: 0, y: 0 }, 0);
    maybeSampleSafePos(tracker, { x: 100, y: 100 }, false, 100);
    expect(tracker.lastSafePos).toEqual({ x: 0, y: 0 }); // 未到间隔
    maybeSampleSafePos(tracker, { x: 100, y: 100 }, false, SAFE_POS_SAMPLE_MS);
    expect(tracker.lastSafePos).toEqual({ x: 100, y: 100 });
    // 有碰撞不采样
    maybeSampleSafePos(tracker, { x: 200, y: 200 }, true, SAFE_POS_SAMPLE_MS * 2);
    expect(tracker.lastSafePos).toEqual({ x: 100, y: 100 });
  });

  it('异常时回退到 lastSafePos（副本）', () => {
    const tracker = createSafePosTracker({ x: 50, y: 60 }, 0);
    const safe = fallbackToSafePos(tracker);
    expect(safe).toEqual({ x: 50, y: 60 });
    safe.x = 999;
    expect(tracker.lastSafePos.x).toBe(50);
  });
});
