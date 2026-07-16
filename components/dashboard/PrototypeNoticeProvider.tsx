"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type PrototypeNoticeContextValue = {
  showNotice: (message?: string) => void;
};

const PrototypeNoticeContext =
  createContext<PrototypeNoticeContextValue | null>(null);

const DEFAULT_MESSAGE = "Diese Funktion ist im Prototyp nicht umgesetzt.";
const NOTICE_DURATION_MS = 2800;

export function PrototypeNoticeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((nextMessage = DEFAULT_MESSAGE) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
      timeoutRef.current = null;
    }, NOTICE_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <PrototypeNoticeContext.Provider value={{ showNotice }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(100%-2rem,22rem)] -translate-x-1/2"
      >
        {message ? (
          <div
            role="status"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-text shadow-md"
          >
            {message}
          </div>
        ) : null}
      </div>
    </PrototypeNoticeContext.Provider>
  );
}

export function usePrototypeNotice() {
  const context = useContext(PrototypeNoticeContext);
  if (!context) {
    throw new Error(
      "usePrototypeNotice must be used within PrototypeNoticeProvider"
    );
  }
  return context;
}
