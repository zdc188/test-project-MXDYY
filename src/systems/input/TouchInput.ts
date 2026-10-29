import { InputIntent, InputSystem, joystickToIntent, emptyIntent } from './InputSystem';

/** H5 端触控输入实现（DES-03）：虚拟摇杆 + 攻击/交互按钮，状态由 Joystick UI 写入。 */
export class TouchInput implements InputSystem {
  private stickVector = { x: 0, y: 0 };
  private attackPressed = false;
  private interactPressed = false;
  private paused = false;

  setStickVector(x: number, y: number): void {
    this.stickVector = { x, y };
  }

  pressAttack(): void {
    this.attackPressed = true;
  }

  pressInteract(): void {
    this.interactPressed = true;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getIntent(): InputIntent {
    if (this.paused) return emptyIntent();
    const intent = joystickToIntent(this.stickVector.x, this.stickVector.y);
    // 按钮为一次性动作，消费后立即复位（帧级语义）
    intent.attack = this.attackPressed;
    intent.interact = this.interactPressed;
    this.attackPressed = false;
    this.interactPressed = false;
    return intent;
  }
}
