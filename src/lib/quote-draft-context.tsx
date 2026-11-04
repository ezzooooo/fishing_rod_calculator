"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useApp } from "@/lib/app-context";
import { emptyDraft, type QuoteDraft } from "@/lib/domain";
import { draftSessionKey } from "@/lib/session-state";

type DraftContextValue = {
  draft: QuoteDraft;
  setDraft: Dispatch<SetStateAction<QuoteDraft>>;
  clearDraft: () => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

function DraftState({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuoteDraft>(emptyDraft);
  return <DraftContext.Provider value={{ draft, setDraft, clearDraft: () => setDraft(emptyDraft()) }}>{children}</DraftContext.Provider>;
}

export function QuoteDraftProvider({ children }: { children: ReactNode }) {
  const { status, user } = useApp();
  return <DraftState key={draftSessionKey(status, user?.uid)}>{children}</DraftState>;
}

export function useQuoteDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("견적 작성 상태를 불러올 수 없습니다.");
  return value;
}
