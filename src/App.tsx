import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { useTasks, useDndSensors } from './hooks';
import { Header, BacklogColumn, WeekGrid, DayColumn, TaskCard } from './components';
import { WEEKDAYS } from './constants';
import { isToday, isPastDay } from './utils';

/**
 * Właściwości komponentu App (wspierające rozszerzalność oraz testy integracyjne dnd-kit).
 */
export interface AppProps {
  /** Opcjonalny callback wywoływany w momencie rozpoczęcia przeciągania (onDragStart) */
  onDragStart?: (event: DragStartEvent) => void;
  /** Opcjonalny callback wywoływany podczas przesuwania elementu nad kontenerem (onDragOver) */
  onDragOver?: (event: DragOverEvent) => void;
  /** Opcjonalny callback wywoływany w momencie upuszczenia elementu (onDragEnd) */
  onDragEnd?: (event: DragEndEvent) => void;
  /** Opcjonalny callback wywoływany w momencie anulowania przeciągania (onDragCancel) */
  onDragCancel?: (event: DragCancelEvent) => void;
}

/**
 * Główny komponent aplikacji Organizer Pracy (MVP).
 * Łączy szkielet nawigacji (Header), panel Backlogu, 7 kolumn stałego tygodnia
 * oraz nadrzędny DndContext zarządzający gestami przeciągania kafelków zadań.
 */
export function App({
  onDragStart: onDragStartProp,
  onDragOver: onDragOverProp,
  onDragEnd: onDragEndProp,
  onDragCancel: onDragCancelProp,
}: AppProps = {}) {
  const {
    backlogTasks,
    getTasksByDay,
    addTask,
    toggleTaskStatus,
    cycleTaskPriority,
    deleteTask,
    updateTask,
    returnToBacklog,
  } = useTasks();

  // Dynamiczny stan daty referencyjnej do obsługi przejścia północy bez przeładowania strony
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Identyfikator aktualnie przeciąganego zadania
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Skonfigurowane sensory: PointerSensor (distance: 8px) oraz KeyboardSensor (sortableKeyboardCoordinates)
  const sensors = useDndSensors();

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

  // Obsługa zdarzenia rozpoczęcia przeciągania zadania
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTaskId(String(event.active.id));
      onDragStartProp?.(event);
    },
    [onDragStartProp]
  );

  // Obsługa zdarzenia przesuwania elementu nad kontenerem (pod Zadanie 4.2 i 4.3)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      onDragOverProp?.(event);
    },
    [onDragOverProp]
  );

  // Obsługa zakończenia przeciągania (pod Zadanie 4.3)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTaskId(null);
      onDragEndProp?.(event);
    },
    [onDragEndProp]
  );

  // Obsługa anulowania przeciągania (np. klawisz Escape)
  const handleDragCancel = useCallback(
    (event: DragCancelEvent) => {
      setActiveTaskId(null);
      onDragCancelProp?.(event);
    },
    [onDragCancelProp]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        data-testid="app-container"
        data-active-task-id={activeTaskId ?? undefined}
        className="flex h-screen flex-col bg-slate-100 font-sans text-slate-900 antialiased overflow-hidden"
      >
        {/* Górny pasek nawigacyjny z miejscem na akcje kopii zapasowej */}
        <Header />

        {/* Główna przestrzeń robocza: Backlog po lewej, Stały Tydzień po prawej */}
        <main className="flex flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden">
          <BacklogColumn
            tasks={backlogTasks}
            taskCount={backlogTasks.length}
            onAddTask={addTask}
          >
            {backlogTasks.length > 0
              ? backlogTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={activeTaskId === task.id}
                    onToggleStatus={toggleTaskStatus}
                    onCyclePriority={cycleTaskPriority}
                    onDelete={deleteTask}
                    onUpdateTitle={(id, title) => updateTask(id, { title })}
                    onReturnToBacklog={returnToBacklog}
                  />
                ))
              : null}
          </BacklogColumn>

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
                >
                  {dayTasks.length > 0
                    ? dayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isDragging={activeTaskId === task.id}
                          onToggleStatus={toggleTaskStatus}
                          onCyclePriority={cycleTaskPriority}
                          onDelete={deleteTask}
                          onUpdateTitle={(id, title) => updateTask(id, { title })}
                          onReturnToBacklog={returnToBacklog}
                          isOverdue={isPast && task.status !== 'done'}
                        />
                      ))
                    : null}
                </DayColumn>
              );
            })}
          </WeekGrid>
        </main>
      </div>
    </DndContext>
  );
}

export default App;
