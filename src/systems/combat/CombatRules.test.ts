import { describe, expect, it } from 'vitest';
import {
  attackBoxCenter,
  aabbOverlap,
  canAttack,
  createCombatant,
  tryApplyDamage,
  INVINCIBLE_MS,
  PLAYER_ATTACK_COOLDOWN_MS
} from './CombatRules';

describe('伤害与无敌帧规则（DES-06）', () => {
  it('受击扣血并获得无敌帧', () => {
    const enemy = createCombatant(40);
    expect(tryApplyDamage(enemy, 20, 1000)).toBe(true);
    expect(enemy.hp).toBe(20);
    expect(enemy.invincibleUntil).toBe(1000 + INVINCIBLE_MS);
  });

  it('无敌期内不再受伤', () => {
    const enemy = createCombatant(40);
    tryApplyDamage(enemy, 20, 1000);
    expect(tryApplyDamage(enemy, 20, 1500)).toBe(false);
    expect(enemy.hp).toBe(20);
  });

  it('无敌期结束后可再次受伤，血量不为负', () => {
    const enemy = createCombatant(40);
    tryApplyDamage(enemy, 20, 1000);
    expect(tryApplyDamage(enemy, 20, 1000 + INVINCIBLE_MS)).toBe(true);
    expect(enemy.hp).toBe(0);
    expect(tryApplyDamage(enemy, 20, 5000)).toBe(true);
    expect(enemy.hp).toBe(0);
  });

  it('攻击冷却 0.5s 判定', () => {
    expect(canAttack(0, 499)).toBe(false);
    expect(canAttack(0, PLAYER_ATTACK_COOLDOWN_MS)).toBe(true);
  });

  it('攻击框中心按面向偏移 32px', () => {
    expect(attackBoxCenter(100, 100, 'left')).toEqual({ cx: 68, cy: 100 });
    expect(attackBoxCenter(100, 100, 'right')).toEqual({ cx: 132, cy: 100 });
    expect(attackBoxCenter(100, 100, 'up')).toEqual({ cx: 100, cy: 68 });
    expect(attackBoxCenter(100, 100, 'down')).toEqual({ cx: 100, cy: 132 });
  });

  it('AABB 重叠判定', () => {
    const box = { x: 0, y: 0, width: 48, height: 48 };
    expect(aabbOverlap(box, { x: 40, y: 40, width: 24, height: 24 })).toBe(true);
    expect(aabbOverlap(box, { x: 100, y: 100, width: 24, height: 24 })).toBe(false);
  });
});
