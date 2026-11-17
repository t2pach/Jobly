"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";

const POINTS = [
  "Единый поиск по нескольким площадкам с объединением дублей",
  "Прозрачная оценка совпадения: что подходит, чего не хватает и где риски",
  "Сопроводительные письма только из ваших реальных данных",
  "Трекер откликов с историей статусов",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { authed } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authed) router.replace(new URLSearchParams(location.search).get("next") || "/vacancies");
  }, [authed, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-in">{children}</div>
        </div>
        <p className="text-xs text-slate-400">© Jobly. Отклики отправляются только вами на сайте источника.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 lg:block">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <h2 className="max-w-md text-3xl font-bold leading-tight">Карьерный ассистент, который не выдумывает и не спамит работодателей</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-brand-50">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
