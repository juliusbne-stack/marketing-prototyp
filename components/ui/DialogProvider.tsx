"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export type AlertOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
};

type DialogState =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "alert";
      options: AlertOptions;
      resolve: () => void;
    }
  | null;

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function SystemDialogOverlay({
  state,
  onCancel,
  onConfirm,
}: {
  state: NonNullable<DialogState>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isConfirm = state.kind === "confirm";
  const options = state.options;

  useEffect(() => {
    confirmRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isConfirm) {
          onCancel();
        } else {
          onConfirm();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isConfirm, onCancel, onConfirm]);

  const title = options.title ?? (isConfirm ? "Bitte bestätigen" : "Hinweis");
  const confirmLabel =
    options.confirmLabel ?? (isConfirm ? "Bestätigen" : "OK");
  const cancelLabel =
    isConfirm && "cancelLabel" in options
      ? (options.cancelLabel ?? "Abbrechen")
      : "Abbrechen";
  const isDanger =
    isConfirm && "variant" in options && options.variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {isConfirm ? (
        <button
          type="button"
          aria-label="Dialog schließen"
          className="absolute inset-0 bg-text/25 backdrop-blur-[1px]"
          onClick={onCancel}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-text/25 backdrop-blur-[1px]"
        />
      )}
      <div
        role={isConfirm ? "alertdialog" : "alert"}
        aria-modal="true"
        aria-labelledby="system-dialog-title"
        aria-describedby="system-dialog-message"
        className="relative z-10 w-full max-w-md rounded-[10px] border border-border bg-surface p-6 shadow-sm"
      >
        <h2
          id="system-dialog-title"
          className="font-heading text-base font-medium text-text"
        >
          {title}
        </h2>
        <p
          id="system-dialog-message"
          className="mt-3 text-sm leading-relaxed text-text-muted"
        >
          {options.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-background"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
              isDanger
                ? "bg-danger-text hover:bg-danger-text/90"
                : "bg-accent hover:bg-accent-bright active:bg-brand-dark"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: "confirm",
        options,
        resolve: (value) => {
          resolve(value);
          setDialog(null);
        },
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: "alert",
        options,
        resolve: () => {
          resolve();
          setDialog(null);
        },
      });
    });
  }, []);

  function handleCancel() {
    if (!dialog || dialog.kind !== "confirm") return;
    dialog.resolve(false);
  }

  function handleConfirm() {
    if (!dialog) return;
    if (dialog.kind === "confirm") {
      dialog.resolve(true);
    } else {
      dialog.resolve();
    }
  }

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <SystemDialogOverlay
          state={dialog}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within DialogProvider");
  }
  return context.confirm;
}

export function useAlert() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useAlert must be used within DialogProvider");
  }
  return context.alert;
}
