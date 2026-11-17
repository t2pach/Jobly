"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock,
  ExternalLink,
  FileText,
  KanbanSquare,
  Lightbulb,
  MapPin,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ApplicationModal } from "@/components/application-modal";
import { LetterModal } from "@/components/letter-modal";
import { MatchRing } from "@/components/match-ring";
import { Badge, Button, Card, ErrorState, PageLoader } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { CONFIDENCE, WORK_FORMAT, date, salary, scoreTone, sourceTitle } from "@/lib/format";
import { useToggleSave } from "@/lib/hooks";
import type { MatchResult, Vacancy } from "@/lib/types";

function ReqList({ items, icon: Icon, tone, title }: { items: string[]; icon: typeof CheckCircle2; tone: string; title: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((x) => (
          <li key={x} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchPanel({ id }: { id: number }) {
  const q = useQuery({ queryKey: ["match", id], queryFn: () => api<MatchResult>(`/vacancies/${id}/match`, { method: "POST" }) });
  if (q.isPending) return <Card className="h-80 animate-pulse" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const m = q.data;
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-4 px-6 py-5", scoreTone(m.score).bg)}>
        <MatchRing score={m.score} size={76} stroke={7} />
        <div>
          <p className="font-semibold text-slate-900">Совпадение с профилем</p>
          <p className="text-sm text-slate-600">{CONFIDENCE[m.confidence]}</p>
        </div>
      </div>
      <div className="space-y-2.5 border-b border-slate-100 px-6 py-5">
        {m.breakdown.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600">
                {b.label} <span className="text-slate-400">· вес {b.weight}</span>
              </span>
              <span className={cn("font-medium", b.value === null ? "text-slate-400" : "text-slate-900")}>
                {b.value === null ? "нет данных" : `${Math.round(b.value * 100)}%`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              {b.value !== null && (
                <div
                  className={cn("h-full rounded-full", b.value >= 0.75 ? "bg-emerald-500" : b.value >= 0.5 ? "bg-amber-500" : "bg-rose-400")}
                  style={{ width: `${Math.max(b.value * 100, 3)}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-5 px-6 py-5">
        <ReqList title="Совпадает" items={m.matched_requirements} icon={CheckCircle2} tone="text-emerald-500" />
        <ReqList title="Не хватает" items={m.missing_requirements} icon={XCircle} tone="text-rose-500" />
        <ReqList title="Риски" items={m.risks} icon={AlertTriangle} tone="text-amber-500" />
        <ReqList title="Не удалось проверить" items={m.uncertain_requirements} icon={CircleHelp} tone="text-slate-400" />
        {m.recommendations.length > 0 && (
          <div className="rounded-xl bg-brand-50 p-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-900">
              <Lightbulb className="size-4" /> Рекомендации
            </h4>
            <ul className="space-y-1.5 text-sm text-brand-900/80">
              {m.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-slate-400">
          Оценка детерминированная. Уточните навыки, опыт и веса критериев в{" "}
          <Link href="/profile" className="text-brand-600 hover:underline">
            профиле
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}

export default function VacancyPage() {
  const { id } = useParams<{ id: string }>();
  const vid = Number(id);
  const router = useRouter();
  const q = useQuery({ queryKey: ["vacancy", vid], queryFn: () => api<Vacancy>(`/vacancies/${vid}`) });
  const toggle = useToggleSave();
  const [letterOpen, setLetterOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [letterId, setLetterId] = useState<number | null>(null);

  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const v = q.data;
  const pay = salary(v.salary_from, v.salary_to, v.currency);

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Назад
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-brand-50 text-brand-700">{sourceTitle(v.source)}</Badge>
              {v.also_on.map((s) => (
                <Badge key={s} className="bg-violet-50 text-violet-700">
                  также на {sourceTitle(s)}
                </Badge>
              ))}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">{v.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
              {v.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4 text-slate-400" />
                  {v.company}
                </span>
              )}
              {(v.city || v.region) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-slate-400" />
                  {[v.city, v.region].filter(Boolean).join(", ")}
                </span>
              )}
              {v.published_at && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-slate-400" />
                  {date(v.published_at)}
                </span>
              )}
            </div>
            <p className={cn("mt-4 text-xl font-bold", !pay && "text-base font-normal text-slate-400")}>
              {pay ?? "Зарплата не указана"}
              {pay && v.salary_gross !== null && (
                <span className="ml-2 text-sm font-normal text-slate-500">{v.salary_gross ? "до вычета налогов" : "на руки"}</span>
              )}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Briefcase, label: "Опыт", value: v.experience_years_min === null ? "Не указан" : v.experience_years_min === 0 ? "Без опыта" : `от ${v.experience_years_min} лет` },
                { icon: Clock, label: "Занятость", value: v.employment || "Не указана" },
                { icon: MapPin, label: "Формат", value: v.work_format ? WORK_FORMAT[v.work_format] : v.schedule || "Не указан" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className="size-3.5" /> {label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {v.url && (
                <a href={v.url} target="_blank" rel="noopener noreferrer">
                  <Button>
                    Откликнуться на {sourceTitle(v.source)} <ExternalLink className="size-4" />
                  </Button>
                </a>
              )}
              <Button variant="outline" onClick={() => setLetterOpen(true)}>
                <FileText className="size-4" /> Письмо
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLetterId(null);
                  setAppOpen(true);
                }}
              >
                <KanbanSquare className="size-4" /> В трекер
              </Button>
              <Button variant={v.saved ? "secondary" : "outline"} onClick={() => toggle.mutate(v)} loading={toggle.isPending}>
                <Bookmark className={cn("size-4", v.saved && "fill-current")} />
                {v.saved ? "В избранном" : "Сохранить"}
              </Button>
            </div>
          </Card>

          {v.skills.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-3 font-semibold">Ключевые навыки</h2>
              <div className="flex flex-wrap gap-2">
                {v.skills.map((s) => (
                  <Badge key={s} className="px-3 py-1 text-sm">
                    {s}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Описание</h2>
            {v.description ? (
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{v.description}</div>
            ) : (
              <p className="text-sm text-slate-400">Источник не передал описание.</p>
            )}
            <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Текст показан в том виде, в котором получен от источника.
            </p>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <MatchPanel id={vid} />
        </div>
      </div>

      <LetterModal
        open={letterOpen}
        onClose={() => setLetterOpen(false)}
        vacancyId={vid}
        onUseInTracker={(lid) => {
          setLetterId(lid);
          setLetterOpen(false);
          setAppOpen(true);
        }}
      />
      <ApplicationModal
        open={appOpen}
        onClose={() => setAppOpen(false)}
        vacancyId={vid}
        coverLetterId={letterId}
        defaults={{ title: v.title, company: v.company }}
      />
    </div>
  );
}
