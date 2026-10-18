# Specyfikacja Wymagań: Organizer Pracy (MVP)

> **Cel:** Prosty, bezoporowy planer tygodniowy w metodyce *Local-First*, umożliwiający zarządzanie zadaniami z Backlogu i planowanie ich na dni tygodnia za pomocą intuicyjnego przeciągania myszką (Drag & Drop).  
> **Czas realizacji:** 1 weekend (z asystą narzędzi AI).  
> **Dokumentacja techniczna:** Szczegółowy opis narzędzi, bibliotek i wdrożenia znajduje się w pliku [STACK.md](file:///c:/Users/pawel/Desktop/apka/STACK.md).

---

## 1. Założenia i Ograniczenia Projektu

* **Użytkownik:** 1 osoba (użytek lokalny na komputerze).
* **Baza danych i Backend:** Brak serwera. Trwałość danych oparta w 100% o lokalną pamięć przeglądarki użytkownika.
* **Autoryzacja / Płatności:** Brak konieczności logowania, brak kont i subskrypcji.
* **Zależności sieciowe:** Brak zewnętrznych API – aplikacja działa całkowicie w trybie offline.
* **Prywatność:** Wszystkie notatki i dane zadań pozostają wyłącznie na urządzeniu użytkownika.

---

## 2. Architektura Interfejsu (Layout)

Układ podzielony jest na dwa główne obszary robocze:

```
+----------------------------------------------------------------------------------------------------+
|  ORGANIZER PRACY                                                             [Eksport / Import]   |
+-----------------------+----------------------------------------------------------------------------+
|  BACKLOG (Inbox)      |  STAŁY TYDZIEŃ (7 kolumn)                                                  |
|  [ + Dodaj zadanie  ] |                                                                            |
|  -------------------  |  Poniedziałek | Wtorek (DZIŚ) | Środa   | Czwartek | Piątek  | Sobota | Niedziela |
|  - Zadanie A          |  ------------ | ------------- | ------- | -------- | ------- | ------ | --------- |
|  - Zadanie B          |  [Zad. 1]     | [Zad. 3]      | (pusto) | [Zad. 4] | ...     |        |           |
|  - Zadanie C          |  [Zad. 2]     |               |         |          |         |        |           |
|                       |  (zaległe ↺)  |               |         |          |         |        |           |
+-----------------------+----------------------------------------------------------------------------+
```

### Lewy Panel: Backlog (Skrzynka zadań)
* Stała, dedykowana kolumna po lewej stronie ekranu.
* Pole tekstowe z natychmiastowym dodawaniem zadania po naciśnięciu klawisza `Enter`.
* Lista kafelków zadań oczekujących na zaplanowanie.
* Wizualny licznik zadań znajdujących się w Backlogu.

### Prawy Panel: Stały Tydzień (7 kolumn)
* **Brak dat kalendarzowych i przełączania miesięcy:** 7 czytelnych kolumn odpowiadających dniom tygodnia (*Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela*).
* **Wyróżnienie dnia bieżącego:** Aplikacja automatycznie wykrywa aktualny dzień tygodnia i oznacza go wizualną plakietką **„DZISIAJ”** oraz subtelnym wyróżnieniem tła.
* Dedykowany obszar upuszczania zadań dla każdego z 7 dni.

---

## 3. Kluczowe Wymagania Funkcjonalne

### A. Przenoszenie zadań (Drag & Drop)
* Przeciąganie kafelka z Backlogu do dowolnego dnia tygodnia.
* Przeciąganie zadań pomiędzy różnymi dniami (np. ze środy na piątek).
* Zmiana kolejności zadań w obrębie tej samej kolumny (reordering).
* Przeciąganie zadania z kolumny dnia z powrotem do Backlogu.

### B. Obsługa zaległości (Zadania niewykonane z przeszłości)
* Zadania przypisane do dni, które już minęły w danym tygodniu i nie mają statusu wykonanego:
  * Są wyraźnie i jednoznacznie oznaczone wizualnie (np. kontrastowa ramka lub ikona ostrzeżenia).
  * Każde zaległe zadanie posiada przycisk szybkiej akcji: **„Przywróć do backlogu”** (ikona strzałki powrotu).
  * *(Opcjonalnie)* Zbiorcza akcja na nagłówku przeszłego dnia: *„Przenieś wszystkie zaległe do backlogu”*.

### C. Zarządzanie zadaniem
* **Priorytety:** 3 poziomy priorytetu (Wysoki, Średni, Niski), sygnalizowane akcentem kolorystycznym na kafelku oraz możliwością 1-klikowej zmiany (cykliczny toggle ikony flagi).
* **Oznaczanie realizacji:** Checkbox oznaczający zadanie jako wykonane (`done`), co powoduje przekreślenie tytułu i wyszarzenie kafelka.
* **Usuwanie:** Przycisk usuwania (kosz) dostępny bezpośrednio na kafelku zadania.
* **Edycja treści:** Szybka zmiana tytułu zadania po podwójnym kliknięciu lub kliknięciu ikony edycji.

### D. Trwałość i Bezpieczeństwo Danych
* **Automatyczny zapis:** Każda operacja (dodanie, przesunięcie, edycja, usunięcie) jest natychmiast zapisywana w pamięci lokalnej.
* **Eksport danych:** Możliwość pobrania pełnej kopii zapasowej wszystkich zadań w uniwersalnym formacie JSON.
* **Import danych:** Możliwość wgrania pliku JSON i natychmiastowego przywrócenia stanu aplikacji.

---

## 4. Model Danych

Każde zadanie w systemie opisane jest następującą strukturą danych:

* **`id`** – unikalny identyfikator zadania.
* **`title`** – treść/nazwa zadania.
* **`status`** – status realizacji (`todo` – do zrobienia, `done` – wykonane).
* **`priority`** – priorytet zadania (`low` – niski, `medium` – średni, `high` – wysoki).
* **`day`** – przypisany dzień tygodnia (`mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`) lub wartość pusta (`null`) oznaczająca obecność w Backlogu.
* **`order`** – liczba określająca kolejność wyświetlania zadania w danej kolumnie.
* **`createdAt`** – data i czas utworzenia zadania.

---

## 5. Kryteria Akceptacji (Scenariusze Użytkownika)

1. **Dodawanie zadania:** Wpisanie tekstu w Backlogu i naciśnięcie `Enter` natychmiast tworzy nowy kafelek o domyślnym priorytecie średnim.
2. **Planowanie:** Użytkownik może chwycić myszką dowolne zadanie i upuścić je w kolumnie wybranego dnia tygodnia.
3. **Odświeżenie strony:** Po przeładowaniu przeglądarki wszystkie zadania, ich priorytety, statusy i pozycje pozostają nienaruszone.
4. **Zaległość:** Jeśli zadanie w poniedziałek nie zostało oznaczone jako wykonane, a dziś jest środa – zadanie to jest widoczne jako zaległe i jednym kliknięciem można je cofnąć do Backlogu.
5. **Kopia bezpieczeństwa:** Użytkownik może pobrać plik JSON z zadaniami, a następnie odtworzyć go na innym komputerze lub w innej przeglądarce.
