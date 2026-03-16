"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

type AuthMode = "login" | "register";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            username,
            password,
          }),
        });

        const registerPayload = (await registerResponse.json()) as {
          error?: string;
        };

        if (!registerResponse.ok) {
          setError(registerPayload.error ?? "Unable to create account.");
          setLoading(false);
          return;
        }
      }

      const loginResult = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        setError("Username or password is incorrect.");
        setLoading(false);
        return;
      }

      router.push("/arena");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="panel-surface futuristic-outline rounded-[30px] p-6 sm:p-8"
      >
        <p className="hud-label">Identity protocol</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          {isRegister ? "Create your operator account" : "Reconnect to your deck"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
          {isRegister
            ? "Create a persistent identity so multiple users can access the platform with their own protected discussion sessions."
            : "Sign back into your account to launch a new professor panel or continue a live deliberation session."}
        </p>

        <div className="mt-8 space-y-3">
          {[
            "Persistent user identities stored locally in the app database.",
            "Protected discussion streams bound to the signed-in account.",
            "Student-friendly or academic tone control before every discussion.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-white/58"
            >
              {item}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
        className="panel-surface futuristic-outline rounded-[30px] p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="hud-label">{isRegister ? "New access" : "Secure sign in"}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {isRegister ? "Provision credentials" : "Authenticate session"}
            </h2>
          </div>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
            {isRegister ? "Create account" : "Login"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isRegister && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/55">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Optional display name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:border-cyan-300/30 focus:outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm text-white/55">Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_handle"
              autoComplete="username"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:border-cyan-300/30 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/55">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:border-cyan-300/30 focus:outline-none"
            />
          </label>

          {isRegister && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/55">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:border-cyan-300/30 focus:outline-none"
              />
            </label>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-4 py-3.5 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.14)] hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-white/45">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-cyan-100 hover:text-cyan-50"
          >
            {isRegister ? "Sign in here" : "Create one here"}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
