"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  Camera,
  Eye,
  EyeOff,
  FileSignature,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ESTILOS DE ANIMAÇÃO (respeitam "reduzir movimento" do sistema)
   ═══════════════════════════════════════════════════════════════ */

const ESTILOS = `
@keyframes hs-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes hs-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes hs-glow { 0%, 100% { opacity: .55; } 50% { opacity: .9; } }
.hs-up { animation: hs-up .75s cubic-bezier(.2,.7,.2,1) both; }
.hs-d1 { animation-delay: .06s; } .hs-d2 { animation-delay: .16s; } .hs-d3 { animation-delay: .26s; }
.hs-d4 { animation-delay: .36s; } .hs-d5 { animation-delay: .46s; }
.hs-float { animation: hs-float 7s ease-in-out infinite; }
.hs-float-2 { animation-duration: 9s; animation-delay: -3s; }
.hs-float-3 { animation-duration: 8s; animation-delay: -5.5s; }
.hs-glow { animation: hs-glow 8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hs-up, .hs-float, .hs-glow { animation: none !important; }
}
`;

/* ═══════════════════════════════════════════════════════════════
   PEÇAS VISUAIS
   ═══════════════════════════════════════════════════════════════ */

function Marca({ escuro = false }: { escuro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_24px_-6px_rgba(37,99,235,0.7)] ring-1 ring-white/20">
        <Activity className="h-6 w-6 text-white" strokeWidth={2.4} />
      </span>
      <span className="leading-tight">
        <span className={`block text-[22px] font-extrabold tracking-tight ${escuro ? "text-white" : "text-slate-900"}`}>HealthSystem</span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.22em] ${escuro ? "text-blue-300/80" : "text-slate-400"}`}>Clinical Suite</span>
      </span>
    </div>
  );
}

function Recurso({ icone, titulo, texto }: { icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-blue-300">{icone}</span>
      <span>
        <span className="block text-[15px] font-semibold text-white">{titulo}</span>
        <span className="block text-sm leading-relaxed text-slate-400">{texto}</span>
      </span>
    </li>
  );
}

const vidro =
  "rounded-2xl border border-white/10 bg-white/[0.07] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl";

/** Composição decorativa que mostra o produto. Dados fictícios, só ilustração. */
function PreviaDoProduto() {
  return (
    <div className="relative mx-auto h-[370px] w-full max-w-[500px]" aria-hidden>
      {/* Faturamento */}
      <div className="absolute left-0 top-0 w-[64%]">
        <div className={`hs-float ${vidro} p-4`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Faturamento hoje</p>
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <TrendingUp className="h-3 w-3" /> +14,2%
            </span>
          </div>
          <p className="mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-white">R$ 14.800</p>
          <svg viewBox="0 0 220 56" className="mt-3 h-14 w-full" fill="none">
            <defs>
              <linearGradient id="hs-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#60a5fa" stopOpacity="0.45" />
                <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 46 C 22 44, 34 30, 58 32 S 100 50, 126 28 S 178 6, 220 12 L220 56 L0 56 Z" fill="url(#hs-area)" />
            <path d="M0 46 C 22 44, 34 30, 58 32 S 100 50, 126 28 S 178 6, 220 12" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="126" cy="28" r="3.6" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Agenda */}
      <div className="absolute right-0 top-[24%] w-[58%]">
        <div className={`hs-float hs-float-2 ${vidro} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Agenda de hoje</p>
          <ul className="mt-2.5 space-y-2.5">
            {[
              { h: "09:00", n: "Sofia · Harmonização", c: "bg-emerald-400" },
              { h: "10:30", n: "Renata · Toxina botulínica", c: "bg-blue-400" },
              { h: "14:00", n: "Marina · Limpeza de pele", c: "bg-amber-400" },
            ].map((a) => (
              <li key={a.h} className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.c}`} />
                <span className="w-9 shrink-0 text-[11px] font-bold tabular-nums text-slate-300">{a.h}</span>
                <span className="truncate text-[12px] font-medium text-white/90">{a.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Evolução do paciente */}
      <div className="absolute bottom-0 left-[5%] w-[62%]">
        <div className={`hs-float hs-float-3 ${vidro} p-4`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Evolução · D+2</p>
            <span className="rounded-full bg-blue-400/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">Em acompanhamento</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-white">Pico de edema</p>
          <div className="mt-3 flex items-center gap-1.5">
            {["D+0", "D+2", "D+5", "D+15"].map((m, i) => (
              <div key={m} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= 1 ? "bg-gradient-to-r from-blue-400 to-emerald-300" : "bg-white/15"}`} />
                <p className={`mt-1 text-[10px] font-semibold ${i <= 1 ? "text-slate-200" : "text-slate-500"}`}>{m}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA
   ═══════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsLock, setCapsLock] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Aponta para a API de forma dinâmica ou cai no fallback da porta 3001
      const baseURL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.access_token) {
        // 1. Salva no Cookie (ESSENCIAL para o Middleware do Next.js liberar as páginas)
        const seguro = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax${seguro}`;

        // 2. Salva no localStorage (para o api.ts injetar no header HTTP de cada requisição)
        localStorage.setItem("@ClinicOS:token", data.access_token);

        toast.success("Autenticação realizada com sucesso.");

        // Redireciona o usuário direto para o sistema
        window.location.href = "/";
      } else {
        const mensagem = data.message
          ? Array.isArray(data.message)
            ? data.message.join(", ")
            : String(data.message)
          : "Credenciais inválidas. Tente novamente.";
        setError(mensagem);
        toast.error(mensagem);
      }
    } catch (error) {
      const mensagem =
        "Servidor indisponível no momento. Tente novamente mais tarde.";
      setError(mensagem);
      toast.error(mensagem);
    } finally {
      setIsLoading(false);
    }
  };

  const campo =
    "peer h-12 w-full rounded-xl border bg-white pl-11 text-base text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-white font-sans selection:bg-blue-600 selection:text-white">
      <style>{ESTILOS}</style>

      <div className="flex min-h-[100dvh] w-full flex-col lg:flex-row">
        {/* ═════════ LADO ESQUERDO — marca e produto (telas grandes) ═════════ */}
        <aside className="relative hidden overflow-hidden bg-[#060a14] lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 xl:w-[56%] xl:p-16">
          {/* luzes de fundo */}
          <div className="hs-glow pointer-events-none absolute -left-[18%] -top-[14%] h-[70vh] w-[70vh] rounded-full bg-blue-600/25 blur-[130px]" />
          <div className="hs-glow pointer-events-none absolute -bottom-[22%] -right-[12%] h-[60vh] w-[60vh] rounded-full bg-emerald-500/15 blur-[130px]" style={{ animationDelay: "-4s" }} />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_55%,transparent_100%)]" />

          <div className="hs-up relative z-10">
            <Marca escuro />
          </div>

          <div className="relative z-10">
            <h1 className="hs-up hs-d1 max-w-[560px] text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-white xl:text-[3.4rem]">
              A evolução da sua{" "}
              <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-emerald-300 bg-clip-text text-transparent">clínica estética</span>{" "}
              começa aqui.
            </h1>
            <p className="hs-up hs-d2 mt-5 max-w-[520px] text-[17px] leading-relaxed text-slate-400">
              Gestão inteligente, prontuários avançados e controle financeiro absoluto em uma única plataforma projetada para o alto padrão.
            </p>

            <div className="hs-up hs-d3 mt-10 hidden xl:block">
              <PreviaDoProduto />
            </div>

            <ul className="hs-up hs-d4 mt-10 max-w-[520px] space-y-5 xl:mt-8">
              <Recurso icone={<Camera className="h-[18px] w-[18px]" />} titulo="Prontuário e fotos clínicas" texto="Evolução do paciente, antes e depois e dossiê em um só lugar." />
              <Recurso icone={<CalendarCheck className="h-[18px] w-[18px]" />} titulo="Agenda, vendas e financeiro conectados" texto="Cada atendimento alimenta o caixa e os indicadores em tempo real." />
              <Recurso icone={<FileSignature className="h-[18px] w-[18px]" />} titulo="Termos com assinatura digital" texto="Consentimentos e LGPD com validade jurídica e trilha de auditoria." />
            </ul>
          </div>

          <div className="hs-up hs-d5 relative z-10 flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-400/80" />
              Ambiente seguro e criptografado de ponta a ponta.
            </span>
            <span className="hidden font-medium text-slate-500 2xl:block">Mais de 500 clínicas ativas</span>
          </div>
        </aside>

        {/* ═════════ LADO DIREITO — formulário ═════════ */}
        <main className="relative flex flex-1 flex-col bg-white">
          {/* faixa de marca no celular/tablet */}
          <header className="relative overflow-hidden bg-[#060a14] px-6 pb-14 pt-[max(1.5rem,env(safe-area-inset-top))] lg:hidden">
            <div className="hs-glow pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-blue-600/35 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-emerald-500/20 blur-[80px]" />
            <div className="relative mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
              <div className="hs-up">
                <Marca escuro />
              </div>
              <p className="hs-up hs-d1 max-w-sm text-sm leading-relaxed text-slate-400">
                Gestão, prontuários e financeiro da sua <span className="font-semibold text-sky-300">clínica estética</span> em um só lugar.
              </p>
            </div>
          </header>

          <div className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-9 sm:px-10 lg:mt-0 lg:rounded-none lg:px-14 lg:pb-12 lg:pt-12 xl:px-20">
            {/* brilho suave no canto (desktop) */}
            <div className="pointer-events-none absolute right-0 top-0 hidden h-72 w-72 rounded-full bg-blue-100/60 blur-[90px] lg:block" />

            <div className="relative mx-auto my-auto w-full max-w-[420px]">
              <div className="hs-up hs-d1 mb-8">
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                  <Lock className="h-3 w-3" /> Acesso restrito
                </p>
                <h2 className="text-[1.9rem] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">Acesse sua conta</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-500">Insira seu e-mail e senha para gerenciar sua clínica.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5" noValidate={false}>
                <div className="hs-up hs-d2 space-y-2">
                  <label htmlFor="login-email" className="block text-[12px] font-bold uppercase tracking-[0.1em] text-slate-600">
                    Endereço de e-mail
                  </label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition peer-focus:text-blue-600" />
                    <input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="nome@suaclinica.com"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-erro" : undefined}
                      disabled={isLoading}
                      className={`${campo} pr-4 ${error ? "border-rose-300" : "border-slate-200"}`}
                    />
                  </div>
                </div>

                <div className="hs-up hs-d3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="login-senha" className="block text-[12px] font-bold uppercase tracking-[0.1em] text-slate-600">
                      Senha de acesso
                    </label>
                    <a href="#" className="rounded text-[13px] font-semibold text-blue-600 transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition peer-focus:text-blue-600" />
                    <input
                      id="login-senha"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                      onKeyDown={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                      onBlur={() => setCapsLock(false)}
                      placeholder="••••••••••••"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-erro" : capsLock ? "login-caps" : undefined}
                      disabled={isLoading}
                      className={`${campo} pr-12 ${error ? "border-rose-300" : "border-slate-200"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {capsLock && (
                    <p id="login-caps" className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" /> Caps Lock está ativado
                    </p>
                  )}
                </div>

                {error && (
                  <div id="login-erro" role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="hs-up hs-d4 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-base font-bold text-white shadow-[0_10px_28px_-8px_rgba(37,99,235,0.65)] ring-1 ring-blue-600/30 transition hover:from-blue-500 hover:to-blue-700 hover:shadow-[0_14px_32px_-8px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:from-blue-500 disabled:hover:to-blue-600"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                    <span className="relative z-10 flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-[18px] w-[18px] animate-spin" /> Validando credenciais...
                        </>
                      ) : (
                        <>
                          Entrar no Sistema
                          <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>

              <div className="hs-up hs-d5 mt-9">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Conexão protegida</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <p className="mt-6 text-center text-sm text-slate-500">
                  Ainda não possui uma conta?{" "}
                  <a href="#" className="rounded font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    Fale com um consultor
                  </a>
                </p>
              </div>
            </div>

            <p className="relative mt-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} HealthSystem · Todos os direitos reservados</p>
          </div>
        </main>
      </div>
    </div>
  );
}