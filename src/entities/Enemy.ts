import Phaser from 'phaser';
import { CombatantState, createCombatant } from '../systems/combat/CombatRules';

export interface EnemyConfig {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  speed: number;
  patrol: { x: number; y: number }[];
}

/** 敌人实体（DES-06）：巡逻 AI + 血量/无敌帧 + 死亡重生。 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  readonly name: string;
  readonly speed: number;
  readonly spawn: { x: number; y: number };
  readonly patrol: { x: number; y: number }[];
  combat: CombatantState;
  hpBar: Phaser.GameObjects.Rectangle | null = null;
  hpBarTimer = 0;
  diedAt = -1;

  private patrolIndex = 0;

  constructor(scene: Phaser.Scene, config: EnemyConfig) {
    super(scene, config.x, config.y, 'enemy');
    this.id = config.id;
    this.name = config.name;
    this.speed = config.speed;
    this.spawn = { x: config.x, y: config.y };
    this.patrol = config.patrol;
    this.combat = createCombatant(config.hp);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setSize(24, 24);
    this.setOffset(4, 4);
    this.setDepth(9);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /** 巡逻：两点往返，速度由配置决定。 */
  patrolUpdate(speed: number): void {
    if (!this.active) return;
    const target = this.patrol[this.patrolIndex % this.patrol.length];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.patrolIndex += 1;
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
  }

  takeDamage(damage: number, now: number): boolean {
    const applied = this.combat.hp > 0 && now >= this.combat.invincibleUntil;
    if (applied) {
      this.combat.hp = Math.max(0, this.combat.hp - damage);
      this.combat.invincibleUntil = now + 1000;
      if (this.hpBar) this.hpBar.setVisible(true);
      this.hpBarTimer = now + 3000;
    }
    return applied;
  }

  isAlive(): boolean {
    return this.active && this.combat.hp > 0;
  }

  die(now: number): void {
    this.diedAt = now;
    this.setActive(false).setVisible(false);
    this.setVelocity(0, 0);
    if (this.hpBar) this.hpBar.setVisible(false);
  }

  /** 3s 后在出生点满血重生。 */
  tryRespawn(now: number, respawnMs: number): boolean {
    if (this.active || this.diedAt < 0) return false;
    if (now - this.diedAt < respawnMs) return false;
    this.combat.hp = this.combat.maxHp;
    this.combat.invincibleUntil = 0;
    this.setPosition(this.spawn.x, this.spawn.y);
    this.setActive(true).setVisible(true);
    this.diedAt = -1;
    return true;
  }
}
