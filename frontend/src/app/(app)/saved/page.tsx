"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { VacancyCard, VacancyCardSkeleton } from "@/components/vacancy-card";
import { Button, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import type { Vacancy } from "@/lib/types";

export default function SavedPage() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => api<Vacancy[]>("/saved-vacancies") });
  return (
    <div>
      <PageHeader
        title="Избранное"
        description={q.data ? `${q.data.length} ${plural(q.data.length, "сохранённая вакансия", "сохранённые вакансии", "сохранённых вакансий")}` : "Сохранённые вакансии"}
      />
      {q.isPending ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <VacancyCardSkeleton key={i} />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Пока пусто"
          description="Сохраняйте интересные вакансии из поиска, чтобы вернуться к ним позже."
          action={
            <Link href="/vacancies">
              <Button>Перейти к поиску</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">{q.data.map((v) => <VacancyCard key={v.id} v={{ ...v, saved: true }} />)}</div>
      )}
    </div>
  );
}
