/**
 * GameState：游戏状态收敛为可序列化对象（DES-09 预留，REQ-010 本期不落地联机/存储，
 * 玩法读写均经事件总线更新该对象，后续可直接作为同步负载）。
 */
export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: 'left' | 'right' | 'up' | 'down';
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface GameStateData {
  player: PlayerState;
  enemies: EnemyState[];
  kills: number;
}

export function createInitialState(): GameStateData {
  return {
    player: { x: 96, y: 432, hp: 100, maxHp: 100, facing: 'right' },
    enemies: [],
    kills: 0
  };
}

export class GameState {
  private data: GameStateData;

  constructor() {
    this.data = createInitialState();
  }

  snapshot(): GameStateData {
    return JSON.parse(JSON.stringify(this.data));
  }

  updatePlayer(patch: Partial<PlayerState>): void {
    Object.assign(this.data.player, patch);
  }

  setEnemies(states: EnemyState[]): void {
    this.data.enemies = states;
  }

  updateEnemy(id: string, patch: Partial<EnemyState>): void {
    const e = this.data.enemies.find((it) => it.id === id);
    if (e) Object.assign(e, patch);
  }

  addKill(): void {
    this.data.kills += 1;
  }

  get kills(): number {
    return this.data.kills;
  }

  get player(): Readonly<PlayerState> {
    return this.data.player;
  }
}
