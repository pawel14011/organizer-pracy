import { useState, useEffect } from 'react';
import { useTasks } from './hooks';
import { Header, BacklogColumn, WeekGrid, DayColumn } from './components';
import { WEEKDAYS } from './constants';
import { isToday, isPastDay } from './utils';

/**
 * Główny komponent aplikacji Organizer Pracy (MVP).
 * Łączy szkielet nawigacji (Header), panel Backlogu oraz 7 kolumn stałego tygodnia.
 */
export function App() {
  const { backlogTasks, getTasksByDay } = useTasks();

  // Dynamiczny stan daty referencyjnej do obsługi przejścia północy bez przeładowania strony
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date());
    };

    window.addEventListener('focus', updateDate);
    // Sprawdzaj co minutę aktualność daty referencyjnej
    const intervalId = window.setInterval(updateDate, 60_000);

    return () => {
      window.removeEventListener('focus', updateDate);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-100 font-sans text-slate-900 antialiased overflow-hidden">
      {/* Górny pasek nawigacyjny z miejscem na akcje kopii zapasowej */}
      <Header />

      {/* Główna przestrzeń robocza: Backlog po lewej, Stały Tydzień po prawej */}
      <main className="flex flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden">
        <BacklogColumn
          tasks={backlogTasks}
          taskCount={backlogTasks.length}
        />

        <WeekGrid>
          {WEEKDAYS.map((day) => {
            const dayTasks = getTasksByDay(day);
            const isCurrentDay = isToday(day, currentDate);
            const isPast = isPastDay(day, currentDate);

            return (
              <DayColumn
                key={day}
                day={day}
                tasks={dayTasks}
                taskCount={dayTasks.length}
                isToday={isCurrentDay}
                isPast={isPast}
              />
            );
          })}
        </WeekGrid>
      </main>
    </div>
  );
}

export default App;
