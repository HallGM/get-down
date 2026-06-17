import { useState } from "react";

interface Mutation<TInput> {
  mutateAsync: (args: { id: number; input: TInput }) => Promise<unknown>;
}

export default function useEditTarget<TTarget extends { id: number }, TInput>(mutation: Mutation<TInput>) {
  const [target, setTarget] = useState<TTarget | null>(null);

  async function handleSave(input: TInput) {
    if (!target) return;
    await mutation.mutateAsync({ id: target.id, input });
    setTarget(null);
  }

  return { target, setTarget, handleSave };
}
