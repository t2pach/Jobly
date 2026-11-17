"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, ExternalLink, FileText, KanbanSquare, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApplicationModal } from "@/components/application-modal";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { STATUS, STATUS_ORDER, date, localToday as today } from "@/lib/format";
import type { Application, ApplicationEvent, Status } from "@/lib/types";

const BOARD: { title: string; statuses: Status[] }[] = [
  { title: "В планах", statuses: ["plan", "prep"] },
  { title: "Отправлено", statuses: ["sent", "seen"] },
  { title: "Интервью", statuses: ["inv", "int"] },
  { title: "Оффер", statuses: ["offer", "hired"] },
  { title: "Архив", statuses: ["rej", "closed"] },
];

function StatusBadge({ s }: { s: Status }) {
  return (
    <Badge className={STATUS[s].tone}>
      <span className={cn("size-1.5 rounded-full", STATUS[s].dot)} />
      {STATUS[s].label}
    </Badge>
  );
}


function AppCard({ a, onOpen }: { a: Application; onOpen: () => void }) {
  const overdue = a.remind_at && a.remind_at <= today();
  return (
    <button
      onClick={onOpen}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
      className="w-full cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md active:cursor-grabbing"
    >
      <p className="line-clamp-2 text-sm font-medium text-slate-900">{a.title}</p>
      {a.company && <p className="mt-0.5 truncate text-xs text-slate-500">{a.company}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge s={a.status} />
        {a.cover_letter_id && <FileText className="size-3.5 text-slate-400" aria-label="Есть письмо" />}
      </div>
      {a.next_action && <p className="mt-2 line-clamp-1 text-xs text-slate-600">→ {a.next_action}</p>}
      {a.remind_at && (
        <p className={cn("mt-1.5 flex items-center gap-1 text-xs", overdue ? "font-medium text-rose-600" : "text-slate-400")}>
          <Bell className="size-3" /> {date(a.remind_at, { day: "numeric", month: "short" })}
        </p>
      )}
    </button>
  );
}

function DetailModal({ a, onClose }: { a: Application | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ status: "plan" as Status, note: "", next_action: "", remind_at: "", applied_at: "" });
  useEffect(() => {
    if (a) setF({ status: a.status, note: a.note, next_action: a.next_action, remind_at: a.remind_at ?? "", applied_at: a.applied_at ?? "" });
  }, [a]);
  const events = useQuery({
    queryKey: ["applications", a?.id, "events"],
    queryFn: () => api<ApplicationEvent[]>(`/applications/${a!.id}/events`),
    enabled: !!a,
  });
  const save = useMutation({
    mutationFn: () =>
      api<Application>(`/applications/${a!.id}`, {
        method: "PATCH",
        json: { ...f, remind_at: f.remind_at || null, applied_at: f.applied_at || null },
      }),
    onSuccess: () => {
      toast.success("Сохранено");
      qc.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => api(`/applications/${a!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Отклик удалён");
      qc.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  if (!a) return null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={a.title}
      description={[a.company, a.source].filter(Boolean).join(" · ")}
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => confirm("Удалить отклик из трекера?") && del.mutate()}
            loading={del.isPending}
          >
            <Trash2 className="size-4" /> Удалить
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {a.vacancy_id && (
          <Link href={`/vacancies/${a.vacancy_id}`}>
            <Button variant="outline" size="sm">
              Карточка вакансии
            </Button>
          </Link>
        )}
        {a.url && (
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              На сайте источника <ExternalLink className="size-3.5" />
            </Button>
          </a>
        )}
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Статус">
            <Select value={f.status} onChange={set("status")}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Дата отклика">
            <Input type="date" value={f.applied_at} onChange={set("applied_at")} />
          </Field>
          <Field label="Следующий шаг">
            <Input value={f.next_action} onChange={set("next_action")} />
          </Field>
          <Field label="Напомнить">
            <Input type="date" value={f.remind_at} onChange={set("remind_at")} />
          </Field>
        </div>
        <Field label="Заметка">
          <Textarea value={f.note} onChange={set("note")} rows={3} />
        </Field>
      </div>
      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold">История статусов</h4>
        {events.data?.length ? (
          <ol className="relative space-y-3 border-l border-slate-200 pl-5">
            {events.data.map((e, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-white", STATUS[e.to]?.dot ?? "bg-slate-400")} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {e.from ? (
                    <>
                      <span className="text-slate-500">{STATUS[e.from]?.label ?? e.from}</span>→
                    </>
                  ) : (
                    <span className="text-slate-500">Создан:</span>
                  )}
                  <span className="font-medium">{STATUS[e.to]?.label ?? e.to}</span>
                  <span className="text-xs text-slate-400">{new Date(e.at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">{events.isPending ? "Загрузка…" : "Пока нет событий"}</p>
        )}
      </div>
    </Modal>
  );
}

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["applications"], queryFn: () => api<Application[]>("/applications") });
  const [view, setView] = useState<"board" | "list">("board");
  const [filter, setFilter] = useState<Status | "">("");
  const [open, setOpen] = useState<Application | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => api(`/applications/${id}`, { method: "PATCH", json: { status } }),
    onMutate: ({ id, status }) => {
      qc.setQueryData<Application[]>(["applications"], (d) => d?.map((a) => (a.id === id ? { ...a, status } : a)));
    },
    onSuccess: (_, { status }) => toast.success(`Статус: ${STATUS[status].label}`),
    onError: (e) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const stats = useMemo(() => {
    const d = q.data ?? [];
    const sent = d.filter((a) => !["plan", "prep"].includes(a.status)).length;
    const interviews = d.filter((a) => ["inv", "int", "offer", "hired"].includes(a.status)).length;
    return [
      { label: "Всего", value: d.length },
      { label: "Отправлено", value: sent },
      { label: "Приглашений", value: interviews },
      { label: "Конверсия", value: sent ? `${Math.round((interviews / sent) * 100)}%` : "—" },
    ];
  }, [q.data]);

  const reminders = (q.data ?? []).filter((a) => a.remind_at && a.remind_at <= today() && !["rej", "closed", "hired"].includes(a.status));

  return (
    <div>
      <PageHeader
        title="Мои отклики"
        description="Ручной трекер: отправляйте отклики на сайте источника и отмечайте статус здесь."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Добавить вручную
          </Button>
        }
      />

      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="Откликов пока нет"
          description="Добавьте вакансию в трекер из её карточки или вручную — для вакансий, найденных в других местах."
          action={
            <div className="flex gap-2">
              <Link href="/vacancies">
                <Button variant="outline">Найти вакансии</Button>
              </Link>
              <Button onClick={() => setCreating(true)}>Добавить вручную</Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="px-5 py-4">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </Card>
            ))}
          </div>

          {reminders.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <Bell className="size-4" /> Пора напомнить о себе ({reminders.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {reminders.map((a) => (
                  <button key={a.id} onClick={() => setOpen(a)} className="rounded-lg bg-white px-2.5 py-1 text-xs text-amber-900 shadow-sm hover:bg-amber-100">
                    {a.title}
                    {a.next_action && ` — ${a.next_action}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  ["board", LayoutGrid, "Доска"],
                  ["list", List, "Список"],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                    view === v ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
            {view === "list" && (
              <Select value={filter} onChange={(e) => setFilter(e.target.value as Status | "")} className="h-9 w-auto">
                <option value="">Все статусы</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].label}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {view === "board" ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-2">
              <div className="grid min-w-[1000px] grid-cols-5 gap-3">
                {BOARD.map((col, ci) => {
                  const items = q.data.filter((a) => col.statuses.includes(a.status));
                  return (
                    <div
                      key={col.title}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(ci);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const id = Number(e.dataTransfer.getData("text/plain"));
                        const a = q.data.find((x) => x.id === id);
                        if (a && !col.statuses.includes(a.status)) move.mutate({ id, status: col.statuses[0] });
                      }}
                      className={cn(
                        "flex min-h-[300px] flex-col rounded-2xl bg-slate-100/70 p-2.5 transition",
                        dragOver === ci && "bg-brand-50 ring-2 ring-brand-300",
                      )}
                    >
                      <div className="mb-2.5 flex items-center justify-between px-1.5">
                        <span className="text-sm font-semibold text-slate-700">{col.title}</span>
                        <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-500">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((a) => (
                          <AppCard key={a.id} a={a} onOpen={() => setOpen(a)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Вакансия</th>
                      <th className="px-5 py-3 font-medium">Статус</th>
                      <th className="px-5 py-3 font-medium">Отклик</th>
                      <th className="px-5 py-3 font-medium">Следующий шаг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {q.data
                      .filter((a) => !filter || a.status === filter)
                      .map((a) => (
                        <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="font-medium">{a.title}</p>
                            <p className="text-xs text-slate-500">{[a.company, a.source].filter(Boolean).join(" · ")}</p>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge s={a.status} />
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="size-3.5 text-slate-400" />
                              {date(a.applied_at)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            {a.next_action || "—"}
                            {a.remind_at && <span className="ml-2 text-xs text-slate-400">({date(a.remind_at, { day: "numeric", month: "short" })})</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {view === "board" && <p className="mt-3 text-center text-xs text-slate-400">Перетаскивайте карточки между колонками, чтобы сменить статус.</p>}
        </>
      )}

      <DetailModal a={open} onClose={() => setOpen(null)} />
      <ApplicationModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
