"use client";

import { useEffect, useState } from "react";
import { Sparkles, Target } from "lucide-react";
import { TaskElaborationPanel } from "./TaskElaborationPanel";
import type { StatementRef, TaskData } from "./types";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";

function TaskMeta({ task }: { task: TaskData }) {
  if (!task.erfolgskriterium) return null;

  return (
    <div className="mt-1">
      <span className="inline-flex items-start gap-1 text-xs text-text-muted">
        <Target className="mt-0.5 h-3 w-3 shrink-0 text-accent/80" aria-hidden />
        {task.erfolgskriterium}
      </span>
    </div>
  );
}

export function CockpitTaskRow({
  task,
  isNext,
  readOnly,
  statementMap,
  isExpanded,
  onExpand,
  onToggleExpanded,
  onElaborationSaved,
  onToggleDone,
}: {
  task: TaskData;
  isNext: boolean;
  readOnly: boolean;
  statementMap: Map<string, StatementRef>;
  isExpanded: boolean;
  onExpand: () => void;
  onToggleExpanded: () => void;
  onElaborationSaved: (elaboration: TaskElaborationResponse) => void;
  onToggleDone: () => void;
}) {
  const [sessionActive, setSessionActive] = useState(!!task.elaboration);
  const [readOnlyExpanded, setReadOnlyExpanded] = useState(false);

  const expanded = readOnly ? readOnlyExpanded : isExpanded;
  const toggleExpanded = readOnly
    ? () => setReadOnlyExpanded((current) => !current)
    : onToggleExpanded;

  useEffect(() => {
    if (task.elaboration) {
      setSessionActive(true);
    }
  }, [task.elaboration]);

  const titleClass = task.done
    ? "text-text-muted line-through"
    : isNext
      ? "font-semibold text-text"
      : "text-text";

  const nextLabel = isNext && (
    <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-accent">
      Als Nächstes:
    </span>
  );

  function handleElaborateClick() {
    if (!sessionActive) {
      setSessionActive(true);
      onExpand();
      return;
    }
    onToggleExpanded();
  }

  const elaborateLabel =
    sessionActive && !expanded ? "Ausarbeitung anzeigen" : "Mit KI ausarbeiten";

  const elaborateAction = !readOnly && (
    <button
      type="button"
      onClick={handleElaborateClick}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      aria-expanded={sessionActive && expanded}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {elaborateLabel}
    </button>
  );

  if (readOnly) {
    return (
      <li className="rounded-md px-2 py-1.5">
        <span className={`block text-sm ${titleClass}`}>
          {nextLabel}
          {task.title}
        </span>
        {task.hint && (
          <span className="mt-0.5 block text-xs text-text-muted">{task.hint}</span>
        )}
        <TaskMeta task={task} />
        {sessionActive && (
          <TaskElaborationPanel
            taskId={task.id}
            annahmenBezugId={task.annahmenBezugId}
            elaboration={task.elaboration}
            statementMap={statementMap}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            onElaboration={onElaborationSaved}
          />
        )}
      </li>
    );
  }

  return (
    <li className="group">
      <div className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-background">
        <input
          type="checkbox"
          checked={task.done}
          onChange={onToggleDone}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e5a63]"
          aria-label={`Aufgabe erledigt: ${task.title}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className={`block text-sm ${titleClass}`}>
              {nextLabel}
              {task.title}
            </span>
            {elaborateAction}
          </div>
          {task.hint && (
            <span className="mt-0.5 block text-xs text-text-muted">
              {task.hint}
            </span>
          )}
          <TaskMeta task={task} />
        </div>
      </div>

      {sessionActive && (
        <TaskElaborationPanel
          taskId={task.id}
          annahmenBezugId={task.annahmenBezugId}
          elaboration={task.elaboration}
          statementMap={statementMap}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          onElaboration={onElaborationSaved}
        />
      )}
    </li>
  );
}
