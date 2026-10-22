=== Organizer Pracy ===
Contributors: organizer-pracy-team
Tags: organizer, planner, tasks, local-first, productivity, drag and drop
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Nowoczesny, bezoporowy planer tygodniowy w metodyce Local-First z obsługa Drag and Drop.

== Description ==

Organizer Pracy to intuicyjna aplikacja do planowania zadan w ujeciu tygodniowym.

Glowne zalety:
* Architektura Local-First (dane w localStorage przegladarki, pelna prywatnosc i natychmiastowe dzialanie)
* Metodyka tygodniowa z kolumnami dla kazdego dnia tygodnia oraz backlogiem
* Pelna obsluga Drag and Drop z wykorzystaniem @dnd-kit
* System priorytetow (Niski, Sredni, Wysoki) oraz automatyczna detekcja zaleglych zadan
* Eksport i import bazy zadan do pliku JSON
* Pelna responsywnosc dla komputerow, tabletow oraz smartfonow

== Installation ==

1. Pobierz plik `organizer-pracy.zip` lub skompiluj wtyczke poleceniem `npm run package:wp`.
2. W panelu WordPress przejdz do zakladki `Wtyczki` -> `Dodaj nowa wtyczke` -> `Wyslij wtyczke na serwer`.
3. Wybierz archiwum `organizer-pracy.zip` i kliknij `Zainstaluj teraz`.
4. Aktywuj wtyczke.
5. Uzyj shortcode `[organizer_pracy]` na wybranej stronie lub wejdz w menu `Organizer Pracy` w panelu WP-Admin.

== Frequently Asked Questions ==

= Jak wyswietlic organizer na stronie? =
Wystarczy wkleic shortcode `[organizer_pracy]` w tresci strony lub w bloku Shortcode edytora Gutenberg.

= Gdzie zapisywane sa zadania? =
Aplikacja dziala w metodyce Local-First — zadania zapisuja sie w pamieci podrecznej Twojej przegladarki (localStorage). Mozesz je w kazdej chwili wyeksportowac do pliku JSON w naglowku aplikacji.

== Changelog ==

= 1.0.0 =
* Pierwsze wydanie wtyczki Organizer Pracy dla WordPress.
