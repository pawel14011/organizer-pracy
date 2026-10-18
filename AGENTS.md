# Zasady Współpracy i Wytyczne dla Agenta AI (AGENTS.md)

Dokument określa reguły pracy, standardy inżynieryjne oraz procedury weryfikacji dla modeli AI i programistów pracujących nad projektem **Organizer Pracy (MVP)**.

---

## 1. Źródła Prawdy i Rola Agenta

* **Rola:** Pracujesz jako asystent programisty (pair programmer), realizując wymagania krok po kroku.
* **Wymagania funkcjonalne:** Źródłem prawdy jest [spec.md](spec.md).
* **Architektura i stos techniczny:** Źródłem prawdy jest [STACK.md](STACK.md).
* Każda modyfikacja musi być zgodna z powyższymi dokumentami. W razie wątpliwości lub sprzeczności dopytaj użytkownika przed rozpoczęciem prac.

---

## 2. Stos Technologiczny i Dobre Praktyki

Projekt bazuje na: **React 18/19 + TypeScript + Vite + Tailwind CSS + @dnd-kit + Lucide React + Vitest + Playwright**.

* **TypeScript:**
  * Tryb ścisły (*strict mode*). Bezwzględny zakaz używania typu `any` – używaj typów unijnych, precyzyjnych interfejsów lub `unknown`.
  * Model danych musi być w 100% zgodny z modelem zdefiniowanym w `spec.md` (sekcja 4).
* **React:**
  * Komponenty funkcyjne z czystym podziałem na prezentację i logikę.
  * Centralne zarządzanie stanem zadań poprzez dedykowany hook `useTasks`.
  * Brak niepotrzebnych re-renderów; właściwe wykorzystanie hooków (`useCallback`, `useMemo` tam, gdzie ma to uzasadnienie wydajnościowe).
* **Tailwind CSS:**
  * Korzystaj wyłącznie ze stylów narzędziowych (*utility classes*).
  * Zakaz pisania tradycyjnych, luźnych plików CSS lub stylów inline (`style={{ ... }}`), chyba że wymaga tego dynamiczna kalkulacja pozycji Drag & Drop.
* **Natywne API przeglądarki:**
  * Logika dat oparta o natywny obiekt `Date` (brak bibliotek typu `moment` czy `date-fns`).
  * Unikalne identyfikatory generowane przez `crypto.randomUUID()`.

---

## 3. Komendy: Uruchamianie i Testowanie

Każda zmiana w kodzie musi być weryfikowalna poniższymi poleceniami:

| Cel | Polecenie |
| :--- | :--- |
| **Uruchomienie serwera deweloperskiego** | `npm run dev` |
| **Weryfikacja typów TypeScript** | `npx tsc --noEmit` |
| **Uruchomienie testów jednostkowych/integracyjnych** | `npm run test` (lub `npx vitest run`) |
| **Uruchomienie testów E2E** | `npx playwright test` |
| **Budowanie produkcyjne** | `npm run build` |

---

## 4. Zasada Małych Zmian (Atomic Changes)

* **Praca etapami:** Realizuj jedno zadanie / jeden logiczny krok na raz (zgodnie z harmonogramem w `STACK.md`).
* **Zakaz łączenia sprzecznych celów:** Nie łącz refaktoryzacji z pisaniem nowych funkcjonalności w ramach jednej zmiany.
* **Ciągła sprawność projektu:** Po każdym ukończonym kroku kod musi się bezbłędnie kompilować i przechodzić testy.
* **Zakaz masowych zmian w wielu plikach:** Jeśli zadanie wymaga dotknięcia wielu komponentów, podziel je na mniejsze, bezpieczne etapy.

---

## 5. Obowiązek Sprawdzania Wykonanej Pracy (Self-Verification)

Nigdy nie uznawaj zadania za zakończone bez faktycznego sprawdzenia:

1. **Typy:** Zawsze uruchom `npx tsc --noEmit` po zmianach w kodzie TS/TSX.
2. **Testy:** Zawsze uruchom właściwe testy (`npm run test` dla logiki lub Playwright dla E2E).
3. **Nowe funkcje = nowe testy:** Każda nowa funkcja logiki biznesowej (np. w `useTasks`, detekcja zaległości, import/eksport JSON) musi posiadać pokrycie w testach Vitest.
4. **Brak błędów w konsoli:** Kod nie może generować ostrzeżeń (warnings) o kluczach Reacta, problemach z sensorami dnd-kit ani błędów pamięci.

---

## 6. Jakość Kodu i Bezpieczeństwo

### Jakość i Dostępność:
* **Czytelność:** Samowyjaśniające się nazwy funkcji i zmiennych.
* **Dostępność (a11y):** Wszystkie przyciski oparte o ikony (`lucide-react`) muszą posiadać atrybut `aria-label` lub tekst pomocniczy dla czytników ekranowych.
* **Odporność na błędy brzegowe:** Obsłuż stany puste (pusty Backlog, brak zadań w danym dniu) oraz przypadki awarii odczytu `localStorage`.

### Bezpieczeństwo (Local-First):
* **Sanityzacja i Walidacja Importu JSON:** Pliki JSON importowane przez użytkownika muszą przejść walidację schematu (poprawność pól, typy, długość stringów) przed zapisaniem do `localStorage`.
* **Zakaz `dangerouslySetInnerHTML`:** Treść zadań renderuj wyłącznie jako bezpieczny tekst.
* **Prywatność i Offline:** Bezwzględny brak telemetrii, analityki i zewnętrznych wywołań API bez wyraźnej dyspozycji użytkownika.

---

## 7. Zakaz Dodawania Zbędnych Zależności (No Dependency Bloat)

* Dozwolone są wyłącznie biblioteki wymienione w [STACK.md](STACK.md).
* **Zakaz samodzielnego instalowania nowych paczek npm** (np. `lodash`, `axios`, `uuid`, biblioteki UI takie jak MUI/Chakra, menedżery stanu `zustand`/`redux`).
* Wszelkie operacje wykonuj za pomocą natywnych funkcji JavaScript/TypeScript lub bibliotek już obecnych w projekcie.
* W wyjątkowych sytuacjach zapytaj użytkownika o zgodę na instalację pakietu, przedstawiając silne uzasadnienie techniczne i wagę paczki.

---

## 8. Przejrzystość Planu i Komunikacja Postępów

* **Przejrzystość pracy:** Przed rozpoczęciem danego etapu krótko poinformuj użytkownika w czacie, co dokładnie będzie realizowane.
* **Informowanie o statusie:** Po zakończeniu etapu poinformuj w wiadomości o zrealizowanych celach i zaproponuj kolejny krok (nie modyfikuj plików dokumentacji ani STACK.md w celu oznaczania postępów).

---

## 9. Wyjaśnianie Decyzji i Przejrzystość

* **Uzasadnienie nietypowych rozwiązań:** Jeśli wybierasz konkretne podejście architektoniczne, stosujesz specyficzny hak/obejście (workaround) problemu w bibliotece lub nietypowy algorytm – krótko wyjaśnij powód w wiadomości oraz umieść zwięzły komentarz w kodzie (`// Dlaczego: ...`).
* **Brak domysłów przy niejednoznacznościach:** Jeśli specyfikacja nie definiuje jakiegoś zachowania granicznego, przedstaw możliwe opcje z rekomendacją i zapytaj użytkownika o decyzję zamiast zgadywać.

---

## 10. Konwencje Językowe i Nazewnictwo

* **Kod źródłowy:** Język angielski (nazwy plików, komponentów, zmiennych, funkcji, typów, komentarze techniczne).
* **Interfejs Użytkownika (UI):** Język polski (zgodnie ze `spec.md`, np. nazwy dni tygodnia, etykiety przycisków, powiadomienia).
* **Komunikacja z użytkownikiem:** Język polski.
