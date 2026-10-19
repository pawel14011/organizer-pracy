import { describe, expect, it } from 'vitest';
import { kanbanCollisionDetection } from './dndUtils';
import type { DroppableContainer } from '@dnd-kit/core';

describe('kanbanCollisionDetection', () => {
  const containerMon: DroppableContainer = {
    id: 'mon',
    key: 'mon',
    data: { current: {} },
    disabled: false,
    node: { current: null },
    rect: {
      current: {
        top: 100,
        bottom: 800,
        left: 300,
        right: 500,
        width: 200,
        height: 700,
      },
    },
  };

  const containerTue: DroppableContainer = {
    id: 'tue',
    key: 'tue',
    data: { current: {} },
    disabled: false,
    node: { current: null },
    rect: {
      current: {
        top: 100,
        bottom: 800,
        left: 520,
        right: 720,
        width: 200,
        height: 700,
      },
    },
  };

  const containers = [containerMon, containerTue];
  const droppableRects = new Map();
  droppableRects.set('mon', containerMon.rect.current);
  droppableRects.set('tue', containerTue.rect.current);

  it('detects Monday immediately when pointer is inside Monday even at the top of the column', () => {
    const collisions = kanbanCollisionDetection({
      active: { id: 'dragged-task', data: { current: {} }, rect: { current: { initial: null, translated: null } } } as unknown as Parameters<typeof kanbanCollisionDetection>[0]['active'],
      collisionRect: { top: 120, bottom: 200, left: 320, right: 480, width: 160, height: 80 },
      droppableContainers: containers,
      droppableRects,
      pointerCoordinates: { x: 350, y: 150 }, // Inside Monday at the top
    });

    expect(collisions.length).toBeGreaterThan(0);
    expect(collisions[0].id).toBe('mon');
  });

  it('detects Tuesday immediately when pointer crosses into Tuesday at the top of the column', () => {
    const collisions = kanbanCollisionDetection({
      active: { id: 'dragged-task', data: { current: {} }, rect: { current: { initial: null, translated: null } } } as unknown as Parameters<typeof kanbanCollisionDetection>[0]['active'],
      collisionRect: { top: 120, bottom: 200, left: 540, right: 700, width: 160, height: 80 },
      droppableContainers: containers,
      droppableRects,
      pointerCoordinates: { x: 550, y: 150 }, // Inside Tuesday at the top
    });

    expect(collisions.length).toBeGreaterThan(0);
    expect(collisions[0].id).toBe('tue');
  });

  it('falls back to rectIntersection or closestCorners when pointer is between columns', () => {
    const collisions = kanbanCollisionDetection({
      active: { id: 'dragged-task', data: { current: {} }, rect: { current: { initial: null, translated: null } } } as unknown as Parameters<typeof kanbanCollisionDetection>[0]['active'],
      collisionRect: { top: 200, bottom: 300, left: 490, right: 530, width: 40, height: 100 },
      droppableContainers: containers,
      droppableRects,
      pointerCoordinates: { x: 510, y: 250 }, // In the 20px gap between Mon (right: 500) and Tue (left: 520)
    });

    expect(collisions.length).toBeGreaterThan(0);
  });
});
