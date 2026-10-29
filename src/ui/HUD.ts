import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { PLAYER_MAX_HP } from '../systems/combat/CombatRules';

/** HUD（DES-06）：左上血条 + 击杀数，敌人头顶血条由 Enemy 自绘。 */
export class HUD {
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private killText: Phaser.GameObjects.Text;
  private kills = 0;

  constructor(private scene: Phaser.Scene) {
    this.hpBar = scene.add
      .rectangle(20, 20, 160, 12, 0xe53935)
      .setOrigin(0, 0)
      .setDepth(850)
      .setScrollFactor(0);
    scene.add
      .rectangle(20, 20, 160, 12)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff)
      .setDepth(851)
      .setScrollFactor(0);
    this.hpText = scene.add
      .text(20, 36, 'HP 100/100', { color: '#ffffff', fontSize: '12px' })
      .setDepth(852)
      .setScrollFactor(0);
    this.killText = scene.add
      .text(20, 54, '击杀 0', { color: '#ffd700', fontSize: '14px' })
      .setDepth(852)
      .setScrollFactor(0);
    this.reposition();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reposition, this);

    EventBus.on(GameEvents.PlayerDamaged, this.onPlayerDamaged, this);
    EventBus.on(GameEvents.PlayerDied, this.onPlayerDied, this);
    EventBus.on(GameEvents.PlayerRespawned, this.onPlayerRespawned, this);
    EventBus.on(GameEvents.EnemyKilled, this.onEnemyKilled, this);
  }

  /** UI 锚定（DES-07）。 */
  private reposition(): void {
    const { width } = this.scene.scale;
    this.killText.setPosition(width - 100, 20);
  }

  private onPlayerDamaged(hp: unknown): void {
    this.setHp(typeof hp === 'number' ? hp : PLAYER_MAX_HP);
  }

  private onPlayerDied(): void {
    this.setHp(0);
  }

  private onPlayerRespawned(): void {
    this.setHp(PLAYER_MAX_HP);
  }

  private onEnemyKilled(): void {
    this.kills += 1;
    this.killText.setText(`击杀 ${this.kills}`);
  }

  private setHp(hp: number): void {
    const ratio = Phaser.Math.Clamp(hp / PLAYER_MAX_HP, 0, 1);
    this.hpBar.width = 160 * ratio;
    this.hpText.setText(`HP ${Math.max(0, Math.round(hp))}/${PLAYER_MAX_HP}`);
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reposition, this);
    EventBus.off(GameEvents.PlayerDamaged, this.onPlayerDamaged, this);
    EventBus.off(GameEvents.PlayerDied, this.onPlayerDied, this);
    EventBus.off(GameEvents.PlayerRespawned, this.onPlayerRespawned, this);
    EventBus.off(GameEvents.EnemyKilled, this.onEnemyKilled, this);
    this.hpBar.destroy();
    this.hpText.destroy();
    this.killText.destroy();
  }
}
