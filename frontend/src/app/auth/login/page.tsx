"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Activity,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Aponta para a API de forma dinâmica ou cai no fallback da porta 3001
      const baseURL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await fetch(`${baseURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        // 1. Salva no Cookie (ESSENCIAL para o Middleware do Next.js liberar as páginas)
        document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

        // 2. Salva no localStorage (para o api.ts injetar no header HTTP de cada requisição)
        localStorage.setItem("@ClinicOS:token", data.access_token);

        toast.success("Autenticação realizada com sucesso.");

        // Redireciona o usuário direto para o sistema
        window.location.href = "/";
      } else {
        toast.error(data.message || "Credenciais inválidas. Tente novamente.");
      }
    } catch (error) {
      toast.error(
        "Servidor indisponível no momento. Tente novamente mais tarde.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full bg-white font-sans selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* LADO ESQUERDO: Branding & Visual */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex xl:w-[55%]">
        {/* Efeitos de Luz de Fundo Premium */}
        <div className="absolute -left-[20%] -top-[10%] h-[70vh] w-[70vw] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[50vh] w-[50vw] rounded-full bg-emerald-900/20 blur-[100px]" />

        {/* Grid Sutil de Fundo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <Activity className="h-6 w-6 text-zinc-950" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Health<span className="text-emerald-500">System</span>
          </span>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl xl:text-6xl">
            A evolução da sua{" "}
            <span className="text-emerald-400">clínica estética</span> começa
            aqui.
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400">
            Gestão inteligente, prontuários avançados e controle financeiro
            absoluto em uma única plataforma projetada para o alto padrão.
          </p>

          <div className="mt-12 flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center"
                >
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Sparkles
                    key={i}
                    className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-zinc-300">
                Mais de 500 clínicas ativas
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-zinc-500">
          <ShieldCheck className="h-5 w-5 text-emerald-500/70" />
          Ambiente seguro e criptografado de ponta a ponta.
        </div>
      </div>

      {/* LADO DIREITO: Formulário de Login Limpo e Funcional */}
      <div className="relative z-10 flex w-full flex-col justify-center bg-white px-6 lg:w-1/2 xl:w-[45%] h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-sm sm:max-w-md my-auto py-12">
          {/* Logo visível apenas no mobile */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              Health<span className="text-emerald-600">System</span>
            </span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
              Acesse sua conta
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Insira seu e-mail e senha para gerenciar sua clínica.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[13px] font-bold uppercase tracking-wider text-zinc-600">
                Endereço de E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@suaclinica.com"
                className="h-14 w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 text-base text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold uppercase tracking-wider text-zinc-600">
                  Senha de Acesso
                </label>
                <a
                  href="#"
                  className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-14 w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 pl-4 pr-12 text-base text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-base font-bold text-white transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-zinc-900 overflow-hidden shadow-lg shadow-zinc-900/10 hover:shadow-emerald-600/25"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? "Validando credenciais..." : "Entrar no Sistema"}
                {!isLoading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </span>
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-zinc-500">
            Ainda não possui uma conta?{" "}
            <a
              href="#"
              className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Fale com um consultor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
