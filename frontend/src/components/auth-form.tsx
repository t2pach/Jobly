"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isReg = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isReg && password.length < 10) return setError("Пароль должен быть не короче 10 символов");
    if (isReg && password !== confirm) return setError("Пароли не совпадают");
    setLoading(true);
    try {
      await (isReg ? register : login)(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{isReg ? "Создайте аккаунт" : "С возвращением"}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {isReg ? "Пара минут — и можно искать вакансии." : "Войдите, чтобы продолжить поиск."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Пароль" hint={isReg ? "от 10 символов" : undefined}>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              autoComplete={isReg ? "new-password" : "current-password"}
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
              aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {isReg && (
          <Field label="Повторите пароль">
            <Input type={show ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {isReg ? "Зарегистрироваться" : "Войти"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {isReg ? "Уже есть аккаунт? " : "Нет аккаунта? "}
        <Link href={isReg ? "/login" : "/register"} className="font-medium text-brand-600 hover:text-brand-700">
          {isReg ? "Войти" : "Зарегистрироваться"}
        </Link>
      </p>
    </>
  );
}
