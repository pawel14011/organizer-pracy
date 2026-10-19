export function App() {
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Organizer Pracy</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aplikacja zainicjalizowana pomyślnie. Konfiguracja Tailwind CSS aktywna.
          </p>
        </header>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Próbka palety priorytetów
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-md border border-priority-low-border bg-priority-low-light px-2.5 py-1 text-xs font-medium text-priority-low-text">
              Priorytet: Niski
            </span>
            <span className="inline-flex items-center rounded-md border border-priority-medium-border bg-priority-medium-light px-2.5 py-1 text-xs font-medium text-priority-medium-text">
              Priorytet: Średni
            </span>
            <span className="inline-flex items-center rounded-md border border-priority-high-border bg-priority-high-light px-2.5 py-1 text-xs font-medium text-priority-high-text">
              Priorytet: Wysoki
            </span>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Próbka palety statusów
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-md border border-status-todo-border bg-status-todo-light px-2.5 py-1 text-xs font-medium text-status-todo-text">
              Status: Do zrobienia
            </span>
            <span className="inline-flex items-center rounded-md border border-status-done-border bg-status-done-light px-2.5 py-1 text-xs font-medium text-status-done-text">
              Status: Wykonane
            </span>
            <span className="inline-flex items-center rounded-md border border-status-overdue-border bg-status-overdue-light px-2.5 py-1 text-xs font-medium text-status-overdue-text">
              Status: Zaległe
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
