import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  action,
  onAction
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-4 leading-6 text-slate-600">{description}</p>
      {action && onAction ? (
        <Button type="button" variant="primary" className="mt-5 min-w-40" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}
