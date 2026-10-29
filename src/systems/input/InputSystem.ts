/** 输入抽象（DES-03 / REQ-003）：双端每帧从零重算 Intent，异常自然归零。 */
export interface InputIntent {
  moveX: number; // -1 左，1 右
  moveY: number; // -1 上，1 下
  attack: boolean;
  interact: boolean;
}

export function emptyIntent(): InputIntent {
  return { moveX: 0, moveY: 0, attack: false, interact: false };
}

export interface InputSystem {
  /** 每帧产出 Intent（不累加增量，触控失灵/多点混乱自然归零）。 */
  getIntent(): InputIntent;
  /** 释放资源（键盘监听等）。 */
  destroy?(): void;
}

/** 摇杆矢量 → Intent，deadzone 10%（DES-03）。 */
export function joystickToIntent(vx: number, vy: number): InputIntent {
  const magnitude = Math.hypot(vx, vy);
  const deadzone = 0.1;
  if (magnitude < deadzone) return emptyIntent();
  const nx = vx / magnitude;
  const ny = vy / magnitude;
  const axisThreshold = 0.3826834; // cos(67.5°)：8 方向分区
  return {
    moveX: Math.abs(nx) > axisThreshold ? Math.sign(nx) : 0,
    moveY: Math.abs(ny) > axisThreshold ? Math.sign(ny) : 0,
    attack: false,
    interact: false
  };
}

/** 键盘按键状态 → Intent（WASD/方向键 + E 交互 + J/空格攻击）。 */
export function keyboardToIntent(
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    attack: boolean;
    interact: boolean;
  }
): InputIntent {
  return {
    moveX: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
    moveY: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
    attack: keys.attack,
    interact: keys.interact
  };
}
