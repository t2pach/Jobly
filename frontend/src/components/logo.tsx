import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-sm text-white shadow-md shadow-brand-500/30">
        J
      </span>
      <span className="text-lg">Jobly</span>
    </Link>
  );
}
