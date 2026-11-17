"use client";

import {
  BarChart3,
  Bookmark,
  Briefcase,
  KanbanSquare,
  LogOut,
  Menu,
  Plug,
  Search,
  Settings,
  Shield,
  Target,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

const NAV = [
  { href: "/vacancies", label: "Поиск вакансий", icon: Search },
  { href: "/saved", label: "Избранное", icon: Bookmark },
  { href: "/applications", label: "Мои отклики", icon: KanbanSquare },
  { href: "/profile", label: "Профиль", icon: UserRound },
  { href: "/goals", label: "Карьерные цели", icon: Target },
  { href: "/analytics", label: "Аналитика рынка", icon: BarChart3 },
  { href: "/integrations", label: "Источники", icon: Plug },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { me } = useAuth();
  const items = [...NAV, ...(me?.is_admin ? [{ href: "/admin", label: "Администрирование", icon: Shield }] : [])];
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock() {
  const { me, logout } = useAuth();
  return (
    <div className="border-t border-slate-200 p-3">
      <Link href="/settings" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100">
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold uppercase text-slate-600">
          {me?.email[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{me?.email}</p>
          <p className="text-xs text-slate-500">{me?.is_admin ? "Администратор" : "Соискатель"}</p>
        </div>
        <Settings className="size-4 text-slate-400" />
      </Link>
      <button
        onClick={logout}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <LogOut className="size-4" /> Выйти
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/vacancies" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks />
          <div className="mt-6 rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 text-xs leading-relaxed text-slate-600">
            <Briefcase className="mb-2 size-4 text-brand-600" />
            Jobly не отправляет отклики автоматически. Откликайтесь на сайте источника и отмечайте статус в трекере.
          </div>
        </div>
        <UserBlock />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/vacancies" />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Меню">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo href="/vacancies" />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Закрыть">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserBlock />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
