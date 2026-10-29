/** NPC 交互判定纯逻辑（DES-05 / REQ-005）。 */
export const NPC_INTERACT_RANGE = 64;

export interface InteractableLike {
  id: string;
  inDialog: boolean;
  distanceTo(x: number, y: number): number;
}

/** 返回交互范围内可交互的 NPC；无则 null。 */
export function findInteractableNpc<T extends InteractableLike>(
  npcs: T[],
  x: number,
  y: number,
  range: number = NPC_INTERACT_RANGE
): T | null {
  let nearest: T | null = null;
  let nearestDist = range;
  for (const npc of npcs) {
    if (npc.inDialog) continue; // 状态异常不触发
    const dist = npc.distanceTo(x, y);
    if (dist <= nearestDist) {
      nearest = npc;
      nearestDist = dist;
    }
  }
  return nearest;
}
