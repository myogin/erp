"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState that reports the result as a toast. The toast fires as soon as
 * the result arrives, not from an effect, because the action may remove the very
 * row or dialog that started it (e.g. revoking a Role) before an effect could run.
 */
export function useToastAction(action: Action, onSuccess?: (state: ActionState) => void) {
  const withToast = useCallback<Action>(
    async (state, formData) => {
      const result = await action(state, formData);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
      return result;
    },
    [action],
  );
  const [state, formAction, pending] = useActionState(withToast, {});

  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (!state.error && state.message) onSuccess?.(state);
  }, [state, onSuccess]);

  return [state, formAction, pending] as const;
}
