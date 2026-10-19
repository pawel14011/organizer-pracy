import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Domyślny minimalny dystans przesunięcia wskaźnika (w pikselach),
 * wymagany do aktywacji gestu przeciągania kafelka zadania.
 *
 * Dlaczego: Zapobiega przypadkowemu rozpoczęciu przeciągania podczas zwykłego kliknięcia
 * w elementy interaktywne kafelka (checkbox ukończenia, flaga priorytetu,
 * przycisk edycji tekstu inline, przycisk usunięcia czy przycisk powrotu do Backlogu).
 */
export const POINTER_SENSOR_ACTIVATION_DISTANCE = 8;

/**
 * Opcje konfiguracyjne dla hooka useDndSensors.
 */
export interface UseDndSensorsOptions {
  /** Minimalny dystans wskaźnika (px) do aktywacji przeciągania (domyślnie 8px) */
  distance?: number;
}

/**
 * Centralny hook konfigurujący zestaw sensorów biblioteki @dnd-kit dla aplikacji Organizer Pracy.
 *
 * Konfiguruje:
 * 1. PointerSensor ze ścisłym ograniczeniem dystansu przesunięcia (`activationConstraint: { distance: 8 }`),
 *    gwarantując płynne i stabilne odróżnianie kliknięć od gestów przeciągania.
 * 2. KeyboardSensor zoptymalizowany dla a11y z wykorzystaniem standardowych koordynatów
 *    sortowania `sortableKeyboardCoordinates` z pakietu @dnd-kit/sortable.
 *
 * @param options Opcjonalne parametry konfiguracyjne (np. niestandardowy dystans aktywacji)
 * @returns Tablica skonfigurowanych deskryptorów sensorów gotowa do przekazania do <DndContext sensors={...}>
 */
export function useDndSensors(options?: UseDndSensorsOptions): SensorDescriptor<SensorOptions>[] {
  const distance = options?.distance ?? POINTER_SENSOR_ACTIVATION_DISTANCE;

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  return useSensors(pointerSensor, keyboardSensor);
}
