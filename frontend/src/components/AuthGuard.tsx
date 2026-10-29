
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setIsAuthorized(false);

    // A assinatura por link é pública e não precisa de login.
    if (pathname.startsWith("/assinar/")) {
      setIsAuthorized(true);
      return;
    }

    let token = localStorage.getItem("@ClinicOS:token");

    // Remove o token de teste antigo.
    if (token === "dev_token_temporario_12345") {
      localStorage.removeItem("@ClinicOS:token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      token = null;
    }

    const isAuthRoute = pathname.startsWith("/auth");

    if (!token && !isAuthRoute) {
      router.replace("/auth/login");
    } else if (token && isAuthRoute) {
      router.replace("/");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-lg shadow-emerald-500/20" />
      </div>
    );
  }

  return <>{children}</>;
}
