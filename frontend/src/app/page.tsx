"use client";

import { ArrowRight, FileText, GitMerge, KanbanSquare, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { MatchRing } from "@/components/match-ring";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  { icon: ScanSearch, title: "Единый поиск", text: "Опрашиваем подключённые площадки параллельно. Сбой одной не мешает остальным." },
  { icon: GitMerge, title: "Без дублей", text: "Одинаковые вакансии с разных сайтов объединяются в одну карточку." },
  { icon: Sparkles, title: "Объяснимое совпадение", text: "Видно, какие требования вы закрываете, чего не хватает и где риски." },
  { icon: FileText, title: "Честные письма", text: "Сопроводительное собирается из вашего профиля. Пробелы помечены, а не выдуманы." },
  { icon: KanbanSquare, title: "Трекер откликов", text: "Ведите статусы, заметки, напоминания и историю по каждой вакансии." },
  { icon: ShieldCheck, title: "Ваши данные — ваши", text: "Экспорт и полное удаление аккаунта в один клик. Никаких автооткликов." },
];

export default function Landing() {
  const { authed } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authed) router.replace("/vacancies");
  }, [authed, router]);

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Войти
          </Link>
          <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            Начать бесплатно
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-brand-50 via-violet-50/50 to-white" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkles className="size-3.5" /> AI Career Assistant
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              Найдите работу, которая
              <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent"> действительно подходит</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Jobly собирает вакансии из разных источников, честно оценивает совпадение с вашим профилем и помогает вести отклики — без
              спама работодателям.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-medium text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
              >
                Создать аккаунт <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 hover:bg-slate-50">
                У меня есть аккаунт
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-brand-200/50 to-violet-200/50 blur-2xl" />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Python-разработчик</p>
                  <p className="text-sm text-slate-500">ООО Ромашка · Москва</p>
                  <p className="mt-2 text-sm font-semibold">150 000 – 220 000 ₽</p>
                </div>
                <MatchRing score={82} size={64} />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Навыки: Python, FastAPI, PostgreSQL
                </p>
                <p className="flex items-center gap-2 text-rose-600">
                  <span className="size-1.5 rounded-full bg-rose-500" /> Не хватает: Kubernetes
                </p>
                <p className="flex items-center gap-2 text-amber-700">
                  <span className="size-1.5 rounded-full bg-amber-500" /> Опыт: требуется от 3 лет, у вас 2
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-brand-500 to-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6 transition hover:border-brand-200 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
