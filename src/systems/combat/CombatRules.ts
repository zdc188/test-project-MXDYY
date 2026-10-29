/** 战斗规则纯逻辑（DES-06 / REQ-006）：固定伤害 + 1s 无敌帧。 */
export const PLAYER_MAX_HP = 100;
export const PLAYER_ATTACK_DAMAGE = 20;
export const PLAYER_ATTACK_COOLDOWN_MS = 500;
export const PLAYER_ATTACK_RANGE = 48; // 攻击框 48×48
export const ENEMY_CONTACT_DAMAGE = 10;
export const ENEMY_KNOCKBACK_PX = 64;
export const INVINCIBLE_MS = 1000;
export const ENEMY_RESPAWN_MS = 3000;

export interface CombatantState {
  hp: number;
  maxHp: number;
  invincibleUntil: number;
}

export function createCombatant(maxHp: number): CombatantState {
  return { hp: maxHp, maxHp, invincibleUntil: 0 };
}

/** 尝试施加伤害：无敌期内不生效。返回是否命中。 */
export function tryApplyDamage(
  target: CombatantState,
  damage: number,
  now: number
): boolean {
  if (now < target.invincibleUntil) return false;
  target.hp = Math.max(0, target.hp - damage);
  target.invincibleUntil = now + INVINCIBLE_MS;
  return true;
}

/** 攻击冷却判定。 */
export function canAttack(lastAttackAt: number, now: number): boolean {
  return now - lastAttackAt >= PLAYER_ATTACK_COOLDOWN_MS;
}

/** 攻击框中心偏移：角色面向方向偏移 32px，命中区域 48×48。 */
export function attackBoxCenter(
  x: number,
  y: number,
  facing: 'left' | 'right' | 'up' | 'down'
): { cx: number; cy: number } {
  const offset = 32;
  switch (facing) {
    case 'left':
      return { cx: x - offset, cy: y };
    case 'right':
      return { cx: x + offset, cy: y };
    case 'up':
      return { cx: x, cy: y - offset };
    case 'down':
    default:
      return { cx: x, cy: y + offset };
  }
}

/** AABB 重叠判定（攻击框 vs 敌人）。 */
export function aabbOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) * 2 < a.width + b.width &&
    Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) * 2 < a.height + b.height
  );
}
