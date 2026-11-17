"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, RefreshCw, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Letter } from "@/lib/types";
import { Button, Modal, Textarea } from "./ui";

const TONES = [
  { v: "short", label: "Коротко", text: "3–4 предложения" },
  { v: "standard", label: "Стандартно", text: "С целью и навыками" },
  { v: "bold", label: "Уверенно", text: "С акцентом на результат" },
] as const;

export function LetterModal({
  open,
  onClose,
  vacancyId,
  onUseInTracker,
}: {
  open: boolean;
  onClose: () => void;
  vacancyId: number;
  onUseInTracker: (letterId: number) => void;
}) {
  const [tone, setTone] = useState<(typeof TONES)[number]["v"]>("standard");
  const [letter, setLetter] = useState<Letter | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const gen = useMutation({
    mutationFn: () => api<Letter>("/cover-letters/generate", { method: "POST", json: { vacancy_id: vacancyId, tone } }),
    onSuccess: (l) => {
      setLetter(l);
      setText(l.text);
    },
    onError: (e) => toast.error(e.message),
  });
  const left = (text.match(/\[/g) ?? []).length;

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Сопроводительное письмо"
      description="Собирается только из данных вашего профиля. Всё, чего нет в профиле, помечено [в скобках]."
      footer={
        letter ? (
          <>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Скопировано" : "Копировать"}
            </Button>
            <Button onClick={() => onUseInTracker(letter.id)}>Добавить в трекер с этим письмом</Button>
          </>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {TONES.map((t) => (
          <button
            key={t.v}
            onClick={() => setTone(t.v)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              tone === t.v ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300",
            )}
          >
            <p className="text-sm font-medium">{t.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t.text}</p>
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" onClick={() => gen.mutate()} loading={gen.isPending} variant={letter ? "outline" : "primary"}>
        {letter ? <RefreshCw className="size-4" /> : <Wand2 className="size-4" />}
        {letter ? "Сгенерировать заново" : "Сгенерировать"}
      </Button>
      {letter && (
        <div className="mt-4 animate-fade-in">
          {left > 0 && (
            <p className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="size-4 shrink-0" />
              Заполните {left} {left === 1 ? "место" : left < 5 ? "места" : "мест"} в [скобках] перед отправкой.
            </p>
          )}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="font-[inherit]" />
          <p className="mt-2 text-xs text-slate-400">Правки здесь не сохраняются на сервере — скопируйте текст и вставьте на сайте вакансии.</p>
        </div>
      )}
    </Modal>
  );
}
