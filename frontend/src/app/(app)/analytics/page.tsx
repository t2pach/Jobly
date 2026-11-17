"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Info, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, PageLoader } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { WORK_FORMAT, date, money } from "@/lib/format";
import type { MarketStats } from "@/lib/types";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#94a3b8", "#ec4899"];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [draft, setDraft] = useState({ query: "", region: "" });
  const [params, setParams] = useState(draft);
  const q = useQuery({ queryKey: ["market", params], queryFn: () => api<MarketStats>(`/analytics/market${qs(params)}`) });
  const d = q.data;
  const formats = d ? Object.entries(d.formats).map(([k, v]) => ({ name: WORK_FORMAT[k] ?? k, value: v })) : [];
  const skills = d ? d.top_skills.map(([name, count]) => ({ name, count })) : [];

  return (
    <div>
      <PageHeader title="Аналитика рынка" description="Статистика по вакансиям, которые уже были найдены через поиск. Внешние источники не опрашиваются." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParams(draft);
        }}
        className="mb-6 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} placeholder="Должность" className="pl-10" maxLength={200} />
        </div>
        <Input value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} placeholder="Регион" className="sm:w-60" />
        <Button type="submit" loading={q.isFetching}>
          Показать
        </Button>
      </form>

      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !d || d.sample_size === 0 ? (
        <EmptyState icon={BarChart3} title="Нет данных" description="Сначала выполните поиск вакансий — статистика строится по найденным вакансиям." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Вакансий в выборке" value={String(d.sample_size)} sub={`с зарплатой: ${d.with_salary}`} />
            <Stat label="Медиана зарплаты" value={d.salary.median ? money(d.salary.median) : "—"} sub={d.salary.basis} />
            <Stat label="Минимум" value={d.salary.min ? money(d.salary.min) : "—"} />
            <Stat label="Максимум" value={d.salary.max ? money(d.salary.max) : "—"} />
          </div>

          {d.vs_expectation && (
            <Card className="flex items-center gap-4 px-6 py-5">
              <div
                className={`flex size-11 items-center justify-center rounded-xl ${d.vs_expectation.above_median ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
              >
                {d.vs_expectation.above_median ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
              </div>
              <div>
                <p className="font-medium">
                  Ваши ожидания {money(d.vs_expectation.expectation)} — {d.vs_expectation.above_median ? "выше" : "не выше"} медианы рынка
                </p>
                <p className="text-sm text-slate-500">
                  Медиана по выборке: {money(d.vs_expectation.median)}.{" "}
                  {d.vs_expectation.above_median ? "Подчеркните в отклике сильные стороны и результаты." : "Запрос соответствует рынку."}
                </p>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Формат работы" />
              <div className="flex items-center gap-6 p-6">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={formats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {formats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">
                  {formats.map((f, i) => (
                    <li key={f.name} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600">{f.name}</span>
                      <span className="font-medium">{f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            <Card>
              <CardHeader title="Топ навыков" />
              <div className="p-6">
                {skills.length ? (
                  <div className="h-56">
                    <ResponsiveContainer>
                      <BarChart data={skills} layout="vertical" margin={{ left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#f1f5f9" }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">Источники не передают структурированные навыки.</p>
                )}
              </div>
            </Card>
          </div>

          {(d.notes.length > 0 || d.period.from) && (
            <div className="rounded-xl bg-slate-100 px-5 py-4 text-sm text-slate-600">
              {d.period.from && (
                <p className="mb-1">
                  Период: {date(d.period.from)} — {date(d.period.to)}
                </p>
              )}
              {d.notes.map((n) => (
                <p key={n} className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-slate-400" /> {n}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
