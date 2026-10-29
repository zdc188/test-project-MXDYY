import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { detectDevice, getRuntimeDeviceTraits } from '../core/Device';
import { TouchInput } from '../systems/input/TouchInput';
import { KeyboardInput } from '../systems/input/KeyboardInput';
import { HUD } from '../ui/HUD';
import { DialogBox } from '../ui/DialogBox';
import { Joystick } from '../ui/Joystick';
import { RotateHint } from '../ui/Overlays';
import { showDegradeToast } from '../ui/Overlays';

export const DEVICE_KEY = 'device';

/**
 * UIScene（DES-02/DES-03/DES-07）：常驻并行 UI 层。
 * 持有输入系统与 HUD/对话/摇杆/旋转提示；GameScene 消费 Intent。
 */
export class UIScene extends Phaser.Scene {
  static readonly KEY = 'UIScene';

  keyboardInput!: KeyboardInput;
  touchInput!: TouchInput;
  device: 'web' | 'h5' = 'web';
  dialog!: DialogBox;
  hud!: HUD;
  joystick: Joystick | null = null;
  private interactBtn: Phaser.GameObjects.Arc | null = null;
  private attackBtn: Phaser.GameObjects.Arc | null = null;

  constructor() {
    super(UIScene.KEY);
  }

  create(): void {
    this.device = detectDevice(getRuntimeDeviceTraits());
    this.registry.set(DEVICE_KEY, this.device);

    this.keyboardInput = new KeyboardInput(this);
    this.touchInput = new TouchInput();

    if (this.device === 'h5') {
      this.joystick = new Joystick(this, this.touchInput);
      this.createTouchButtons();
    }
    new RotateHint(this);
    this.hud = new HUD(this);
    this.dialog = new DialogBox(this);

    EventBus.on(GameEvents.QualityDegraded, this.onDegraded, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.repositionButtons, this);
  }

  /** 右下角攻击按钮常显，交互按钮仅在 NPC 交互范围内显示（DES-03）。 */
  private createTouchButtons(): void {
    const { width, height } = this.scale;
    this.attackBtn = this.add
      .circle(width - 70, height - 70, 36, 0xe53935, 0.65)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(810)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const atkLabel = this.add
      .text(width - 70, height - 70, '攻击', { color: '#ffffff', fontSize: '14px' })
      .setOrigin(0.5)
      .setDepth(811)
      .setScrollFactor(0);
    atkLabel.setName('atkLabel');
    this.attackBtn.setName('attackBtn');
    this.attackBtn.on('pointerdown', () => this.touchInput.pressAttack());

    this.interactBtn = this.add
      .circle(width - 150, height - 100, 30, 0x4caf50, 0.65)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(810)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    const itcLabel = this.add
      .text(width - 150, height - 100, '对话', { color: '#ffffff', fontSize: '13px' })
      .setOrigin(0.5)
      .setDepth(811)
      .setScrollFactor(0)
      .setVisible(false);
    itcLabel.setName('itcLabel');
    this.interactBtn.setName('interactBtn');
    this.interactBtn.on('pointerdown', () => this.touchInput.pressInteract());
  }

  setInteractAvailable(available: boolean): void {
    this.interactBtn?.setVisible(available);
    const label = this.children.getByName('itcLabel');
    if (label instanceof Phaser.GameObjects.Text) label.setVisible(available);
  }

  /** UI 锚定：resize 时按角落重排（DES-07）。 */
  private repositionButtons(): void {
    const { width, height } = this.scale;
    const attackBtn = this.children.getByName('attackBtn');
    const atkLabel = this.children.getByName('atkLabel');
    const interactBtn = this.children.getByName('interactBtn');
    const itcLabel = this.children.getByName('itcLabel');
    if (attackBtn instanceof Phaser.GameObjects.Arc) attackBtn.setPosition(width - 70, height - 70);
    if (atkLabel instanceof Phaser.GameObjects.Text) atkLabel.setPosition(width - 70, height - 70);
    if (interactBtn instanceof Phaser.GameObjects.Arc) interactBtn.setPosition(width - 150, height - 100);
    if (itcLabel instanceof Phaser.GameObjects.Text) itcLabel.setPosition(width - 150, height - 100);
  }

  private onDegraded(level: number): void {
    showDegradeToast(this, level);
  }

  /** 对话期间冻结移动 Intent（DES-05）。 */
  freezeForDialog(frozen: boolean): void {
    this.keyboardInput.setPaused(frozen);
    this.touchInput.setPaused(frozen);
  }

  destroy(): void {
    EventBus.off(GameEvents.QualityDegraded, this.onDegraded, this);
  }
}
