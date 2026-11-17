"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, PageLoader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Education, Experience, Profile } from "@/lib/types";

const WEIGHTS = [
  { key: "skills", label: "Навыки", def: 35 },
  { key: "exp", label: "Опыт работы", def: 20 },
  { key: "title", label: "Должность", def: 15 },
  { key: "salary", label: "Зарплата", def: 10 },
  { key: "fmt", label: "Формат и место", def: 10 },
  { key: "edu", label: "Образование", def: 10 },
];
const DEFAULT_WEIGHTS = Object.fromEntries(WEIGHTS.map((w) => [w.key, w.def]));

type Form = {
  full_name: string;
  city: string;
  goal: string;
  years: string;
  salary_expectation: string;
  work_format: string;
  about: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  weights: Record<string, number>;
};

const toForm = (p: Profile): Form => ({
  full_name: p.full_name ?? "",
  city: p.city ?? "",
  goal: p.goal ?? "",
  years: p.years?.toString() ?? "",
  salary_expectation: p.salary_expectation?.toString() ?? "",
  work_format: p.work_format ?? "any",
  about: p.about ?? "",
  skills: p.skills,
  experience: p.experience,
  education: p.education,
  weights: { ...DEFAULT_WEIGHTS, ...(p.weights ?? {}) },
});

function SkillsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
    const seen = new Set(value.map((s) => s.toLowerCase()));
    const fresh = parts.filter((p) => !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
    if (fresh.length) onChange([...value, ...fresh]);
    setText("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          placeholder="Python, SQL, Figma… (Enter для добавления)"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!text.trim()}>
          Добавить
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-700">
              {s}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Удалить ${s}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Навыки — главный критерий совпадения. Добавьте только те, что у вас действительно есть.</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile"], queryFn: () => api<Profile>("/profile") });
  const [f, setF] = useState<Form | null>(null);
  useEffect(() => {
    if (q.data) setF(toForm(q.data));
  }, [q.data]);

  const dirty = useMemo(() => !!(f && q.data && JSON.stringify(f) !== JSON.stringify(toForm(q.data))), [f, q.data]);

  const save = useMutation({
    mutationFn: (form: Form) =>
      api<Profile>("/profile", {
        method: "PATCH",
        json: {
          full_name: form.full_name,
          city: form.city,
          goal: form.goal,
          years: form.years === "" ? 0 : Number(form.years),
          salary_expectation: form.salary_expectation === "" ? null : Number(form.salary_expectation),
          work_format: form.work_format,
          about: form.about,
          skills: form.skills,
          experience: form.experience.filter((e) => e.company.trim() || e.position.trim()),
          education: form.education.filter((e) => e.institution.trim()).map((e) => ({ ...e, year: e.year || null })),
          weights: form.weights,
        },
      }),
    onSuccess: (p) => {
      qc.setQueryData(["profile"], p);
      qc.invalidateQueries({ queryKey: ["search"] });
      qc.invalidateQueries({ queryKey: ["match"] });
      qc.invalidateQueries({ queryKey: ["vacancy"] });
      toast.success("Профиль сохранён");
    },
    onError: (e) => toast.error(e.message),
  });

  if (q.isPending || (!f && !q.isError)) return <PageLoader />;
  if (q.isError || !f) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const inp = (k: "full_name" | "city" | "goal" | "years" | "salary_expectation" | "work_format" | "about") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });
  const updExp = (i: number, patch: Partial<Experience>) => set("experience", f.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const updEdu = (i: number, patch: Partial<Education>) => set("education", f.education.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const checks = [!!f.full_name, !!f.goal, !!f.city, f.years !== "", f.skills.length >= 3, !!f.salary_expectation, f.experience.length > 0];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const totalWeight = Object.values(f.weights).reduce((a, b) => a + b, 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(f);
      }}
      className="pb-24"
    >
      <PageHeader title="Профиль" description="Эти данные используются для оценки совпадения и писем. Ничего не додумывается." />

      <Card className="mb-6 flex items-center gap-5 px-6 py-5">
        <div className="flex-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Заполненность профиля</span>
            <span className="font-semibold text-brand-700">{completeness}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${completeness}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Чем полнее профиль, тем точнее оценка и тем меньше пропусков в письмах.</p>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Основное" />
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Имя и фамилия">
              <Input {...inp("full_name")} maxLength={200} placeholder="Иван Петров" />
            </Field>
            <Field label="Желаемая должность" hint="карьерная цель">
              <Input {...inp("goal")} maxLength={200} placeholder="Python-разработчик" />
            </Field>
            <Field label="Город">
              <Input {...inp("city")} maxLength={120} placeholder="Москва" />
            </Field>
            <Field label="Формат работы">
              <Select {...inp("work_format")}>
                <option value="any">Любой</option>
                <option value="remote">Удалённо</option>
                <option value="hybrid">Гибрид</option>
                <option value="office">Офис</option>
              </Select>
            </Field>
            <Field label="Опыт работы, лет">
              <Input type="number" min={0} max={60} step={0.5} {...inp("years")} placeholder="3" />
            </Field>
            <Field label="Ожидаемая зарплата, ₽">
              <Input type="number" min={0} step={5000} {...inp("salary_expectation")} placeholder="150000" />
            </Field>
            <Field label="О себе" className="sm:col-span-2">
              <Textarea {...inp("about")} rows={4} placeholder="Коротко о том, чем занимаетесь и что ищете" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Навыки" description="Подтверждённые навыки участвуют в оценке совпадения." />
          <div className="p-6">
            <SkillsInput value={f.skills} onChange={(v) => set("skills", v)} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Опыт работы"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("experience", [...f.experience, { company: "", position: "", start: "", end: "", description: "", achievements: [] }])}
              >
                <Plus className="size-4" /> Добавить
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {f.experience.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">Опыт не добавлен</p>}
            {f.experience.map((e, i) => (
              <div key={i} className="grid gap-4 p-6 sm:grid-cols-2">
                <Field label="Компания">
                  <Input value={e.company} onChange={(x) => updExp(i, { company: x.target.value })} maxLength={200} />
                </Field>
                <Field label="Должность">
                  <Input value={e.position} onChange={(x) => updExp(i, { position: x.target.value })} maxLength={200} />
                </Field>
                <Field label="Начало">
                  <Input value={e.start} onChange={(x) => updExp(i, { start: x.target.value })} placeholder="2021-03" />
                </Field>
                <Field label="Окончание">
                  <Input value={e.end} onChange={(x) => updExp(i, { end: x.target.value })} placeholder="по настоящее время" />
                </Field>
                <Field label="Обязанности" className="sm:col-span-2">
                  <Textarea value={e.description} onChange={(x) => updExp(i, { description: x.target.value })} rows={2} />
                </Field>
                <Field label="Достижения" hint="по одному в строке" className="sm:col-span-2">
                  <Textarea
                    value={e.achievements.join("\n")}
                    onChange={(x) => updExp(i, { achievements: x.target.value.split("\n") })}
                    onBlur={() => updExp(i, { achievements: e.achievements.map((a) => a.trim()).filter(Boolean) })}
                    rows={2}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => set("experience", f.experience.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" /> Удалить место работы
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Образование"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => set("education", [...f.education, { institution: "", specialty: "", year: null }])}>
                <Plus className="size-4" /> Добавить
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {f.education.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">Образование не добавлено</p>}
            {f.education.map((e, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
                <GraduationCap className="hidden size-5 shrink-0 self-center text-slate-300 sm:block" />
                <Field label="Учебное заведение" className="flex-1">
                  <Input value={e.institution} onChange={(x) => updEdu(i, { institution: x.target.value })} maxLength={200} />
                </Field>
                <Field label="Специальность" className="flex-1">
                  <Input value={e.specialty} onChange={(x) => updEdu(i, { specialty: x.target.value })} />
                </Field>
                <Field label="Год" className="sm:w-28">
                  <Input type="number" min={1950} max={2100} value={e.year ?? ""} onChange={(x) => updEdu(i, { year: x.target.value ? Number(x.target.value) : null })} />
                </Field>
                <Button type="button" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => set("education", f.education.filter((_, j) => j !== i))} aria-label="Удалить">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Важность критериев"
            description="Как сильно каждый критерий влияет на оценку совпадения."
            action={
              <Button type="button" variant="ghost" size="sm" onClick={() => set("weights", { ...DEFAULT_WEIGHTS })}>
                <RotateCcw className="size-4" /> По умолчанию
              </Button>
            }
          />
          <div className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
            {WEIGHTS.map((w) => {
              const val = f.weights[w.key] ?? w.def;
              return (
                <div key={w.key}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{w.label}</span>
                    <span className="text-slate-500">{totalWeight ? Math.round((val / totalWeight) * 100) : 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={val}
                    onChange={(e) => set("weights", { ...f.weights, [w.key]: Number(e.target.value) })}
                    className="w-full cursor-pointer accent-brand-600"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur transition-transform lg:left-64",
          dirty ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-600">Есть несохранённые изменения</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => q.data && setF(toForm(q.data))}>
              Отменить
            </Button>
            <Button type="submit" loading={save.isPending}>
              <Save className="size-4" /> Сохранить
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
