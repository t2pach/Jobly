"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Minus, RefreshCw } from "lucide-react";
import { Badge, Button, Card, ErrorState, PageHeader, PageLoader } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Integration } from "@/lib/types";

const HEALTH: Record<string, { label: string; tone: string; dot: string }> = {
  ok: { label: "Работает", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Ограничен", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  not_configured: { label: "Не настроен", tone: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  error: { label: "Ошибка", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

const FILTERS: Record<string, string> = { query: "запрос", region_code: "регион", experience: "опыт" };

function Cap({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <Check className="size-4 text-emerald-500" /> : <Minus className="size-4 text-slate-300" />}
      <span className={ok ? "text-slate-700" : "text-slate-400"}>{children}</span>
    </li>
  );
}

export default function IntegrationsPage() {
  const q = useQuery({ queryKey: ["integrations"], queryFn: () => api<Integration[]>("/integrations") });
  return (
    <div>
      <PageHeader
        title="Источники вакансий"
        description="Состояние подключённых площадок и что каждая из них реально умеет."
        action={
          <Button variant="outline" onClick={() => q.refetch()} loading={q.isFetching}>
            <RefreshCw className="size-4" /> Проверить
          </Button>
        }
      />
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {q.data.map((i) => {
            const h = HEALTH[i.health.status] ?? HEALTH.error;
            return (
              <Card key={i.code} className={cn("flex flex-col p-6", !i.enabled && "opacity-75")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{i.title}</h3>
                    <p className="text-xs text-slate-400">{i.code}</p>
                  </div>
                  <Badge className={i.enabled ? "bg-brand-50 text-brand-700" : ""}>{i.enabled ? "Включён" : "Выключен"}</Badge>
                </div>
                <Badge className={cn("mt-4 self-start", h.tone)}>
                  <span className={cn("size-1.5 rounded-full", h.dot)} />
                  {h.label}
                </Badge>
                {i.health.detail && <p className="mt-2 text-xs text-slate-500">{i.health.detail}</p>}
                <ul className="mt-5 space-y-1.5 border-t border-slate-100 pt-4">
                  <Cap ok={i.capabilities.search}>Поиск вакансий</Cap>
                  <Cap ok={i.capabilities.get_by_id}>Получение вакансии по ID</Cap>
                  <Cap ok={i.capabilities.server_filters.length > 0}>
                    Фильтры на стороне источника
                    {i.capabilities.server_filters.length > 0 && `: ${i.capabilities.server_filters.map((f) => FILTERS[f] ?? f).join(", ")}`}
                  </Cap>
                  <Cap ok={i.capabilities.apply_from_app}>Отклик из приложения</Cap>
                  <Cap ok={i.capabilities.commercial_use_verified}>Коммерческое использование подтверждено</Cap>
                </ul>
                <p className="mt-auto pt-4 text-xs text-slate-400">Проверено: {new Date(i.health.checked_at).toLocaleString("ru-RU")}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
