import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}

/** Narrow a JSON body field to a non-empty string, or null if it isn't one. */
export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
