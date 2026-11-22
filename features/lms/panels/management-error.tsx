import { Button } from "@/components/ui/button";
import { isApiError } from "@/features/lms/lib/transport";

export function ManagementError({ resource, error, onRetry }: { resource: string; error: unknown; onRetry: () => void }) {
  const forbidden = isApiError(error) && error.status === 403;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm">
      <span>{forbidden ? `You do not have permission to access ${resource}.` : `Could not load ${resource}.`}</span>
      {!forbidden && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
