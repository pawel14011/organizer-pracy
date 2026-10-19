import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDndSensors, POINTER_SENSOR_ACTIVATION_DISTANCE } from './useDndSensors';

describe('useDndSensors hook', () => {
  it('exports POINTER_SENSOR_ACTIVATION_DISTANCE equal to 8', () => {
    expect(POINTER_SENSOR_ACTIVATION_DISTANCE).toBe(8);
  });

  it('configures PointerSensor and KeyboardSensor with correct default settings', () => {
    const { result } = renderHook(() => useDndSensors());

    expect(result.current).toHaveLength(2);

    const [pointerSensorDesc, keyboardSensorDesc] = result.current;

    // PointerSensor
    expect(pointerSensorDesc.sensor).toBe(PointerSensor);
    expect(pointerSensorDesc.options).toEqual({
      activationConstraint: {
        distance: 8,
      },
    });

    // KeyboardSensor
    expect(keyboardSensorDesc.sensor).toBe(KeyboardSensor);
    expect(keyboardSensorDesc.options).toEqual({
      coordinateGetter: sortableKeyboardCoordinates,
    });
  });

  it('allows customizing the pointer sensor activation distance', () => {
    const { result } = renderHook(() => useDndSensors({ distance: 15 }));

    const [pointerSensorDesc] = result.current;
    expect(pointerSensorDesc.options).toEqual({
      activationConstraint: {
        distance: 15,
      },
    });
  });
});
