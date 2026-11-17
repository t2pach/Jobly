"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STATUS, STATUS_ORDER } from "@/lib/format";
import type { Application, Status } from "@/lib/types";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";

export function ApplicationModal({
  open,
  onClose,
  vacancyId,
  coverLetterId,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  vacancyId?: number;
  coverLetterId?: number | null;
  defaults?: { title?: string; company?: string };
}) {
  const qc = useQueryClient();
  const empty = { title: "", company: "", url: "", source: "", status: "plan" as Status, note: "", next_action: "", remind_at: "", applied_at: "" };
  const [f, setF] = useState(empty);
  useEffect(() => {
    if (open) setF({ ...empty, title: defaults?.title ?? "", company: defaults?.company ?? "" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: () =>
      api<Application>("/applications", {
        method: "POST",
        json: {
          vacancy_id: vacancyId ?? null,
          title: vacancyId ? null : f.title,
          company: vacancyId ? "" : f.company,
          url: vacancyId ? "" : f.url,
          source: vacancyId ? "" : f.source,
          status: f.status,
          note: f.note,
          next_action: f.next_action,
          remind_at: f.remind_at || null,
          applied_at: f.applied_at || null,
          cover_letter_id: coverLetterId ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("Отклик добавлен в трекер");
      qc.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vacancyId ? "Добавить в трекер" : "Новый отклик"}
      description={vacancyId ? defaults?.title : "Для вакансии, найденной вне Jobly"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!vacancyId && !f.title.trim()}>
            Добавить
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        {!vacancyId && (
          <>
            <Field label="Должность">
              <Input value={f.title} onChange={set("title")} required maxLength={300} autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Компания">
                <Input value={f.company} onChange={set("company")} />
              </Field>
              <Field label="Где нашли">
                <Input value={f.source} onChange={set("source")} placeholder="hh.ru, Telegram…" />
              </Field>
            </div>
            <Field label="Ссылка">
              <Input type="url" value={f.url} onChange={set("url")} placeholder="https://" />
            </Field>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Статус">
            <Select value={f.status} onChange={set("status")}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Дата отклика" hint={f.status === "sent" ? "по умолчанию сегодня" : undefined}>
            <Input type="date" value={f.applied_at} onChange={set("applied_at")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Следующий шаг">
            <Input value={f.next_action} onChange={set("next_action")} placeholder="Написать рекрутеру" />
          </Field>
          <Field label="Напомнить">
            <Input type="date" value={f.remind_at} onChange={set("remind_at")} />
          </Field>
        </div>
        <Field label="Заметка">
          <Textarea value={f.note} onChange={set("note")} rows={3} />
        </Field>
        {coverLetterId && <p className="text-xs text-slate-500">К отклику будет привязано сгенерированное письмо #{coverLetterId}.</p>}
      </form>
    </Modal>
  );
}
