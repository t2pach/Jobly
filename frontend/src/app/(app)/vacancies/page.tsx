"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { VacancyCard, VacancyCardSkeleton } from "@/components/vacancy-card";
import { Badge, Button, EmptyState, ErrorState, Input, Label, Select } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural, sourceTitle } from "@/lib/format";
import type { Integration, SearchResult } from "@/lib/types";

const REGIONS: [string, string][] = [
  ["", "Все регионы"],
  ["7700000000000", "Москва"],
  ["5000000000000", "Московская область"],
  ["7800000000000", "Санкт-Петербург"],
  ["4700000000000", "Ленинградская область"],
  ["1600000000000", "Республика Татарстан"],
  ["6300000000000", "Самарская область"],
  ["6600000000000", "Свердловская область"],
  ["5400000000000", "Новосибирская область"],
  ["2300000000000", "Краснодарский край"],
  ["5200000000000", "Нижегородская область"],
];

const PER_PAGE = 20;
type Filters = {
  query: string;
  region_code: string;
  city: string;
  work_format: string;
  salary_from: string;
  experience_max: string;
  source: string;
  sort: string;
  page: string;
};
const KEYS: (keyof Filters)[] = ["query", "region_code", "city", "work_format", "salary_from", "experience_max", "source", "sort", "page"];

function SearchPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const applied = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ""])) as Filters;
  const [draft, setDraft] = useState<Filters>(applied);
  const [showFilters, setShowFilters] = useState(false);
  const spKey = sp.toString();
  useEffect(() => setDraft(Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ""])) as Filters), [spKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const integrations = useQuery({ queryKey: ["integrations"], queryFn: () => api<Integration[]>("/integrations"), staleTime: 300_000 });
  const page = Number(applied.page || 0);
  const search = useQuery({
    queryKey: ["search", spKey],
    queryFn: () => api<SearchResult>(`/vacancies${qs({ ...applied, sort: applied.sort || "match", page, per_page: PER_PAGE })}`),
    placeholderData: (prev) => prev,
    staleTime: 120_000,
  });

  function apply(next: Partial<Filters>, resetPage = true) {
    const f = { ...draft, ...next, ...(resetPage ? { page: "" } : {}) };
    const url = `/vacancies${qs(f)}`;
    if (url === `/vacancies${qs(applied)}`) search.refetch();
    else router.push(url);
  }

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });
  const enabledSources = integrations.data?.filter((i) => i.enabled) ?? [];
  const activeFilters = KEYS.filter((k) => !["query", "sort", "page"].includes(k) && applied[k]).length;
  const data = search.data;
  const failing = data ? Object.entries(data.sources).filter(([, s]) => s.status !== "ok") : [];
  const hasMore = data ? Object.values(data.sources).some((s) => s.status === "ok" && (s.count ?? 0) >= PER_PAGE) : false;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Поиск вакансий</h1>
        <p className="mt-1 text-sm text-slate-500">Ищем во всех включённых источниках и сортируем по совпадению с вашим профилем.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={draft.query} onChange={set("query")} placeholder="Должность, навык или ключевое слово" className="h-11 pl-10" maxLength={200} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="size-4" />
              Фильтры
              {activeFilters > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeFilters}</span>}
            </Button>
            <Button type="submit" className="h-11 flex-1 px-6 sm:flex-none" loading={search.isFetching}>
              Найти
            </Button>
          </div>
        </div>

        <div className={cn("grid gap-4 overflow-hidden transition-all sm:grid-cols-2 lg:grid-cols-4", showFilters ? "mt-4 border-t border-slate-100 pt-4" : "hidden")}>
          <div>
            <Label>Регион</Label>
            <Select value={draft.region_code} onChange={set("region_code")}>
              {REGIONS.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Город</Label>
            <Input value={draft.city} onChange={set("city")} placeholder="Например, Самара" />
          </div>
          <div>
            <Label>Формат работы</Label>
            <Select value={draft.work_format} onChange={set("work_format")}>
              <option value="">Любой</option>
              <option value="remote">Удалённо</option>
              <option value="hybrid">Гибрид</option>
              <option value="office">Офис</option>
            </Select>
          </div>
          <div>
            <Label>Зарплата от, ₽</Label>
            <Input type="number" min={0} step={5000} value={draft.salary_from} onChange={set("salary_from")} placeholder="100 000" />
          </div>
          <div>
            <Label>Мой опыт, лет</Label>
            <Input type="number" min={0} step={1} value={draft.experience_max} onChange={set("experience_max")} placeholder="Не важно" />
          </div>
          <div>
            <Label>Источник</Label>
            <Select value={draft.source} onChange={set("source")}>
              <option value="">Все включённые</option>
              {enabledSources.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              Применить
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const cleared = { ...draft, region_code: "", city: "", work_format: "", salary_from: "", experience_max: "", source: "" };
                setDraft(cleared);
                router.push(`/vacancies${qs({ query: cleared.query, sort: cleared.sort })}`);
              }}
            >
              Сбросить
            </Button>
          </div>
        </div>
      </form>

      {data && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              Найдено <b className="text-slate-900">{data.items.length}</b> {plural(data.items.length, "вакансия", "вакансии", "вакансий")}
              {page > 0 && ` · страница ${page + 1}`}
            </span>
            {Object.entries(data.sources).map(([code, s]) => (
              <Badge
                key={code}
                className={s.status === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                title={s.detail}
              >
                <span className={cn("size-1.5 rounded-full", s.status === "ok" ? "bg-emerald-500" : "bg-amber-500")} />
                {sourceTitle(code)}
                {s.status === "ok" ? `: ${s.count}` : ""}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Сортировка</span>
            <Select value={applied.sort || "match"} onChange={(e) => apply({ sort: e.target.value })} className="h-9 w-auto">
              <option value="match">По совпадению</option>
              <option value="salary">По зарплате</option>
              <option value="date">По дате</option>
            </Select>
          </div>
        </div>
      )}

      {failing.length > 0 && (
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            {failing.map(([code, s]) => (
              <p key={code}>
                <b>{sourceTitle(code)}</b> {s.status === "unavailable" ? "недоступен" : "вернул ошибку"}
                {s.detail ? `: ${s.detail}` : ""}. Результаты остальных источников показаны.
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {search.isPending ? (
          Array.from({ length: 5 }, (_, i) => <VacancyCardSkeleton key={i} />)
        ) : search.isError ? (
          <ErrorState error={search.error} onRetry={() => search.refetch()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Ничего не нашлось"
            description="Попробуйте изменить запрос, расширить регион или убрать часть фильтров."
          />
        ) : (
          <div className={cn("space-y-3 transition-opacity", search.isFetching && "opacity-60")}>
            {data?.items.map((v) => <VacancyCard key={v.id} v={v} />)}
          </div>
        )}
      </div>

      {data && (page > 0 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => apply({ page: String(page - 1) }, false)}>
            <ChevronLeft className="size-4" /> Назад
          </Button>
          <span className="px-3 text-sm text-slate-500">Страница {page + 1}</span>
          <Button variant="outline" disabled={!hasMore} onClick={() => apply({ page: String(page + 1) }, false)}>
            Вперёд <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {data?.note && (
        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Info className="size-3.5" /> {data.note}
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
