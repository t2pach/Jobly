"use client";

import { Bookmark, Building2, Clock, Layers, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { CONFIDENCE, WORK_FORMAT, relativeDate, salary, sourceTitle } from "@/lib/format";
import { useToggleSave } from "@/lib/hooks";
import type { Vacancy } from "@/lib/types";
import { MatchRing } from "./match-ring";
import { Badge } from "./ui";

export function VacancyCard({ v }: { v: Vacancy }) {
  const toggle = useToggleSave();
  const pay = salary(v.salary_from, v.salary_to, v.currency);
  return (
    <div className="group relative flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 transition hover:border-brand-200 hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/vacancies/${v.id}`} className="font-semibold text-slate-900 after:absolute after:inset-0 group-hover:text-brand-700">
              {v.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {v.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  {v.company}
                </span>
              )}
              {(v.city || v.region) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {v.city || v.region}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", pay ? "text-slate-900" : "text-slate-400 font-normal")}>
            <Wallet className="size-4 text-slate-400" />
            {pay ?? "Зарплата не указана"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {v.work_format && <Badge className="bg-emerald-50 text-emerald-700">{WORK_FORMAT[v.work_format] ?? v.work_format}</Badge>}
          {v.experience_years_min !== null && (
            <Badge>{v.experience_years_min === 0 ? "Без опыта" : `Опыт от ${v.experience_years_min} г.`}</Badge>
          )}
          {v.employment && <Badge>{v.employment}</Badge>}
          <Badge className="bg-brand-50 text-brand-700">{sourceTitle(v.source)}</Badge>
          {v.also_on.length > 0 && (
            <Badge className="bg-violet-50 text-violet-700" title={v.also_on.map(sourceTitle).join(", ")}>
              <Layers className="size-3" />
              ещё на {v.also_on.length}
            </Badge>
          )}
          {v.published_at && (
            <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <Clock className="size-3" />
              {relativeDate(v.published_at)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-2">
        <div className="text-center" title={v.match_confidence ? CONFIDENCE[v.match_confidence] : undefined}>
          <MatchRing score={v.match_score} />
          {v.match_confidence && v.match_confidence !== "high" && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{v.match_confidence === "low" ? "примерно" : "оценка"}</p>
          )}
        </div>
        <button
          onClick={() => toggle.mutate(v)}
          disabled={toggle.isPending}
          className={cn(
            "relative z-10 rounded-lg p-2 transition",
            v.saved ? "text-brand-600 hover:bg-brand-50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
          )}
          aria-label={v.saved ? "Убрать из избранного" : "В избранное"}
        >
          <Bookmark className={cn("size-5", v.saved && "fill-current")} />
        </button>
      </div>
    </div>
  );
}

export function VacancyCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="flex-1 space-y-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="size-14 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}
