import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/actions/result";

type Props = {
  state: ActionResult<unknown>;
  successMessage?: string;
};

export function FormAlert({ state, successMessage }: Props) {
  if (!state) return null;

  if ("error" in state) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  const message = successMessage ?? state.message;
  if (!message) return null;

  return (
    <Alert variant="success">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
