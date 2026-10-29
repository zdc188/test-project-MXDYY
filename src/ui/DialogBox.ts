import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';

/** 对话框（DES-05）：打字机逐字显示，点击/按键翻页，对话期间移动 Intent 冻结。 */
export class DialogBox {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private fullText = '';
  private charIndex = 0;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private lines: string[] = [];
  private activeNpcId: string | null = null;
  private onClosed: (() => void) | null = null;

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    const bg = scene.add
      .rectangle(width / 2, height - 70, width - 40, 90, 0x000000, 0.8)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.nameText = scene.add
      .text(40, height - 110, '', { color: '#ffd700', fontSize: '14px' });
    this.text = scene.add
      .text(40, height - 92, '', {
        color: '#ffffff',
        fontSize: '16px',
        wordWrap: { width: width - 80 }
      });
    const hint = scene.add
      .text(width - 40, height - 28, '点击继续 ▼', {
        color: '#aaaaaa',
        fontSize: '12px'
      })
      .setOrigin(1, 1);
    this.container.add([bg, this.nameText, this.text, hint]);
    bg.on('pointerdown', () => this.advance());
    scene.input.keyboard?.on('keydown-SPACE', () => this.advance());
    scene.input.keyboard?.on('keydown-E', () => this.advance());
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  open(npcId: string, npcName: string, lines: string[], onClosed: () => void): void {
    // 状态异常（已在对话中）直接 return，不产生副作用（DES-05）
    if (this.isOpen()) return;
    this.activeNpcId = npcId;
    this.lines = [...lines];
    this.onClosed = onClosed;
    this.nameText.setText(npcName);
    this.container.setVisible(true);
    EventBus.emit(GameEvents.NpcDialogOpened, npcId);
    this.showLine(0);
  }

  private showLine(index: number): void {
    if (index >= this.lines.length) {
      this.close();
      return;
    }
    this.fullText = this.lines[index];
    this.charIndex = 0;
    this.text.setText('');
    this.typeTimer?.remove();
    this.typeTimer = this.scene.time.addEvent({
      delay: 40,
      repeat: this.fullText.length - 1,
      callback: () => {
        this.charIndex += 1;
        this.text.setText(this.fullText.slice(0, this.charIndex));
      }
    });
    this.lineIndex = index;
  }

  private lineIndex = 0;

  /** 点击/按键：未显示完则立刻显示完，否则下一页。 */
  advance(): void {
    if (!this.isOpen()) return;
    if (this.charIndex < this.fullText.length) {
      this.typeTimer?.remove();
      this.charIndex = this.fullText.length;
      this.text.setText(this.fullText);
      return;
    }
    this.showLine(this.lineIndex + 1);
  }

  private close(): void {
    this.container.setVisible(false);
    this.typeTimer?.remove();
    const npcId = this.activeNpcId;
    this.activeNpcId = null;
    EventBus.emit(GameEvents.NpcDialogClosed, npcId);
    this.onClosed?.();
    this.onClosed = null;
  }
}
