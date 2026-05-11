// Shared result shape for `useActionState`-driven server actions.
// Discriminated by the presence of `error` vs `success`; never both.
export type ActionResult<T = undefined> =
  | { error: string }
  | { success: true; message?: string; data?: T }
  | null;

export function fail(error: string): { error: string } {
  return { error };
}

export function ok(message?: string): { success: true; message?: string } {
  return { success: true, message };
}

export function okWithData<T>(
  data: T,
  message?: string,
): { success: true; data: T; message?: string } {
  return { success: true, data, message };
}
