import { describe, expect, it } from 'vitest';
import { emptyIntent, joystickToIntent, keyboardToIntent } from './InputSystem';

describe('InputIntent 映射（DES-03）', () => {
  it('键盘状态 → Intent（WASD/方向键合并、E/J 透传）', () => {
    expect(
      keyboardToIntent({ up: true, down: false, left: false, right: false, attack: false, interact: false })
    ).toEqual({ moveX: 0, moveY: -1, attack: false, interact: false });
    expect(
      keyboardToIntent({ up: false, down: true, left: true, right: false, attack: true, interact: true })
    ).toEqual({ moveX: -1, moveY: 1, attack: true, interact: true });
    // 同时按下左右 → 归零（无输入异常）
    expect(
      keyboardToIntent({ up: false, down: false, left: true, right: true, attack: false, interact: false })
    ).toEqual({ ...emptyIntent(), moveX: 0 });
  });

  it('摇杆矢量 → Intent：deadzone 10% 内归零', () => {
    expect(joystickToIntent(0.05, 0.05)).toEqual(emptyIntent());
    expect(joystickToIntent(0.08, 0)).toEqual(emptyIntent());
    expect(joystickToIntent(0.99, 0)).toEqual({ moveX: 1, moveY: 0, attack: false, interact: false });
    expect(joystickToIntent(-0.99, 0)).toEqual({ moveX: -1, moveY: 0, attack: false, interact: false });
    expect(joystickToIntent(0, 0.99)).toEqual({ moveX: 0, moveY: 1, attack: false, interact: false });
  });

  it('触控失灵/多点混乱 → 摇杆矢量归零即 Intent 归零', () => {
    expect(joystickToIntent(0, 0)).toEqual(emptyIntent());
    expect(joystickToIntent(NaN, NaN)).toEqual(emptyIntent());
  });

  it('斜向矢量按 8 方向分区', () => {
    const d45 = Math.SQRT1_2;
    expect(joystickToIntent(d45, d45)).toEqual({
      moveX: 1, moveY: 1, attack: false, interact: false
    });
    // 接近水平轴的对角线只保留水平
    expect(joystickToIntent(0.99, 0.05)).toEqual({
      moveX: 1, moveY: 0, attack: false, interact: false
    });
  });
});
