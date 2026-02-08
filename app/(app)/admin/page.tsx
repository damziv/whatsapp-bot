'use client';

export const dynamic = 'force-dynamic';

export default function AdminHome() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Admin</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Manage photographers and albums.
        </p>
      </div>
    </div>
  );
}
