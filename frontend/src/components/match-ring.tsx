import { cn } from "@/lib/cn";
import { scoreTone } from "@/lib/format";

export function MatchRing({ score, size = 56, stroke = 5, label = true }: { score: number | null; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={score === null ? "Нет оценки" : `Совпадение ${score}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - ((score ?? 0) / 100) * c}
          className={cn(tone.ring, "transition-[stroke-dashoffset] duration-700")}
        />
      </svg>
      {label && (
        <span className={cn("absolute inset-0 flex items-center justify-center font-bold", tone.text)} style={{ fontSize: size * 0.27 }}>
          {score ?? "—"}
          {score !== null && <span style={{ fontSize: size * 0.16 }}>%</span>}
        </span>
      )}
    </div>
  );
}
