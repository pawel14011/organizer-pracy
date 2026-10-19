import type { Task, Weekday, Priority, TaskStatus } from '../types';
import { WEEKDAYS } from '../constants';

/**
 * Niestandardowy błąd walidacji pliku kopii zapasowej.
 */
export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

/**
 * Generuje standardową nazwę pliku kopii zapasowej zgodnie ze specyfikacją:
 * `organizer-backup-YYYY-MM-DD.json`.
 *
 * @param date Opcjonalny obiekt daty (domyślnie bieżąca data)
 * @returns Nazwa pliku kopii zapasowej
 */
export function generateBackupFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `organizer-backup-${year}-${month}-${day}.json`;
}

/**
 * Sprawdza, czy tekst zawiera potencjalnie złośliwy ładunek (np. próby wstrzyknięcia skryptów XSS,
 * protokoły javascript: lub wstrzykiwanie zdarzeń HTML).
 *
 * @param text Ciąg znaków do weryfikacji
 * @returns true jeśli wykryto złośliwy ładunek, w przeciwnym razie false
 */
export function containsMaliciousPayload(text: string): boolean {
  // Wykrywanie niebezpiecznych tagów HTML (np. <script>, <iframe>, <object>, <embed>, <meta>, itp.)
  const dangerousTags = /<\s*(?:script|iframe|object|embed|applet|meta|link|base)\b/i;
  if (dangerousTags.test(text)) {
    return true;
  }

  // Wykrywanie pseudoprotokołów w treści (javascript:, vbscript:, data:text/html)
  const dangerousProtocols = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
  if (dangerousProtocols.test(text)) {
    return true;
  }

  // Wykrywanie atrybutów inline event handlerów (np. onerror=, onload=, onclick=) z wykluczeniem zwykłych słów (np. online=, onboarding=)
  const eventHandlerPattern =
    /\bon(?:click|dblclick|load|error|mouse[a-z]+|key[a-z]+|drag[a-z]+|drop|pointer[a-z]+|touch[a-z]+|focus|blur|change|submit|reset|input|scroll|select|animation[a-z]+|transition[a-z]+)\s*=/i;
  if (eventHandlerPattern.test(text)) {
    return true;
  }

  return false;
}

/**
 * Sanityzuje ciąg tekstowy:
 * - usuwa bajty null (\u0000) oraz niewidoczne znaki sterujące (z wyjątkiem standardowych białych znaków)
 * - obcina białe znaki na początku i końcu ciągu
 *
 * @param text Tekst wejściowy
 * @returns Oczyszczony ciąg znaków
 */
export function sanitizeString(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

/**
 * Rygorystyczna walidacja i sanityzacja danych importowanego pliku kopii zapasowej.
 *
 * Działa w oparciu o czyste strażniki typów (type guards) w TypeScript bez użycia zewnętrznych
 * bibliotek schematów (zgodnie z zasadą No Dependency Bloat).
 *
 * Weryfikacja:
 * 1. Odrzucenie nieprawidłowego formatu JSON lub wartości niebędących tablicą.
 * 2. Weryfikacja każdego rekordu zadania:
 *    - `id`: niepusty ciąg znaków (unikalny w obrębie pliku).
 *    - `title`: ciąg znaków o długości 1–500 znaków po usunięciu białych znaków.
 *    - `status`: unia 'todo' | 'done'.
 *    - `priority`: unia 'low' | 'medium' | 'high'.
 *    - `day`: null lub poprawny dzień tygodnia ('mon'...'sun').
 *    - `order`: nieujemna liczba całkowita (>= 0).
 *    - `createdAt`: poprawna data w formacie ISO.
 * 3. Odrzucanie złośliwych ładunków (np. skryptów XSS) i prób prototype pollution.
 * 4. Odrzucanie nieznanych właściwości i zwrócenie wyłącznie czystych obiektów Task.
 *
 * @param data Dane do walidacji (obiekt, tablica lub surowy ciąg JSON)
 * @returns Tablica zweryfikowanych i zsanityzowanych zadań Task[]
 * @throws {BackupValidationError} W przypadku napotkania jakichkolwiek nieprawidłowości w strukturze
 */
export function validateAndSanitizeImport(data: unknown): Task[] {
  let parsedData = data;

  // Obsługa surowego ciągu JSON (np. odczytanego bezpośrednio z pliku)
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd składni';
      throw new BackupValidationError(`Nieprawidłowy format JSON: plik nie zawiera poprawnego kodu JSON (${message}).`);
    }
  }

  if (parsedData === null || parsedData === undefined) {
    throw new BackupValidationError('Nieprawidłowa zawartość: dane kopii zapasowej są puste lub niezdefiniowane.');
  }

  if (!Array.isArray(parsedData)) {
    throw new BackupValidationError('Nieprawidłowa struktura pliku kopii zapasowej: oczekiwano tablicy zadań.');
  }

  // Pusta tablica jest prawidłową kopią zapasową (brak zadań w systemie)
  if (parsedData.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const sanitizedTasks: Task[] = [];

  for (let index = 0; index < parsedData.length; index++) {
    const item = parsedData[index];

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} nie jest poprawnym obiektem.`);
    }

    const candidate = item as Record<string, unknown>;

    // Ochrona przed atakiem Prototype Pollution
    if (
      Object.prototype.hasOwnProperty.call(candidate, '__proto__') ||
      Object.prototype.hasOwnProperty.call(candidate, 'constructor') ||
      Object.prototype.hasOwnProperty.call(candidate, 'prototype')
    ) {
      throw new BackupValidationError(`Wykryto niedozwolony, złośliwy ładunek w zadaniu pod indeksem ${index}.`);
    }

    // Walidacja ID
    if (typeof candidate.id !== 'string') {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłowy identyfikator (id). Wymagany ciąg znaków.`);
    }

    const sanitizedId = sanitizeString(candidate.id);
    if (sanitizedId.length === 0) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada pusty identyfikator (id).`);
    }

    if (containsMaliciousPayload(sanitizedId)) {
      throw new BackupValidationError(`Wykryto potencjalnie niebezpieczną zawartość (złośliwy ładunek) w identyfikatorze zadania pod indeksem ${index}.`);
    }

    if (seenIds.has(sanitizedId)) {
      throw new BackupValidationError(`Wykryto zduplikowany identyfikator zadania "${sanitizedId}" pod indeksem ${index}. Identyfikatory muszą być unikalne.`);
    }
    seenIds.add(sanitizedId);

    // Walidacja Title
    if (typeof candidate.title !== 'string') {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłowy tytuł (title). Wymagany ciąg znaków.`);
    }

    const trimmedTitle = candidate.title.trim();
    if (trimmedTitle.length === 0) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada pusty tytuł.`);
    }

    if (trimmedTitle.length > 500) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} przekracza maksymalną dopuszczalną długość tytułu wynoszącą 500 znaków (otrzymano ${trimmedTitle.length} znaków).`);
    }

    if (containsMaliciousPayload(trimmedTitle)) {
      throw new BackupValidationError(`Wykryto potencjalnie niebezpieczną zawartość (złośliwy ładunek) w tytule zadania pod indeksem ${index}.`);
    }

    const sanitizedTitle = sanitizeString(trimmedTitle);
    if (sanitizedTitle.length === 0) {
      throw new BackupValidationError(`Tytuł zadania pod indeksem ${index} po usunięciu niedozwolonych znaków sterujących jest pusty.`);
    }

    // Walidacja Status
    if (candidate.status !== 'todo' && candidate.status !== 'done') {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłowy status "${String(candidate.status)}". Dozwolone wartości: 'todo', 'done'.`);
    }
    const status: TaskStatus = candidate.status;

    // Walidacja Priority
    if (candidate.priority !== 'low' && candidate.priority !== 'medium' && candidate.priority !== 'high') {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłowy priorytet "${String(candidate.priority)}". Dozwolone wartości: 'low', 'medium', 'high'.`);
    }
    const priority: Priority = candidate.priority;

    // Walidacja Day
    const isNullDay = candidate.day === null;
    const isWeekday = typeof candidate.day === 'string' && (WEEKDAYS as readonly string[]).includes(candidate.day);

    if (!isNullDay && !isWeekday) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłowy dzień "${String(candidate.day)}". Dozwolone wartości: null lub jeden z dni: ${WEEKDAYS.join(', ')}.`);
    }
    const day: Weekday | null = isNullDay ? null : (candidate.day as Weekday);

    // Walidacja Order
    if (typeof candidate.order !== 'number' || !Number.isInteger(candidate.order) || candidate.order < 0) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłową kolejność "${String(candidate.order)}". Wymagana nieujemna liczba całkowita (>= 0).`);
    }
    const order = candidate.order;

    // Walidacja CreatedAt
    if (typeof candidate.createdAt !== 'string' || candidate.createdAt.trim() === '' || isNaN(Date.parse(candidate.createdAt))) {
      throw new BackupValidationError(`Zadanie pod indeksem ${index} posiada nieprawidłową datę utworzenia (createdAt). Wymagany prawidłowy format daty ISO.`);
    }
    const createdAt = new Date(candidate.createdAt).toISOString();

    // Konstrukcja czystego obiektu Task - odrzucenie wszelkich nieznanych właściwości
    sanitizedTasks.push({
      id: sanitizedId,
      title: sanitizedTitle,
      status,
      priority,
      day,
      order,
      createdAt,
    });
  }

  return sanitizedTasks;
}

/**
 * Eksportuje zadania do pliku JSON i inicjuje pobieranie w przeglądarce.
 *
 * Generuje plik o nazwie `organizer-backup-YYYY-MM-DD.json` i pobiera go
 * za pomocą dynamicznie utworzonego elementu <a> oraz URL.createObjectURL.
 *
 * @param tasks Tablica zadań do wyeksportowania
 * @param customDate Opcjonalna data do wygenerowania nazwy pliku (przydatna w testach)
 * @returns Nazwa wygenerowanego pliku kopii zapasowej
 */
export function exportTasksToJson(tasks: Task[], customDate?: Date): string {
  const fileName = generateBackupFileName(customDate);
  const jsonContent = JSON.stringify(tasks, null, 2);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');

      downloadLink.href = objectUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  return fileName;
}
