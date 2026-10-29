import Phaser from 'phaser';

export interface NpcConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: string;
  dialog: string[];
}

export const INTERACT_RANGE = 64;

/** NPC 实体（DES-05）：配置驱动，交互范围提示气泡由场景控制。 */
export class Npc extends Phaser.GameObjects.Container {
  readonly id: string;
  readonly name: string;
  readonly dialog: string[];
  readonly configX: number;
  readonly configY: number;
  inDialog = false;

  private bubble: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: NpcConfig) {
    super(scene, config.x, config.y);
    this.id = config.id;
    this.name = config.name;
    this.dialog = config.dialog;
    this.configX = config.x;
    this.configY = config.y;

    const sprite = scene.add.sprite(0, 0, 'npc');
    this.add(sprite);

    this.bubble = scene.add.graphics();
    this.bubble.fillStyle(0xffffff, 0.9);
    this.bubble.fillRoundedRect(-18, -44, 36, 16, 4);
    this.bubble.fillStyle(0x333333, 1);
    this.bubble.fillCircle(0, -36, 3);
    this.bubble.setVisible(false);
    this.add(this.bubble);

    scene.add.existing(this);
    this.setDepth(8);
  }

  setShowBubble(visible: boolean): void {
    // 状态异常（对话中）不显示提示
    this.bubble.setVisible(visible && !this.inDialog);
  }

  isInteractable(): boolean {
    return !this.inDialog;
  }

  distanceTo(x: number, y: number): number {
    return Math.hypot(this.x - x, this.y - y);
  }
}
