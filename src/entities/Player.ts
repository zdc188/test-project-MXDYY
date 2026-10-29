import Phaser from 'phaser';
import { InputIntent } from '../systems/input/InputSystem';

export const PLAYER_SPEED = 240;
export const PLAYER_SIZE = { width: 28, height: 36 };

/** 玩家实体（DES-03/DES-04/DES-06）：位移交由 Arcade 物理积分，仅消费 Intent。 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 'left' | 'right' | 'up' | 'down' = 'right';
  private frozen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setSize(PLAYER_SIZE.width, PLAYER_SIZE.height);
    this.setOffset(2, 4);
    this.setDepth(10);
  }

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) this.setVelocity(0, 0);
  }

  private knockbackUntil = 0;

      /** 击退：短时间内由击退速度接管，避免被下一帧输入覆盖（DES-06）。 */
      knockback(vx: number, vy: number, durationMs: number): void {
    this.knockbackUntil = this.scene.time.now + durationMs;
      this.setVelocity(vx, vy);
    }

    private isKnockbackActive(): boolean {
      return this.scene.time.now < this.knockbackUntil;
    }

    applyIntent(intent: InputIntent): void {
      if (this.frozen || this.isKnockbackActive()) {
        return;
      }
    const len = Math.hypot(intent.moveX, intent.moveY);
    if (len > 0) {
      this.setVelocity(
        (intent.moveX / len) * PLAYER_SPEED,
        (intent.moveY / len) * PLAYER_SPEED
      );
      // 面向优先水平
      if (intent.moveX !== 0) {
        this.facing = intent.moveX > 0 ? 'right' : 'left';
      } else if (intent.moveY < 0) {
        this.facing = 'up';
      } else if (intent.moveY > 0) {
        this.facing = 'down';
      }
    } else {
      // 输入异常/无输入 → 原地
      this.setVelocity(0, 0);
    }
  }
}
