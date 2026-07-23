import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matchups · JHULads",
};

export default function MatchupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
