/** 碰撞异常回退规则（DES-04 / REQ-004）：位置异常检测 + lastSafePos 回退。 */
export interface Vec2 {
  x: number;
  y: number;
}

export const SAFE_POS_SAMPLE_MS = 500;
export const MAX_OVERLAP_DEPTH = 32;
export const MAX_SPEED = 2000;

export function isPositionInvalid(pos: Vec2, speed: number): boolean {
  return (
    Number.isNaN(pos.x) ||
    Number.isNaN(pos.y) ||
    Math.abs(speed) > MAX_SPEED
  );
}

export function overlapDepth(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const cx = Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) * 2;
  const cy = Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) * 2;
  // 取最小穿透轴（AABB 分离语义）
  return Math.min(a.width + b.width - cx, a.height + b.height - cy);
}

/** 碰撞异常判定：重叠深度超限或位置非法。 */
export function isCollisionAbnormal(
  overlap: number,
  pos: Vec2,
  speed: number
): boolean {
  return overlap > MAX_OVERLAP_DEPTH || isPositionInvalid(pos, speed);
}

export interface SafePosTracker {
  lastSafePos: Vec2;
  lastSampleAt: number;
}

export function createSafePosTracker(start: Vec2, now: number): SafePosTracker {
  return { lastSafePos: { ...start }, lastSampleAt: now };
}

/** 每 500ms 且无碰撞时采样更新安全点。 */
export function maybeSampleSafePos(
  tracker: SafePosTracker,
  pos: Vec2,
  hasCollision: boolean,
  now: number
): void {
  if (!hasCollision && now - tracker.lastSampleAt >= SAFE_POS_SAMPLE_MS) {
    tracker.lastSafePos = { x: pos.x, y: pos.y };
    tracker.lastSampleAt = now;
  }
}

/** 异常回退：回到 lastSafePos。 */
export function fallbackToSafePos(
  tracker: SafePosTracker
): Vec2 {
  return { ...tracker.lastSafePos };
}
