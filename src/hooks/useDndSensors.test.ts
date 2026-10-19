import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MouseSensor, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  useDndSensors,
  POINTER_SENSOR_ACTIVATION_DISTANCE,
  MOUSE_SENSOR_ACTIVATION_DISTANCE,
  TOUCH_SENSOR_ACTIVATION_DELAY,
  TOUCH_SENSOR_ACTIVATION_TOLERANCE,
} from './useDndSensors';

describe('useDndSensors hook', () => {
  it('exports correct constants for sensors configuration', () => {
    expect(POINTER_SENSOR_ACTIVATION_DISTANCE).toBe(8);
    expect(MOUSE_SENSOR_ACTIVATION_DISTANCE).toBe(8);
    expect(TOUCH_SENSOR_ACTIVATION_DELAY).toBe(250);
    expect(TOUCH_SENSOR_ACTIVATION_TOLERANCE).toBe(5);
  });

  it('configures MouseSensor, TouchSensor and KeyboardSensor with correct default settings', () => {
    const { result } = renderHook(() => useDndSensors());

    expect(result.current).toHaveLength(3);

    const [mouseSensorDesc, touchSensorDesc, keyboardSensorDesc] = result.current;

    // MouseSensor
    expect(mouseSensorDesc.sensor).toBe(MouseSensor);
    expect(mouseSensorDesc.options).toEqual({
      activationConstraint: {
        distance: 8,
      },
    });

    // TouchSensor
    expect(touchSensorDesc.sensor).toBe(TouchSensor);
    expect(touchSensorDesc.options).toEqual({
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    });

    // KeyboardSensor
    expect(keyboardSensorDesc.sensor).toBe(KeyboardSensor);
    expect(keyboardSensorDesc.options).toEqual({
      coordinateGetter: sortableKeyboardCoordinates,
    });
  });

  it('allows customizing mouse sensor activation distance and touch options', () => {
    const { result } = renderHook(() =>
      useDndSensors({ distance: 15, touchDelay: 300, touchTolerance: 8 })
    );

    const [mouseSensorDesc, touchSensorDesc] = result.current;

    expect(mouseSensorDesc.options).toEqual({
      activationConstraint: {
        distance: 15,
      },
    });

    expect(touchSensorDesc.options).toEqual({
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    });
  });
});
