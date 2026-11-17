"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Download, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardHeader, Field, Input, Modal, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { me, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const exportData = useMutation({
    mutationFn: () => api<unknown>("/me/export"),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `jobly-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Файл с данными скачан");
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => api("/me", { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Аккаунт и все данные удалены");
      logout();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Настройки" description="Аккаунт и ваши данные." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Аккаунт" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{me?.email}</p>
              <p className="mt-1 text-xs text-slate-400">Роль: {me?.is_admin ? "администратор" : "соискатель"}</p>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" /> Выйти
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Экспорт данных" description="Профиль, отклики, избранное, письма и цели в одном JSON-файле." />
          <div className="p-6">
            <Button variant="outline" onClick={() => exportData.mutate()} loading={exportData.isPending}>
              <Download className="size-4" /> Скачать мои данные
            </Button>
          </div>
        </Card>

        <Card className="border-rose-200">
          <CardHeader title={<span className="text-rose-700">Удаление аккаунта</span>} description="Аккаунт и все связанные данные будут удалены без возможности восстановления." />
          <div className="p-6">
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" /> Удалить аккаунт
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Удалить аккаунт навсегда?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" disabled={typed !== me?.email} loading={del.isPending} onClick={() => del.mutate()}>
              Удалить
            </Button>
          </>
        }
      >
        <div className="flex gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="size-5 shrink-0" />
          Будут удалены профиль, отклики, письма, избранное и цели. Рекомендуем сначала скачать данные.
        </div>
        <Field label={`Введите ${me?.email} для подтверждения`} className="mt-4">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
      </Modal>
    </div>
  );
}
