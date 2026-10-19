import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { useTasks, useDndSensors } from './hooks';
import {
  Header,
  BacklogColumn,
  WeekGrid,
  DayColumn,
  SortableTaskCard,
  TaskCard,
} from './components';
import { WEEKDAYS, BACKLOG_DROPPABLE_ID } from './constants';
import { isToday, isPastDay, kanbanCollisionDetection } from './utils';
import type { DayOfWeek, Weekday } from './types';

/**
 * Właściwości komponentu App (wspierające rozszerzalność oraz testy integracyjne dnd-kit).
 */
export interface AppProps {
  /** Opcjonalna strategia detekcji kolizji (domyślnie kanbanCollisionDetection) */
  collisionDetection?: CollisionDetection;
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
  collisionDetection: collisionDetectionProp,
  onDragStart: onDragStartProp,
  onDragOver: onDragOverProp,
  onDragEnd: onDragEndProp,
  onDragCancel: onDragCancelProp,
}: AppProps = {}) {
  const {
    tasks,
    backlogTasks,
    getTasksByDay,
    addTask,
    toggleTaskStatus,
    cycleTaskPriority,
    deleteTask,
    updateTask,
    moveTask,
    returnToBacklog,
  } = useTasks();

  // Dynamiczny stan daty referencyjnej do obsługi przejścia północy bez przeładowania strony
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Identyfikator aktualnie przeciąganego zadania
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Aktywne zadanie przeciągane w czasie rzeczywistym (wyświetlane w DragOverlay)
  const activeTask = useMemo(
    () => (activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null),
    [activeTaskId, tasks]
  );

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

  // Obsługa zdarzenia przesuwania elementu nad kontenerem
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      onDragOverProp?.(event);
    },
    [onDragOverProp]
  );

  // Obsługa zakończenia przeciągania: wyznaczenie docelowego dnia i indeksu, oraz wywołanie moveTask
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTaskId(null);
      onDragEndProp?.(event);

      const { active, over } = event;
      if (!over) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) {
        return;
      }

      const activeTask = tasks.find((task) => task.id === activeId);
      if (!activeTask) {
        return;
      }

      let targetDay: DayOfWeek | undefined;
      let targetIndex = 0;

      if (overId === BACKLOG_DROPPABLE_ID) {
        targetDay = null;
        targetIndex = backlogTasks.length;
      } else if (WEEKDAYS.includes(overId as Weekday)) {
        targetDay = overId as Weekday;
        targetIndex = getTasksByDay(targetDay).length;
      } else {
        // overId wskazuje na inny kafelek zadania
        const overTask = tasks.find((task) => task.id === overId);
        if (overTask) {
          targetDay = overTask.day;
          const targetColumnTasks =
            targetDay === null ? backlogTasks : getTasksByDay(targetDay);
          const foundIndex = targetColumnTasks.findIndex(
            (task) => task.id === overId
          );
          targetIndex = foundIndex >= 0 ? foundIndex : targetColumnTasks.length;
        }
      }

      if (targetDay !== undefined) {
        moveTask(activeId, targetDay, targetIndex);
      }
    },
    [tasks, backlogTasks, getTasksByDay, moveTask, onDragEndProp]
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
      collisionDetection={collisionDetectionProp ?? kanbanCollisionDetection}
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
                  <SortableTaskCard
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
                        <SortableTaskCard
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

      {/* Pływający podgląd przeciąganego kafelka wyświetlany poza kontenerami z overflow */}
      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeTask ? (
          <TaskCard
            task={activeTask}
            isDragging={true}
            data-testid="drag-overlay-card"
            className="shadow-2xl ring-2 ring-blue-500 rotate-2 scale-105 cursor-grabbing pointer-events-none"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
