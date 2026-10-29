import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { PerformanceMonitor } from '../core/PerformanceMonitor';
import { detectDevice, getRuntimeDeviceTraits } from '../core/Device';
import { Player } from '../entities/Player';
import { Enemy, EnemyConfig } from '../entities/Enemy';
import { Npc, NpcConfig } from '../entities/Npc';
import { InputIntent } from '../systems/input/InputSystem';
import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_KNOCKBACK_PX,
  ENEMY_RESPAWN_MS,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_MAX_HP,
  attackBoxCenter,
  aabbOverlap,
  canAttack
} from '../systems/combat/CombatRules';
import {
  SafePosTracker,
  createSafePosTracker,
  fallbackToSafePos,
  isCollisionAbnormal,
  maybeSampleSafePos,
  overlapDepth
} from '../systems/collision/SafePosition';
import { findInteractableNpc } from '../systems/interaction/NpcInteraction';
import npcData from '../data/npc.json';
import enemyData from '../data/enemy.json';
import { UIScene } from './UIScene';
import { showDeathOverlay } from '../ui/Overlays';

/**
 * GameScene（DES-04/05/06）：地图碰撞、NPC 交互、即时制战斗、状态收敛与降级联动。
 */
export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  private player!: Player;
  private enemies: Enemy[] = [];
  private npcs: Npc[] = [];
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private gameState = new GameState();
  private perf!: PerformanceMonitor;
  private degradeEnabled = false;
  private hp = PLAYER_MAX_HP;
  private lastAttackAt = -1000;
  private invincibleUntil = 0;
  private safePos!: SafePosTracker;
  private perfLastSampleAt = 0;
  private died = false;
  private ui!: UIScene;

  constructor() {
    super(GameScene.KEY);
  }

  create(): void {
    this.ui = this.scene.get(UIScene.KEY) as UIScene;
    // UIScene 与 GameScene 同帧启动，避免读取其未初始化状态，直接基于设备特征判定（R-001）
    this.degradeEnabled = detectDevice(getRuntimeDeviceTraits()) === 'h5';
    this.perf = new PerformanceMonitor(
      () => this.game.loop.actualFps,
      this.degradeEnabled
    );

    this.buildMap();

    this.player = new Player(this, this.gameState.player.x, this.gameState.player.y);
    this.physics.world.setBoundsCollision(true, true, true, true);

    this.buildNpcs();
    this.buildEnemies();

    this.physics.add.collider(this.player, this.obstacles);
    this.enemies.forEach((e) => this.physics.add.collider(e, this.obstacles));

    // 接触战斗判定（DES-06）
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_p, enemyObj) => this.onEnemyContact(enemyObj)
    );

    this.safePos = createSafePosTracker(
      { x: this.player.x, y: this.player.y },
      this.time.now
    );

    EventBus.on(GameEvents.NpcDialogOpened, this.onDialogOpened, this);
    EventBus.on(GameEvents.NpcDialogClosed, this.onDialogClosed, this);
    EventBus.on(GameEvents.QualityDegraded, this.onDegraded, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.NpcDialogOpened, this.onDialogOpened, this);
      EventBus.off(GameEvents.NpcDialogClosed, this.onDialogClosed, this);
      EventBus.off(GameEvents.QualityDegraded, this.onDegraded, this);
    });
  }

  private buildMap(): void {
    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('tileset', 'tileset');
    map.createLayer('ground', tileset!, 0, 0)!.setDepth(0);

    // 障碍对象层 → Arcade StaticGroup（DES-04）
    this.obstacles = this.physics.add.staticGroup();
    const obstaclesLayer = map.getObjectLayer('obstacles');
    if (obstaclesLayer) {
      for (const obj of obstaclesLayer.objects) {
        const rect = this.add.rectangle(
          obj.x! + (obj.width ?? 0) / 2,
          obj.y! + (obj.height ?? 0) / 2,
          obj.width ?? 32,
          obj.height ?? 32
        );
        this.physics.add.existing(rect, true);
        rect.setStrokeStyle(1, 0x555555).setDepth(1);
        this.obstacles.add(rect);
      }
    }
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  private buildNpcs(): void {
    const configs = npcData as unknown as NpcConfig[];
    for (const c of configs) {
      const npc = new Npc(this, c);
      this.npcs.push(npc);
      // Web/H5 点击 NPC 触发交互（DES-05）
      npc.setSize(48, 64).setInteractive({ useHandCursor: true });
      npc.on('pointerdown', () => {
        this.tryInteract();
      });
    }
  }

  private buildEnemies(): void {
    const configs = enemyData as unknown as EnemyConfig[];
    const states = [];
    for (const c of configs) {
      const enemy = new Enemy(this, c);
      // 头顶小血条（DES-06，受击后显示 3s）
      enemy.hpBar = this.add
        .rectangle(enemy.x, enemy.y - 26, 28, 4, 0xe53935)
        .setOrigin(0.5)
        .setDepth(860)
        .setVisible(false);
      enemy.hpBarTimer = 0;
      this.enemies.push(enemy);
      states.push({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.combat.hp,
        maxHp: enemy.combat.maxHp,
        alive: true
      });
    }
    this.gameState.setEnemies(states);
  }

  update(time: number): void {
    if (!this.player || this.died) return;

    const intent = this.readIntent();
    this.player.applyIntent(intent);
    this.handleAttack(intent, time);
    this.handleInteraction(intent);
    this.updateEnemies(time);
    this.updateNpcBubbles();
    this.checkCollisionAbnormality(time);
    this.updatePerformanceMonitor(time);
    this.syncState();
  }

  /** 双端 Intent 汇聚：Web 键鼠 + H5 摇杆同时生效（不互斥）。 */
  private readIntent(): InputIntent {
    const kb = this.ui.keyboardInput.getIntent();
    const touch = this.ui.touchInput.getIntent();
    return {
      moveX: kb.moveX || touch.moveX,
      moveY: kb.moveY || touch.moveY,
      attack: kb.attack || touch.attack,
      interact: kb.interact || touch.interact
    };
  }

  private handleAttack(intent: InputIntent, time: number): void {
    if (!intent.attack || !canAttack(this.lastAttackAt, time)) return;
    this.lastAttackAt = time;
    const { cx, cy } = attackBoxCenter(this.player.x, this.player.y, this.player.facing);
    const box = { x: cx - PLAYER_ATTACK_RANGE / 2, y: cy - PLAYER_ATTACK_RANGE / 2, width: PLAYER_ATTACK_RANGE, height: PLAYER_ATTACK_RANGE };
    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      if (aabbOverlap(box, enemy.getBounds())) {
        if (enemy.takeDamage(PLAYER_ATTACK_DAMAGE, time)) {
          EventBus.emit(GameEvents.EnemyDamaged, enemy.id);
          if (enemy.combat.hp <= 0) {
            enemy.die(time);
            this.gameState.addKill();
            EventBus.emit(GameEvents.EnemyKilled, enemy.id);
          }
        }
      }
    }
  }

  private handleInteraction(intent: InputIntent): void {
    if (intent.interact) this.tryInteract();
  }

  /** 触发交互：范围内且有可交互 NPC 才弹出对话（DES-05）。 */
  tryInteract(): void {
    if (this.died || this.ui.dialog.isOpen()) return;
    const npc = findInteractableNpc(this.npcs, this.player.x, this.player.y);
    if (!npc) return; // 判定失败不触发、不影响移动
    npc.inDialog = true;
    this.ui.dialog.open(npc.id, npc.name, npc.dialog, () => {
      npc.inDialog = false;
    });
  }

  private onDialogOpened(): void {
    this.ui.freezeForDialog(true); // 对话期间移动 Intent 冻结
  }

  private onDialogClosed(): void {
    this.ui.freezeForDialog(false);
  }

  private updateEnemies(time: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        if (enemy.tryRespawn(time, ENEMY_RESPAWN_MS)) {
          enemy.hpBar?.setVisible(false);
        }
        continue;
      }
      enemy.patrolUpdate(enemy.speed);
      if (enemy.hpBar) {
        enemy.hpBar.setPosition(enemy.x, enemy.y - 26);
        enemy.hpBar.setSize(28 * (enemy.combat.hp / enemy.combat.maxHp), 4);
        if (enemy.hpBarTimer > 0 && time > enemy.hpBarTimer) {
          enemy.hpBar.setVisible(false);
          enemy.hpBarTimer = 0;
        }
      }
    }
  }

  private updateNpcBubbles(): void {
    let anyInRange = false;
    for (const npc of this.npcs) {
      const inRange = npc.distanceTo(this.player.x, this.player.y) <= 64 && !npc.inDialog;
      npc.setShowBubble(inRange);
      anyInRange = anyInRange || inRange;
    }
    this.ui.setInteractAvailable(anyInRange);
  }

  /** 接触战斗：玩家受伤 + 击退（DES-06）。 */
  private onEnemyContact(
    enemyObj:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive() || this.died) return;
    const time = this.time.now;
    if (time < this.invincibleUntil) return;
    this.hp = Math.max(0, this.hp - ENEMY_CONTACT_DAMAGE);
    this.invincibleUntil = time + 1000;
    EventBus.emit(GameEvents.PlayerDamaged, this.hp);
    // 击退：远离敌人 64px
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    // 击退：约 64px（256px/s × 250ms），击退期间输入不覆盖速度（R-004）
    this.player.knockback(
      (dx / dist) * ENEMY_KNOCKBACK_PX * 4,
      (dy / dist) * ENEMY_KNOCKBACK_PX * 4,
      250
    );
    if (this.hp <= 0) this.onPlayerDied();
  }

  private onPlayerDied(): void {
    this.died = true;
    this.player.setVelocity(0, 0);
    this.player.setVisible(false).setActive(false);
    EventBus.emit(GameEvents.PlayerDied);
    showDeathOverlay(this, () => {
      this.hp = PLAYER_MAX_HP;
      this.invincibleUntil = 0;
      this.died = false;
      this.player
        .setPosition(this.gameState.player.x, this.gameState.player.y)
        .setVisible(true)
        .setActive(true);
      EventBus.emit(GameEvents.PlayerRespawned);
    });
  }

  /** 碰撞异常检测 + lastSafePos 回退（DES-04）。 */
  private checkCollisionAbnormality(time: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    let deepestOverlap = 0;
    for (const wall of this.obstacles.getChildren()) {
      const wallBody = (wall as Phaser.GameObjects.GameObject & {
        body?: Phaser.Physics.Arcade.StaticBody;
      }).body;
      if (!wallBody) continue;
      const depth = overlapDepth(
        { x: this.player.x - 14, y: this.player.y - 18, width: 28, height: 36 },
        {
          x: wallBody.position.x,
          y: wallBody.position.y,
          width: wallBody.width,
          height: wallBody.height
        }
      );
      deepestOverlap = Math.max(deepestOverlap, depth);
    }
    const hasCollision = deepestOverlap > 0;
    if (isCollisionAbnormal(deepestOverlap, { x: this.player.x, y: this.player.y }, speed)) {
      const safe = fallbackToSafePos(this.safePos);
      this.player.setPosition(safe.x, safe.y);
      this.player.setVelocity(0, 0);
    } else {
      maybeSampleSafePos(this.safePos, { x: this.player.x, y: this.player.y }, hasCollision, time);
    }
  }

  private updatePerformanceMonitor(time: number): void {
    if (!this.perf) return;
    if (this.perf.shouldSample(time, this.perfLastSampleAt)) {
      this.perfLastSampleAt = time;
      this.perf.sample();
    }
  }

  /** L2 降级：视口降至 480×270（DES-08），L1 关特效（占位动效，本期粒子为空）。 */
  private onDegraded(level: number): void {
    if (level >= 2 && this.scale.width !== 480) {
      this.scale.setGameSize(480, 270);
    }
  }

  /** GameState 收敛（DES-09）：可序列化快照供后续联机扩展。 */
  private syncState(): void {
    this.gameState.updatePlayer({
      x: this.player.x,
      y: this.player.y,
      hp: this.hp,
      facing: this.player.facing
    });
    for (const enemy of this.enemies) {
      this.gameState.updateEnemy(enemy.id, {
        x: enemy.x,
        y: enemy.y,
        hp: enemy.combat.hp,
        alive: enemy.active
      });
    }
  }
}
