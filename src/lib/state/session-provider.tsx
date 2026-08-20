"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Who's signed in, from the server's httpOnly session cookie. The app shell
// gates on this: everything below it can assume a real member, which is what
// lets useBetting/pages drop the old DEMO_CURRENT_USER_ID constant.

export type Session = {
  leagueId: string;
  memberId: string;
  isCommissioner: boolean;
};

export type MemberClaim = {
  memberId: string;
  displayName: string;
  claimed: boolean;
};

type SessionState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "signed-out"; members: MemberClaim[] }
  | { status: "signed-in"; session: Session; members: MemberClaim[] };

type SessionContextValue = {
  session: Session;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const load = useCallback(() => {
    fetch("/api/auth/session")
      .then(async (res) => {
        const data = (await res.json()) as {
          session: Session | null;
          members: MemberClaim[];
          error?: string;
        };
        if (!res.ok) {
          setState({ status: "error", error: data.error ?? "Couldn't load the sign-in state." });
          return;
        }
        setState(
          data.session
            ? { status: "signed-in", session: data.session, members: data.members }
            : { status: "signed-out", members: data.members }
        );
      })
      .catch((err: unknown) => {
        setState({ status: "error", error: String(err) });
      });
  }, []);

  useEffect(load, [load]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    load();
  }, [load]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-destructive">
        {state.error}
      </div>
    );
  }

  if (state.status === "signed-out") {
    return <SignInScreen members={state.members} onSignedIn={load} />;
  }

  return (
    <SessionContext.Provider value={{ session: state.session, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

function SignInScreen({
  members,
  onSignedIn,
}: {
  members: MemberClaim[];
  onSignedIn: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = members.find((m) => m.memberId === memberId);
  // An unclaimed member is claiming their spot (and choosing a PIN); a
  // claimed one is signing back in.
  const isClaiming = selected ? !selected.claimed : false;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!memberId || !pin || submitting) return;
    setSubmitting(true);
    setError(null);
    const { ok, data } = await postJson(
      isClaiming ? "/api/auth/claim" : "/api/auth/login",
      { memberId, pin }
    );
    setSubmitting(false);
    if (ok) {
      onSignedIn();
    } else {
      setError(typeof data.error === "string" ? data.error : "Sign-in failed.");
      setPin("");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border p-6"
      >
        <div className="space-y-1 text-center">
          <p className="text-2xl">🏈</p>
          <h1 className="text-lg font-semibold">Who are you?</h1>
          <p className="text-sm text-muted-foreground">
            Pick your team and {isClaiming ? "choose a PIN" : "enter your PIN"}.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="member" className="text-sm font-medium">
            Member
          </label>
          <select
            id="member"
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setPin("");
              setError(null);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select your name…</option>
            {members.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.displayName}
                {member.claimed ? "" : " (unclaimed)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pin" className="text-sm font-medium">
            {isClaiming ? "Choose a PIN (4–12 digits)" : "PIN"}
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete={isClaiming ? "new-password" : "current-password"}
            value={pin}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || /^\d+$/.test(raw)) setPin(raw);
            }}
            disabled={!memberId}
            className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm tabular-nums disabled:opacity-50"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={!memberId || pin.length < 4 || submitting}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Signing in…" : isClaiming ? "Claim my team" : "Sign in"}
        </button>

        <p className="text-center text-[11px] text-muted-foreground">
          Forgot your PIN? Ask the commissioner to reset it.
        </p>
      </form>
    </div>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a signed-in SessionProvider");
  }
  return ctx;
}

/** The signed-in member's id — replaces the old DEMO_CURRENT_USER_ID constant. */
export function useCurrentMemberId(): string {
  return useSession().session.memberId;
}
