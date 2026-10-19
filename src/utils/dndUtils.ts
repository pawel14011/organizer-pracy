import {
  pointerWithin,
  rectIntersection,
  closestCorners,
  type CollisionDetection,
} from '@dnd-kit/core';

/**
 * Zoptymalizowana strategia detekcji kolizji dla wielokolumnowego planera tygodniowego (Kanban).
 *
 * Dlaczego:
 * Standardowy algorytm closestCorners porównuje odległości narożników prostokątów.
 * W układzie kolumn sąsiadujących (np. Backlog i Poniedziałek, lub Środa i Czwartek),
 * narożniki kolumny źródłowej znajdują się bardzo blisko narożników przeciąganego kafelka.
 * Skutkuje to „przyklejaniem się” zaznaczenia do dotychczasowej kolumny i brakiem detekcji
 * kolumny sąsiedniej, chyba że użytkownik przesunie kursor poniżej połowy wysokości sekcji.
 *
 * Rozwiązanie:
 * 1. pointerWithin weryfikuje fizyczną pozycję kursora myszy (pointerCoordinates).
 *    Gdy kursor znajdzie się w obrębie kolumny lub kafelka, kolizja jest wykrywana
 *    natychmiast – na dowolnej wysokości (na górze, w środku i na dole).
 * 2. rectIntersection zapewnia płynną detekcję, gdy kursor znajduje się na granicy lub w odstępie.
 * 3. closestCorners służy jako bezpieczny fallback geometryczny.
 */
export const kanbanCollisionDetection: CollisionDetection = (args) => {
  // 1. Priorytet: bezpośrednia pozycja wskaźnika myszy
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // 2. Przecięcie prostokąta przeciąganego kafelka z kontenerami
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // 3. Fallback geometryczny
  return closestCorners(args);
};
