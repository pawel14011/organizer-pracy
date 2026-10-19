import {
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Domyślny minimalny dystans przesunięcia wskaźnika myszy (w pikselach),
 * wymagany do aktywacji gestu przeciągania kafelka zadania.
 */
export const POINTER_SENSOR_ACTIVATION_DISTANCE = 8;
export const MOUSE_SENSOR_ACTIVATION_DISTANCE = 8;

/**
 * Domyślne opóźnienie aktywacji dotykowej (w milisekundach) dla urządzeń mobilnych.
 * Dlaczego: Pozwala na naturalne pionowe i poziome przewijanie list dotykiem (scroll),
 * a celowe przytrzymanie kafelka przez 250ms aktywuje gest przeciągania.
 */
export const TOUCH_SENSOR_ACTIVATION_DELAY = 250;

/**
 * Dopuszczalna tolerancja przesunięcia palca (w pikselach) w trakcie oczekiwania na aktywację dotykową.
 */
export const TOUCH_SENSOR_ACTIVATION_TOLERANCE = 5;

/**
 * Opcje konfiguracyjne dla hooka useDndSensors.
 */
export interface UseDndSensorsOptions {
  /** Minimalny dystans wskaźnika myszy (px) do aktywacji przeciągania (domyślnie 8px) */
  distance?: number;
  /** Opóźnienie aktywacji dotykowej (ms) dla smartfonów i tabletów (domyślnie 250ms) */
  touchDelay?: number;
  /** Tolerancja przesunięcia dotyku (px) przed upływem opóźnienia (domyślnie 5px) */
  touchTolerance?: number;
}

/**
 * Centralny hook konfigurujący hybrydowy zestaw sensorów biblioteki @dnd-kit:
 * 1. MouseSensor ze ścisłym ograniczeniem dystansu przesunięcia (`activationConstraint: { distance: 8 }`),
 *    gwarantując płynne i stabilne odróżnianie kliknięć od gestów przeciągania na desktopie.
 * 2. TouchSensor z opóźnieniem (`delay: 250ms, tolerance: 5px`), umożliwiający swobodne przewijanie
 *    list i kolumn dotykiem na urządzeniach mobilnych bez przypadkowego podnoszenia kafelków.
 * 3. KeyboardSensor zoptymalizowany dla a11y (`sortableKeyboardCoordinates`).
 *
 * @param options Opcjonalne parametry konfiguracyjne
 * @returns Tablica skonfigurowanych deskryptorów sensorów gotowa do przekazania do <DndContext sensors={...}>
 */
export function useDndSensors(options?: UseDndSensorsOptions): SensorDescriptor<SensorOptions>[] {
  const distance = options?.distance ?? MOUSE_SENSOR_ACTIVATION_DISTANCE;
  const touchDelay = options?.touchDelay ?? TOUCH_SENSOR_ACTIVATION_DELAY;
  const touchTolerance = options?.touchTolerance ?? TOUCH_SENSOR_ACTIVATION_TOLERANCE;

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: touchDelay,
      tolerance: touchTolerance,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  return useSensors(mouseSensor, touchSensor, keyboardSensor);
}
