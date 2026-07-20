import type { ReactNode } from "react";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
};

export function ConfirmationModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirming,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  children,
}: ConfirmationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-lg)]">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{message}</p>
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </SecondaryButton>
          <PrimaryButton onClick={onConfirm} disabled={confirming}>
            {confirming ? "Processing..." : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
