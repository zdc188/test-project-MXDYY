import Phaser from 'phaser';
import { TouchInput } from '../systems/input/TouchInput';

const STICK_RADIUS = 56;
const KNOB_RADIUS = 24;
const DEADZONE = 0.1;

/** 虚拟摇杆（DES-03 / REQ-002）：左下角，触控拖动矢量归一化写入 TouchInput。 */
export class Joystick {
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private dragging = false;
  private touchId: number | null = null;
  private origin = { x: 0, y: 0 };

  constructor(
    private scene: Phaser.Scene,
    private touchInput: TouchInput
  ) {
    this.base = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.15)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(800)
      .setScrollFactor(0);
    this.knob = scene.add.circle(0, 0, KNOB_RADIUS, 0xffffff, 0.4)
      .setDepth(801)
      .setScrollFactor(0);
    this.reposition();
    this.bindEvents();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reposition, this);
  }

  /** UI 锚定：跟随 Scale Manager resize 按角落重排（DES-07）。 */
  reposition(): void {
    const { width, height } = this.scene.scale;
    const x = Math.max(80, width * 0.12);
    const y = Math.min(height - 80, height * 0.82);
    this.origin = { x, y };
    this.base.setPosition(x, y);
    this.knob.setPosition(x, y);
  }

  private bindEvents(): void {
    this.base.setInteractive({ useHandCursor: false });
    this.scene.input.addPointer(2);

    this.base.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.touchId = p.id;
      this.updateKnob(p.x, p.y);
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.isDown) {
        this.updateKnob(p.x, p.y);
      }
    });
    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.dragging && (this.touchId === null || this.touchId === p.id)) {
        this.reset();
      }
    });
  }

  private updateKnob(px: number, py: number): void {
    let dx = px - this.origin.x;
    let dy = py - this.origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS;
      dy = (dy / dist) * STICK_RADIUS;
    }
    this.knob.setPosition(this.origin.x + dx, this.origin.y + dy);
    const nx = dx / STICK_RADIUS;
    const ny = dy / STICK_RADIUS;
    if (Math.hypot(nx, ny) < DEADZONE) {
      this.touchInput.setStickVector(0, 0);
    } else {
      this.touchInput.setStickVector(nx, ny);
    }
  }

  private reset(): void {
    this.dragging = false;
    this.touchId = null;
    this.knob.setPosition(this.origin.x, this.origin.y);
    this.touchInput.setStickVector(0, 0); // 触控失灵 → 归零，角色原地
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reposition, this);
    this.base.destroy();
    this.knob.destroy();
  }
}
