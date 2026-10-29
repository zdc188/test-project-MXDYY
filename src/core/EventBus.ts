import Phaser from 'phaser';

/** 轻量事件总线：玩法模块解耦，GameState 与性能降级均经此广播（DES-09 预留）。 */
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  PlayerDamaged: 'player:damaged',
  PlayerDied: 'player:died',
  PlayerRespawned: 'player:respawned',
  PlayerMoved: 'player:moved',
  EnemyDamaged: 'enemy:damaged',
  EnemyKilled: 'enemy:killed',
  NpcDialogOpened: 'npc:dialog-opened',
  NpcDialogClosed: 'npc:dialog-closed',
  QualityDegraded: 'quality:degraded'
} as const;
