import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commissioner Tools · JHULads",
};

export default function CommissionerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
