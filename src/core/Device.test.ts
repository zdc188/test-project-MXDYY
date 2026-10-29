import { describe, expect, it } from 'vitest';
import { detectDevice } from './Device';
import { findInteractableNpc } from '../systems/interaction/NpcInteraction';

describe('设备检测（DES-03）', () => {
  it('移动 UA + 触控 → H5', () => {
    expect(detectDevice({ hasTouch: true, isMobileUA: true })).toBe('h5');
  });
  it('PC 触摸屏 → Web（键鼠优先，不互斥）', () => {
    expect(detectDevice({ hasTouch: true, isMobileUA: false })).toBe('web');
  });
  it('纯桌面 → Web', () => {
    expect(detectDevice({ hasTouch: false, isMobileUA: false })).toBe('web');
  });
  it('移动 UA 无触控上报 → H5', () => {
    expect(detectDevice({ hasTouch: false, isMobileUA: true })).toBe('h5');
  });
});

describe('NPC 交互判定（DES-05）', () => {
  const npcs = [
    {
      id: 'a',
      inDialog: false,
      distanceTo: (x: number, y: number) => Math.hypot(x - 100, y - 100)
    },
    {
      id: 'b',
      inDialog: true,
      distanceTo: (x: number, y: number) => Math.hypot(x - 100, y - 100)
    }
  ];

  it('64px 范围内且不在对话中的 NPC 可交互', () => {
    expect(findInteractableNpc(npcs, 100, 100)?.id).toBe('a');
    expect(findInteractableNpc(npcs, 100, 150)?.id).toBe('a');
  });

  it('范围外不触发', () => {
    expect(findInteractableNpc(npcs, 200, 200)).toBeNull();
  });

  it('对话中的 NPC 不参与判定', () => {
    const dialogOnly = [npcs[1]];
    expect(findInteractableNpc(dialogOnly, 100, 100)).toBeNull();
  });
});
