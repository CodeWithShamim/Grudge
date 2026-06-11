import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      {/* the torn ticket */}
      <div className="grain relative max-w-sm rotate-[-3deg] rounded-card bg-paper p-6 text-ink shadow-e3">
        <p className="display-statement text-display-md">404</p>
        <div className="perforation my-3 h-3 w-full" aria-hidden />
        <p className="font-mono text-xs uppercase tracking-widest">void ticket</p>
      </div>
      <p className="text-mut">This grudge doesn&apos;t exist. Yet.</p>
      <Link
        href="/create"
        className="rounded-control bg-gold px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink"
      >
        Start it yourself
      </Link>
    </div>
  );
}
