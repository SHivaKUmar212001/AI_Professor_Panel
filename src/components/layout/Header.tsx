"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useDiscussionStore } from "@/stores/discussion-store";

export default function Header() {
  const status = useDiscussionStore((s) => s.status);
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="panel-surface futuristic-outline mx-auto flex max-w-7xl items-center justify-between rounded-[24px] px-4 py-3 sm:px-5">
        <Link href="/" className="group flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-sm font-bold text-cyan-100 shadow-[0_0_24px_rgba(22,213,255,0.18)]">
            CC
          </div>
          <div className="min-w-0">
            <span className="block truncate text-lg font-semibold tracking-tight text-white group-hover:text-cyan-200">
              Cortex Council
            </span>
            <p className="mt-0.5 hud-label">Synthetic Faculty Console</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {(user || status !== "idle") && (
            <Link
              href="/arena"
              className={`rounded-full border px-3 py-2 text-sm ${
                pathname === "/arena"
                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              Council
            </Link>
          )}

          {authStatus === "loading" ? (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/40">
              Loading
            </div>
          ) : user ? (
            <>
              <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                  {(user.name ?? user.username).slice(0, 1).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-white/85">{user.name ?? user.username}</p>
                  <p className="text-xs text-white/45">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-cyan-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:border-white/20 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-50 shadow-[0_0_28px_rgba(22,213,255,0.14)] hover:bg-cyan-400/15"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
