"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { date } from "@/lib/format";
import type { AdminSource, AdminUser } from "@/lib/types";

function Sources() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "sources"], queryFn: () => api<AdminSource[]>("/admin/sources") });
  const toggle = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) => api(`/admin/sources/${code}`, { method: "PATCH", json: { enabled } }),
    onSuccess: (_, v) => {
      toast.success(v.enabled ? "Источник включён" : "Источник выключен");
      qc.invalidateQueries({ queryKey: ["admin", "sources"] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader title="Источники" description="Включённые источники опрашиваются при каждом поиске." />
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <div className="p-6">
          <ErrorState error={q.error} />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {q.data.map((s) => (
            <div key={s.code} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.title} <span className="text-xs font-normal text-slate-400">{s.code}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Последний опрос: {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString("ru-RU") : "не было"}
                  {s.last_status && (
                    <Badge className={cn("ml-2", s.last_status === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{s.last_status}</Badge>
                  )}
                </p>
                {s.last_error && <p className="mt-1 truncate text-xs text-rose-600">{s.last_error}</p>}
              </div>
              <Toggle checked={s.enabled} disabled={toggle.isPending} onChange={(enabled) => toggle.mutate({ code: s.code, enabled })} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Users() {
  const qc = useQueryClient();
  const { me } = useAuth();
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: () => api<AdminUser[]>("/admin/users") });
  const [pending, setPending] = useState<number | null>(null);
  const block = useMutation({
    mutationFn: ({ id, is_blocked }: { id: number; is_blocked: boolean }) => api(`/admin/users/${id}/block`, { method: "PATCH", json: { is_blocked } }),
    onMutate: ({ id }) => setPending(id),
    onSuccess: (_, v) => {
      toast.success(v.is_blocked ? "Пользователь заблокирован" : "Пользователь разблокирован");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setPending(null),
  });
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Пользователи" description="Доступны только учётные данные — резюме и профили администратору не видны." />
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <div className="p-6">
          <ErrorState error={q.error} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Регистрация</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 text-slate-400">{u.id}</td>
                  <td className="px-6 py-3 font-medium">
                    {u.email}
                    {u.is_admin && <Badge className="ml-2 bg-brand-50 text-brand-700">admin</Badge>}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{date(u.created_at)}</td>
                  <td className="px-6 py-3">
                    <Badge className={u.is_blocked ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}>
                      {u.is_blocked ? "Заблокирован" : "Активен"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {u.id !== me?.id && (
                      <Button
                        size="sm"
                        variant={u.is_blocked ? "outline" : "ghost"}
                        className={u.is_blocked ? "" : "text-rose-600 hover:bg-rose-50"}
                        loading={pending === u.id}
                        onClick={() => block.mutate({ id: u.id, is_blocked: !u.is_blocked })}
                      >
                        {u.is_blocked ? "Разблокировать" : "Заблокировать"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function AdminPage() {
  const { me } = useAuth();
  if (!me?.is_admin) return <EmptyState icon={Shield} title="Недостаточно прав" description="Раздел доступен только администраторам." />;
  return (
    <div>
      <PageHeader title="Администрирование" description="Управление источниками и пользователями." />
      <div className="space-y-6">
        <Sources />
        <Users />
      </div>
    </div>
  );
}
