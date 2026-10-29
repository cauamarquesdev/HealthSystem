import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/src/components/ui/sonner";
import AuthGuard from "../components/AuthGuard";
import PageTransition from "../components/PageTransition";

export const metadata: Metadata = {
  title: "HealthSystem | Gestão Premium",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased m-0 p-0 w-full h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
        <AuthGuard>
          <PageTransition>{children}</PageTransition>
        </AuthGuard>

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
