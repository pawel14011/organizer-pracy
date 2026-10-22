# Organizer Pracy — Wtyczka WordPress (WordPress Plugin)

Wtyczka **Organizer Pracy** umożliwia uruchomienie nowoczesnego, bezoporowego planera tygodniowego bezpośrednio w serwisie opartym o WordPress.

Aplikacja działa w metodyce **Local-First** – wszystkie dane zadań są bezpiecznie przechowywane w pamięci podręcznej przeglądarki użytkownika (`localStorage`), co gwarantuje zerowe obciążenie bazy MySQL, maksymalną szybkość działania i pełną prywatność.

---

## 🚀 Szybki Start: Instalacja i Uruchomienie

### Metoda 1: Instalacja z gotowej paczki ZIP (Zalecana)

1. Wygeneruj paczkę wtyczki, uruchamiając w głównym katalogu projektu:
   ```bash
   npm run package:wp
   ```
   W katalogu `wordpress-plugin/` powstanie gotowy plik `organizer-pracy.zip`.

2. Zaloguj się do panelu administracyjnego WordPress (`wp-admin`).
3. Przejdź do: **Wtyczki** -> **Dodaj nową wtyczkę** -> **Wyślij wtyczkę na serwer**.
4. Wybierz plik `organizer-pracy.zip` i kliknij **Zainstaluj teraz**.
5. Kliknij **Włącz wtyczkę**.

---

### Metoda 2: Instalacja ręczna (FTP / SSH / Środowisko Lokalne)

1. Zbuduj wtyczkę poleceniem:
   ```bash
   npm run build:wp
   ```
2. Skopiuj cały katalog `wordpress-plugin/` do folderu wtyczek Twojego WordPressa:
   ```text
   wp-content/plugins/organizer-pracy/
   ```
3. Przejdź do **Wtyczki** w panelu WordPress i aktywuj **Organizer Pracy**.

---

## 💻 Sposoby Użycia

### 1. Shortcode na dowolnej podstronie lub wpisie

Wklej poniższy shortcode w edytorze Gutenberg (blok **Kod skrótowy / Shortcode**), Elementorze lub klasycznym edytorze:

```text
[organizer_pracy]
```

Opcjonalny parametr wysokości minimalnej:
```text
[organizer_pracy min_height="800px"]
```

> **Wskazówka dotycząca motywów:** Organizer jest aplikacją pełnoekranową z widokiem 7 dni tygodnia oraz backlogu. Najlepiej prezentuje się na stronach z szablonem **"Pełna szerokość" (Full Width / Canvas / Blank)**.

### 2. Dedykowana zakładka w panelu administracyjnym (WP-Admin)

Po aktywacji wtyczki w lewym menu panelu administracyjnego WordPress pojawi się nowa pozycja:
👉 **Organizer Pracy** (`wp-admin/admin.php?page=organizer-pracy`).

Każdy uprawniony użytkownik może zarządzać swoimi zadaniami bez opuszczania zaplecza WordPressa.

---

## 🔄 Migracja i Kopia Zapasowa Danych

Jeśli korzystałeś wcześniej z wersji aplikacji hostowanej na Vercel (lub innej domenie):
1. W aplikacji na Vercel kliknij ikonę **Eksportuj do JSON** w nagłówku.
2. Zostanie pobrany plik `organizer-backup-YYYY-MM-DD.json`.
3. Otwórz Organizer w WordPressie i kliknij **Importuj z JSON**, wybierając pobrany plik.
4. Cała Twoja baza zadań pojawi się natychmiast w WordPressie!

---

## 🛠️ Polecenia Deweloperskie

| Polecenie | Opis |
| :--- | :--- |
| `npm run build:wp` | Kompiluje aplikację React/Tailwind bezpośrednio do `wordpress-plugin/assets/` |
| `npm run package:wp` | Buduje aplikację oraz pakuje całą wtyczkę do `wordpress-plugin/organizer-pracy.zip` |
| `npm run build` | Standardowe budowanie wersji SPA dla Vercel (`dist/`) |
