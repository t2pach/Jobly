"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus, Target, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Goal } from "@/lib/types";

const GOAL_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Активна", tone: "bg-emerald-50 text-emerald-700" },
  done: { label: "Достигнута", tone: "bg-brand-50 text-brand-700" },
  paused: { label: "На паузе", tone: "bg-slate-100 text-slate-600" },
};

export default function GoalsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/career-goals") });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", target_salary: "" });
  const create = useMutation({
    mutationFn: () =>
      api<Goal>("/career-goals", {
        method: "POST",
        json: { title: f.title.trim(), description: f.description, target_salary: f.target_salary ? Number(f.target_salary) : null },
      }),
    onSuccess: () => {
      toast.success("Цель добавлена");
      qc.invalidateQueries({ queryKey: ["goals"] });
      setOpen(false);
      setF({ title: "", description: "", target_salary: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Карьерные цели"
        description="Сформулируйте, куда движетесь — это помогает держать фокус в поиске."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Новая цель
          </Button>
        }
      />
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Целей пока нет"
          description="Например: «Перейти в продуктовую компанию на позицию Middle Python» с целевой зарплатой."
          action={<Button onClick={() => setOpen(true)}>Поставить первую цель</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {q.data.map((g) => {
            const st = GOAL_STATUS[g.status] ?? { label: g.status, tone: "" };
            return (
              <Card key={g.id} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Flag className="size-5" />
                  </div>
                  <Badge className={st.tone}>{st.label}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{g.title}</h3>
                {g.description && <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">{g.description}</p>}
                {g.target_salary && (
                  <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Wallet className="size-4 text-slate-400" /> Цель: {money(g.target_salary)}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая цель"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!f.title.trim()}>
              Создать
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Цель">
            <Input autoFocus value={f.title} maxLength={300} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Стать Senior Backend-разработчиком" />
          </Field>
          <Field label="Описание" hint="необязательно">
            <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Что нужно для этого сделать, к какому сроку" />
          </Field>
          <Field label="Целевая зарплата, ₽" hint="необязательно">
            <Input type="number" min={0} step={10000} value={f.target_salary} onChange={(e) => setF({ ...f, target_salary: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
