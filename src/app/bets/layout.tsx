import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Bets · JHULads",
};

export default function BetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
