"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useApp } from "./app-context";
import type { EquipmentCategory, EquipmentProduct } from "./equipment";

interface EquipmentCatalogValue {
  categories: EquipmentCategory[];
  products: EquipmentProduct[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}
const Context = createContext<EquipmentCatalogValue | null>(null);

function EquipmentCatalogState({ children }: { children: ReactNode }) {
  const { repository, status } = useApp();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ categories: EquipmentCategory[]; products: EquipmentProduct[]; loading: boolean; error: string | null }>({ categories: [], products: [], loading: true, error: null });
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!repository || status !== "authorized") return;
    let active = true;
    const pending = new Set(["categories", "products"]);
    const stops: (() => void)[] = [];
    const fail = (failure: Error) => { if (active) setState(value => ({ ...value, loading: false, error: failure.message })); };
    queueMicrotask(() => {
      if (!active) return;
      setState(value => ({ ...value, loading: true, error: null }));
      try {
      stops.push(repository.watchEquipmentCategories(categories => {
        if (!active) return;
        pending.delete("categories"); setState(value => ({ ...value, categories, loading: !value.error && pending.size > 0 }));
      }, fail));
      stops.push(repository.watchEquipmentProducts(products => {
        if (!active) return;
        pending.delete("products"); setState(value => ({ ...value, products, loading: !value.error && pending.size > 0 }));
      }, fail));
      } catch (failure) { fail(failure instanceof Error ? failure : new Error("용품 가격표를 불러오지 못했습니다.")); }
    });
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [repository, status, attempt]);
  const value = status === "authorized" ? state : { categories: [], products: [], loading: false, error: null };
  return <Context.Provider value={{ ...value, retry }}>{children}</Context.Provider>;
}

export function EquipmentCatalogProvider({ children }: { children: ReactNode }) {
  const { user, status } = useApp();
  return <EquipmentCatalogState key={status === "authorized" ? user?.uid : "guest"}>{children}</EquipmentCatalogState>;
}
export function useEquipmentCatalog(): EquipmentCatalogValue {
  const value = useContext(Context);
  if (!value) throw new Error("EquipmentCatalogProvider가 필요합니다.");
  return value;
}
