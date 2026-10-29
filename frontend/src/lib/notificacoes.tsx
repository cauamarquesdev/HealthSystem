"use client";

/**
 * NOTIFICAÇÕES — peça compartilhada por TODAS as páginas.
 *
 * Contém: NotificacoesProvider (consulta o backend a cada poucos segundos), toasts em qualquer página,
 * som, notificação do navegador, contador no título da aba e o <NotificationBell /> para a topbar.
 *
 * Uso:
 *   1) Salve em  src/lib/notificacoes.tsx  (ou onde preferir).
 *   2) No layout que envolve as páginas logadas:
 *        <NotificacoesProvider>{children}</NotificacoesProvider>
 *   3) Na topbar de cada página, troque o botão do sino por:  <NotificationBell />
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Info,
  Landmark,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGINA_NOTIFICACOES = "/notificacoes";
const POLL_VISIVEL_MS = 10_000;
const POLL_OCULTA_MS = 30_000;


function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("@ClinicOS:token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken") ??
    document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("token="))
      ?.split("=")
      .slice(1)
      .join("=") ??
    null
  );
}


export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const url = `${API_URL.replace(/\/+$/, "")}/api${path.startsWith("/") ? path : `/${path}`}`;

const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ═══════════════════════════════════════════════════════════════
   TIPOS E METADADOS (compartilhados com a página)
   ═══════════════════════════════════════════════════════════════ */

export type NotifTipo = "AGENDA" | "CLINICA" | "ESTOQUE" | "FINANCEIRO" | "CRM" | "SISTEMA";
export type NotifPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "CRITICA";

export type Notificacao = {
  id: string;
  tipo: NotifTipo;
  prioridade: NotifPrioridade;
  titulo: string;
  mensagem?: string | null;
  href?: string | null;
  lidaEm?: string | null;
  createdAt: string;
};

export const TIPO_META: Record<NotifTipo, { label: string; icon: LucideIcon; tile: string }> = {
  AGENDA: { label: "Agenda", icon: CalendarDays, tile: "bg-blue-50 text-blue-600" },
  CLINICA: { label: "Clínica", icon: ClipboardList, tile: "bg-violet-50 text-violet-600" },
  ESTOQUE: { label: "Estoque e recursos", icon: Boxes, tile: "bg-amber-50 text-amber-600" },
  FINANCEIRO: { label: "Financeiro", icon: Landmark, tile: "bg-emerald-50 text-emerald-600" },
  CRM: { label: "CRM", icon: Users, tile: "bg-sky-50 text-sky-600" },
  SISTEMA: { label: "Sistema", icon: Info, tile: "bg-slate-100 text-slate-600" },
};

export const PRIORIDADE_META: Record<NotifPrioridade, { label: string; cls: string }> = {
  BAIXA: { label: "Baixa", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  NORMAL: { label: "Normal", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ALTA: { label: "Alta", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CRITICA: { label: "Crítica", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function tempoRelativo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const seg = Math.round((Date.now() - +d) / 1000);
  if (seg < 45) return "agora";
  if (seg < 3600) return `há ${Math.max(1, Math.round(seg / 60))} min`;
  if (seg < 86400) return `há ${Math.round(seg / 3600)} h`;
  const hoje = new Date();
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === ontem.getTime()) return `ontem, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`;
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXTO
   ═══════════════════════════════════════════════════════════════ */

type Config = { som: boolean; desktop: boolean };
type Permissao = NotificationPermission | "unsupported";

type Ctx = {
  /** false quando o Provider não foi montado no layout. */
  ativo: boolean;
  naoLidas: number;
  /** Aumenta a cada notificação nova ou ação; páginas usam para recarregar listas. */
  version: number;
  refresh: () => Promise<void>;
  config: Config;
  setConfig: (patch: Partial<Config>) => void;
  permissao: Permissao;
  pedirPermissao: () => Promise<Permissao>;
};

const noop = async () => {};
const CtxPadrao: Ctx = {
  ativo: false,
  naoLidas: 0,
  version: 0,
  refresh: noop,
  config: { som: true, desktop: false },
  setConfig: () => {},
  permissao: "unsupported",
  pedirPermissao: async () => "unsupported",
};

const NotifCtx = createContext<Ctx>(CtxPadrao);
export const useNotificacoes = () => useContext(NotifCtx);

type PollResp = { agora: string; naoLidas: number; novas: Notificacao[] };

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const ini = t + i * 0.14;
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ini);
      g.gain.exponentialRampToValueAtTime(0.18, ini + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ini);
      o.stop(ini + 0.2);
    });
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* o navegador pode bloquear áudio antes da primeira interação */
  }
}

const CONFIG_KEY = "notif:config";

export function NotificacoesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [naoLidas, setNaoLidas] = useState(0);
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState<Notificacao[]>([]);
  const [config, setConfigState] = useState<Config>({ som: true, desktop: false });
  const [permissao, setPermissao] = useState<Permissao>("unsupported");

  const since = useRef<string | null>(null);
  const vistos = useRef<Set<string>>(new Set());
  const configRef = useRef(config);
  const pausado = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const falhas = useRef(0);

  configRef.current = config;

  /* Preferências deste dispositivo */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) setConfigState({ som: true, desktop: false, ...JSON.parse(raw) });
    } catch {}
    setPermissao("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const setConfig = useCallback((patch: Partial<Config>) => {
    setConfigState((c) => {
      const novo = { ...c, ...patch };
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }, []);

  const pedirPermissao = useCallback(async (): Promise<Permissao> => {
    if (!("Notification" in window)) return "unsupported";
    const p = await Notification.requestPermission();
    setPermissao(p);
    return p;
  }, []);

  const dispensar = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const anunciar = useCallback(
    (novas: Notificacao[]) => {
      const c = configRef.current;
      // mais antigas primeiro, para a pilha ficar na ordem certa
      [...novas].reverse().forEach((n) => {
        setToasts((t) => [n, ...t.filter((x) => x.id !== n.id)].slice(0, 3));
        const duracao = n.prioridade === "ALTA" || n.prioridade === "CRITICA" ? 10_000 : 6_000;
        setTimeout(() => dispensar(n.id), duracao);

        if (c.desktop && document.hidden && "Notification" in window && Notification.permission === "granted") {
          const nt = new Notification(n.titulo, { body: n.mensagem ?? undefined, tag: n.id });
          nt.onclick = () => {
            window.focus();
            if (n.href) router.push(n.href);
            nt.close();
          };
        }
      });
      if (c.som) beep();
    },
    [dispensar, router],
  );

  const poll = useCallback(async () => {
    const q = since.current ? `?since=${encodeURIComponent(since.current)}` : "";
    const r = await api<PollResp>(`/notificacoes/poll${q}`);
    since.current = r.agora;
    setNaoLidas(r.naoLidas);

    const inedit = r.novas.filter((n) => !vistos.current.has(n.id));
    inedit.forEach((n) => vistos.current.add(n.id));
    if (vistos.current.size > 500) vistos.current = new Set([...vistos.current].slice(-200));

    if (inedit.length) {
      setVersion((v) => v + 1);
      anunciar(inedit);
    }
  }, [anunciar]);

  /* Laço de consulta: 10s com a aba visível, 30s oculta; recua quando há falhas */
  const iniciar = useRef<() => void>(() => {});
  useEffect(() => {
    let parar = false;

    const tick = async () => {
      if (parar) return;
      pausado.current = false;
      try {
        await poll();
        falhas.current = 0;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          pausado.current = true; // sem sessão: espera navegação/foco para tentar de novo
          return;
        }
        falhas.current += 1;
      }
      if (parar) return;
      const base = document.hidden ? POLL_OCULTA_MS : POLL_VISIVEL_MS;
      timer.current = setTimeout(tick, Math.min(base * 2 ** falhas.current, 120_000));
    };

    iniciar.current = () => {
      if (timer.current) clearTimeout(timer.current);
      void tick();
    };
    iniciar.current();

    const retomar = () => {
      if (!document.hidden || pausado.current) iniciar.current();
    };
    document.addEventListener("visibilitychange", retomar);
    window.addEventListener("focus", retomar);
    window.addEventListener("online", retomar);
    return () => {
      parar = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", retomar);
      window.removeEventListener("focus", retomar);
      window.removeEventListener("online", retomar);
    };
  }, [poll]);

  /* Se estava sem sessão (ex.: tela de login), tenta de novo ao navegar */
  useEffect(() => {
    if (pausado.current) iniciar.current();
  }, [pathname]);

  /* Contador no título da aba do navegador */
  useEffect(() => {
    const limpo = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = naoLidas > 0 ? `(${naoLidas > 99 ? "99+" : naoLidas}) ${limpo}` : limpo;
  }, [naoLidas, pathname]);

  const refresh = useCallback(async () => {
    try {
      const r = await api<PollResp>("/notificacoes/poll");
      setNaoLidas(r.naoLidas);
    } catch {}
    setVersion((v) => v + 1);
  }, []);

  const valor = useMemo<Ctx>(
    () => ({ ativo: true, naoLidas, version, refresh, config, setConfig, permissao, pedirPermissao }),
    [naoLidas, version, refresh, config, setConfig, permissao, pedirPermissao],
  );

  const abrirToast = async (n: Notificacao) => {
    dispensar(n.id);
    try {
      await api(`/notificacoes/${n.id}/lida`, { method: "PATCH", body: JSON.stringify({ lida: true }) });
      void refresh();
    } catch {}
    if (n.href) router.push(n.href);
  };

  return (
    <NotifCtx.Provider value={valor}>
      {children}

      {/* Toasts: aparecem em qualquer página */}
      <div className="pointer-events-none fixed right-4 top-[74px] z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite" role="status">
        {toasts.map((n) => {
          const meta = TIPO_META[n.tipo];
          const Icon = meta.icon;
          const forte = n.prioridade === "ALTA" || n.prioridade === "CRITICA";
          return (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.15)] ${forte ? "border-amber-300" : "border-slate-200"}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.tile}`}>
                {forte ? <AlertTriangle size={17} /> : <Icon size={17} />}
              </span>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => void abrirToast(n)}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{meta.label}</p>
                <p className="text-sm font-bold leading-snug text-slate-900">{n.titulo}</p>
                {n.mensagem && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.mensagem}</p>}
              </button>
              <button
                type="button"
                aria-label="Dispensar notificação"
                onClick={() => dispensar(n.id)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </NotifCtx.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SINO DA TOPBAR
   ═══════════════════════════════════════════════════════════════ */

export function NotificationBell() {
  const { naoLidas, version, refresh } = useNotificacoes();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(false);
    try {
      const r = await api<{ data: Notificacao[] }>("/notificacoes?limit=8");
      setItens(r.data ?? []);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void carregar();
  }, [open, version, carregar]);

  useEffect(() => {
    if (!open) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const abrir = async (n: Notificacao) => {
    setOpen(false);
    if (!n.lidaEm) {
      try {
        await api(`/notificacoes/${n.id}/lida`, { method: "PATCH", body: JSON.stringify({ lida: true }) });
        void refresh();
      } catch {}
    }
    if (n.href) router.push(n.href);
  };

  const marcarTodas = async () => {
    try {
      await api("/notificacoes/marcar-todas-lidas", { method: "POST" });
      await refresh();
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações"}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <Bell size={17} />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-[380px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-extrabold text-slate-900">
              Notificações {naoLidas > 0 && <span className="ml-1 text-xs font-semibold text-rose-600">{naoLidas} nova(s)</span>}
            </p>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={naoLidas === 0}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            >
              <CheckCheck size={13} /> Marcar todas como lidas
            </button>
          </div>

          <ul className="max-h-[380px] overflow-y-auto">
            {loading && itens.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">Carregando…</li>}
            {erro && <li className="px-4 py-6 text-center text-xs text-rose-600">Não foi possível carregar as notificações.</li>}
            {!loading && !erro && itens.length === 0 && (
              <li className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-500">Você está em dia. Nenhuma notificação.</p>
              </li>
            )}
            {itens.map((n) => {
              const meta = TIPO_META[n.tipo];
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void abrir(n)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 ${n.lidaEm ? "" : "bg-blue-50/40"}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${meta.tile}`}><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] leading-snug text-slate-900 ${n.lidaEm ? "font-semibold" : "font-extrabold"}`}>{n.titulo}</span>
                      {n.mensagem && <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">{n.mensagem}</span>}
                      <span className="mt-1 block text-[11px] text-slate-400">{tempoRelativo(n.createdAt)}</span>
                    </span>
                    {!n.lidaEm && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Não lida" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <Link
            href={PAGINA_NOTIFICACOES}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-center text-xs font-bold text-blue-600 hover:bg-slate-50"
          >
            Ver todas na Central de Notificações
          </Link>
        </div>
      )}
    </div>
  );
}