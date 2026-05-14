"use client";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Trash2, Clock, GripVertical } from "lucide-react";
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDateTime } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  project: { title: string } | null;
}

const TASK_COLUMNS = [
  { key: "todo", label: "未着手", color: "border-gray-300", bg: "bg-gray-50" },
  { key: "in_progress", label: "進行中", color: "border-blue-400", bg: "bg-blue-50/30" },
  { key: "review", label: "レビュー", color: "border-orange-400", bg: "bg-orange-50/30" },
  { key: "done", label: "完了", color: "border-green-400", bg: "bg-green-50/30" },
];

const CATEGORY_LABELS: Record<string, string> = {
  script: "台本", image: "画像", video: "動画", post: "投稿", research: "リサーチ", other: "その他",
};

// ドラッグ可能なタスクカード
function DraggableTaskCard({
  task,
  onDelete,
  onStatusChange,
  isDragging = false,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <Card className="group cursor-default hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-1 mb-2">
            {/* ドラッグハンドル */}
            <button
              {...listeners}
              {...attributes}
              className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 focus:outline-none"
            >
              <GripVertical size={14} />
            </button>
            <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{task.title}</p>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 pl-5">{task.description}</p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap pl-5">
            <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs`}>{PRIORITY_LABELS[task.priority]}</Badge>
            {task.category && (
              <Badge className="bg-gray-100 text-gray-600 text-xs">{CATEGORY_LABELS[task.category] || task.category}</Badge>
            )}
          </div>
          {task.dueDate && (
            <p className="text-xs text-gray-400 mt-2 pl-5 flex items-center gap-1">
              <Clock size={10} /> {formatDateTime(task.dueDate)}
            </p>
          )}
          {task.project && (
            <p className="text-xs text-indigo-500 mt-1 pl-5 truncate">{task.project.title}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ドロップ先カラム
function DroppableColumn({
  column,
  tasks,
  onDelete,
  onStatusChange,
  onAddTask,
  activeId,
}: {
  column: typeof TASK_COLUMNS[number];
  tasks: Task[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAddTask: (status: string) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div>
      <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${column.color}`}>
        <span className="text-sm font-semibold text-gray-700">{column.label}</span>
        <Badge className="bg-gray-100 text-gray-600 text-xs">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] rounded-lg p-1 transition-colors ${isOver ? "bg-indigo-50 ring-2 ring-indigo-200" : ""}`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isDragging={activeId === task.id}
          />
        ))}
        <button
          className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
          onClick={() => onAddTask(column.key)}
        >
          + タスクを追加
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onDelete,
  onStatusChange,
  onAddTask,
}: {
  tasks: Task[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAddTask: (status: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeTask = tasks.find((t) => t.id === activeId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // over.id が カラムキー or 別タスクのID
    const targetColumn = TASK_COLUMNS.find((c) => c.key === over.id);
    if (targetColumn && draggedTask.status !== targetColumn.key) {
      onStatusChange(draggedTask.id, targetColumn.key);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_COLUMNS.map((column) => (
          <DroppableColumn
            key={column.key}
            column={column}
            tasks={tasks.filter((t) => t.status === column.key)}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onAddTask={onAddTask}
            activeId={activeId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 shadow-2xl opacity-90 w-full max-w-xs">
            <Card>
              <CardContent className="p-3">
                <p className="text-sm font-medium text-gray-900">{activeTask.title}</p>
                <Badge className={`${PRIORITY_COLORS[activeTask.priority]} text-xs mt-1`}>
                  {PRIORITY_LABELS[activeTask.priority]}
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
