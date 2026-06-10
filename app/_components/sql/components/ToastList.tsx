"use client";

import { Toast } from "@base-ui/react/toast";

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const isWarn = toast.data?.kind === "warn";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={`toast toast-${toast.data?.kind ?? "info"}`}
      >
        <Toast.Content className="toast-content">
          <Toast.Title className="toast-title">{toast.title}</Toast.Title>
          {toast.description && (
            <Toast.Description className="toast-desc">
              {toast.description}
            </Toast.Description>
          )}
          {isWarn && (
            <button
              type="button"
              className="toast-copy"
              aria-label="Copy error message"
              onClick={() =>
                void navigator.clipboard.writeText(String(toast.title ?? ""))
              }
            >
              <CopyIcon />
              Copy
            </button>
          )}
          <Toast.Close className="toast-close" aria-label="Dismiss">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}
