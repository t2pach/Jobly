"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";
import type { Vacancy } from "./types";

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: Pick<Vacancy, "id" | "saved">) => api(`/vacancies/${v.id}/save`, { method: v.saved ? "DELETE" : "POST" }),
    onSuccess: (_, v) => {
      toast.success(v.saved ? "Удалено из избранного" : "Добавлено в избранное");
      qc.invalidateQueries({ queryKey: ["saved"] });
      qc.invalidateQueries({ queryKey: ["vacancy", v.id] });
      qc.setQueriesData<{ items: Vacancy[] }>({ queryKey: ["search"] }, (d) =>
        d ? { ...d, items: d.items.map((x) => (x.id === v.id ? { ...x, saved: !v.saved } : x)) } : d,
      );
    },
    onError: (e) => toast.error(e.message),
  });
}
