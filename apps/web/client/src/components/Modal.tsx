import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  width = "max-w-lg"
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className={`w-full ${width} rounded-md bg-slate-50 shadow-2xl`}>
        <div className="flex items-start justify-between px-4 pb-2 pt-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 px-0"
            aria-label="Close modal"
            onClick={onClose}
            icon={<X className="h-4 w-4" />}
          />
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 px-4 pb-4 pt-1">{footer}</div> : null}
      </div>
    </div>
  );
}
