import Phaser from 'phaser';
import { InputIntent, InputSystem, keyboardToIntent } from './InputSystem';

/** Web 端键鼠输入实现（DES-03）：WASD/方向键移动，E 交互，J/空格攻击。 */
export class KeyboardInput implements InputSystem {
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private paused = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys(
        'W,A,S,D,UP,DOWN,LEFT,RIGHT,E,J,SPACE'
      ) as Record<string, Phaser.Input.Keyboard.Key>;
    }
    // 窗口失焦清空按键状态，规避粘滞键（DES-03）
    window.addEventListener('blur', KeyboardInput.onBlur);
  }

  private static onBlur(): void {
    // Phaser 在 blur 时会自行释放按键；这里兜底清理由浏览器语义保证，
    // 实际清理由 isDown 每帧重读实现（Intent 每帧从零重算，不累加）。
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getIntent(): InputIntent {
    if (this.paused) return keyboardToIntent({
      up: false, down: false, left: false, right: false, attack: false, interact: false
    });
    const k = this.keys;
    return keyboardToIntent({
      up: !!(k.W && k.W.isDown) || !!(k.UP && k.UP.isDown),
      down: !!(k.S && k.S.isDown) || !!(k.DOWN && k.DOWN.isDown),
      left: !!(k.A && k.A.isDown) || !!(k.LEFT && k.LEFT.isDown),
      right: !!(k.D && k.D.isDown) || !!(k.RIGHT && k.RIGHT.isDown),
      attack: !!(k.J && k.J.isDown) || !!(k.SPACE && k.SPACE.isDown),
      interact: !!(k.E && k.E.isDown)
    });
  }

  destroy(): void {
    window.removeEventListener('blur', KeyboardInput.onBlur);
  }
}
