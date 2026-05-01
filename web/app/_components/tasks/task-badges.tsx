import type { TaskPriority, TaskStatus } from "@/lib/queries/tasks";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  in_review: "In review",
  done: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  in_progress: "bg-brand-soft text-brand ring-1 ring-brand/30",
  blocked: "bg-red-50 text-red-700 ring-1 ring-red-200",
  in_review: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200",
  medium: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export const TASK_STATUS_OPTIONS: ReadonlyArray<{
  value: TaskStatus;
  label: string;
}> = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

export const TASK_PRIORITY_OPTIONS: ReadonlyArray<{
  value: TaskPriority;
  label: string;
}> = (Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}));

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASS[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
