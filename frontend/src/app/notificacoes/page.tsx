
"use client";

/**
 * CENTRAL DE NOTIFICAÇÕES — página única (Next.js App Router + Tailwind + lucide-react).
 * Depende do arquivo compartilhado notificacoes.tsx (provider + sino) e do módulo NestJS /notificacoes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "../../components/AppShell"; // Ajuste o caminho conforme necessário
import {
  api,
  PRIORIDADE_META,
  TIPO_META,
  tempoRelativo,
  useNotificacoes,
} from "../../lib/notificacoes";
import type { NotifPrioridade, NotifTipo, Notificacao } from "../../lib/notificacoes";

/* ═══════════════════════════════════════════════════════════════
   TIPOS E UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

type Resumo = {
  total: number;
  naoLidas: number;
  hoje: number;
  altas: number;
  porTipo: Record<NotifTipo, { total: number; naoLidas: number }>;
};

type Preferencia = { tipo: NotifTipo; ativo: boolean };

const TIPOS = Object.keys(TIPO_META) as NotifTipo[];

function grupoDoDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dia(hoje) - dia(d)) / 86400000);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff <= 7) return "Esta semana";
  return "Anteriores";
}

const GRUPOS_ORDEM = ["Hoje", "Ontem", "Esta semana", "Anteriores"];

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ═══════════════════════════════════════════════════════════════
   UI BASE
   ═══════════════════════════════════════════════════════════════ */

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500";

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${danger ? "hover:text-rose-600" : "hover:text-blue-600"}`}
    >
      {children}
    </button>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`${card} flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
           {children}
        </div>
      </div>
    </div>
  );
}

type ToastMsg = { id: number; text: string; tone: "ok" | "err" };

function Toasts({ list }: { list: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${t.tone === "ok" ? "bg-slate-900" : "bg-rose-600"}`}>
          {t.tone === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3.5 py-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <p className="text-[13px] sm:text-sm font-semibold text-slate-800 leading-tight">{label}</p>
        {hint && <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500 leading-tight">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREFERÊNCIAS
   ═══════════════════════════════════════════════════════════════ */

function PreferenciasModal({ onClose, toast, onSincronizado }: { onClose: () => void; toast: (t: string, tone?: "ok" | "err") => void; onSincronizado: () => void }) {
  const { config, setConfig, permissao, pedirPermissao, ativo, refresh } = useNotificacoes();
  const [prefs, setPrefs] = useState<Preferencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState<"teste" | "sync" | null>(null);

  useEffect(() => {
    api<Preferencia[]>("/notificacoes/preferencias")
      .then(setPrefs)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Falha ao carregar preferências"));
  }, []);

  const alternar = async (tipo: NotifTipo, valor: boolean) => {
    setPrefs((p) => p?.map((x) => (x.tipo === tipo ? { ...x, ativo: valor } : x)) ?? p);
    try {
      await api("/notificacoes/preferencias", { method: "PUT", body: JSON.stringify({ tipo, ativo: valor }) });
    } catch (e) {
      setPrefs((p) => p?.map((x) => (x.tipo === tipo ? { ...x, ativo: !valor } : x)) ?? p);
      toast(e instanceof Error ? e.message : "Não foi possível salvar", "err");
    }
  };

  const desktop = async (v: boolean) => {
    if (!v) return setConfig({ desktop: false });
    const p = permissao === "granted" ? "granted" : await pedirPermissao();
    if (p === "granted") setConfig({ desktop: true });
    else toast("O navegador bloqueou as notificações. Libere nas configurações do site.", "err");
  };

  const rodar = async (qual: "teste" | "sync") => {
    setBusy(qual);
    try {
      if (qual === "teste") {
        await api("/notificacoes/teste", { method: "POST" });
        toast("Teste enviado. Ele deve aparecer em instantes.");
      } else {
        const r = await api<{ geradas: number }>("/notificacoes/sincronizar", { method: "POST" });
        toast(r.geradas ? `${r.geradas} novo(s) alerta(s) gerado(s)` : "Nenhum alerta novo no momento");
        onSincronizado();
      }
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir", "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Preferências de notificação" subtitle="Escolha o que você quer receber e como" onClose={onClose}>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar">
        <div className="space-y-2">
          <p className={eyebrow}>Neste dispositivo</p>
          <Switch label="Som ao chegar notificação" checked={config.som} onChange={(v) => setConfig({ som: v })} />
          <Switch
            label="Aviso do navegador"
            hint={permissao === "unsupported" ? "Seu navegador não suporta." : permissao === "denied" ? "Bloqueado no navegador. Libere nas configurações do site." : "Mostra um aviso quando a aba estiver em segundo plano."}
            checked={config.desktop && permissao === "granted"}
            onChange={desktop}
            disabled={permissao === "unsupported" || permissao === "denied"}
          />
        </div>

        <div className="space-y-2">
          <p className={eyebrow}>Categorias</p>
          {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}
          {!prefs && !erro && <div className="h-10 animate-pulse rounded-xl bg-slate-100" />}
          {prefs?.map((p) => {
            const meta = TIPO_META[p.tipo];
            return <Switch key={p.tipo} label={meta.label} checked={p.ativo} onChange={(v) => void alternar(p.tipo, v)} />;
          })}
          <p className="text-[10px] sm:text-[11px] text-slate-400">Categorias desativadas deixam de gerar notificações novas para você.</p>
        </div>

        <div className="space-y-2">
          <p className={eyebrow}>Ferramentas</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <button className={`${btnGhost} w-full sm:w-auto justify-center`} disabled={busy !== null} onClick={() => void rodar("teste")}>
              {busy === "teste" ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Teste de notificação
            </button>
            <button className={`${btnGhost} w-full sm:w-auto justify-center`} disabled={busy !== null} onClick={() => void rodar("sync")}>
              {busy === "sync" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Verificar alertas
            </button>
          </div>
          {!ativo && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              O tempo real está desligado: falta envolver o app com o NotificacoesProvider no layout.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-100 px-4 sm:px-6 py-4 shrink-0">
        <button className={`${btnPrimary} w-full sm:w-auto`} onClick={onClose}>Concluir</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTEÚDO DA PÁGINA
   ═══════════════════════════════════════════════════════════════ */

function Kpi({ label, value, hint, dark, tone = "default" }: { label: string; value: string; hint: string; dark?: boolean; tone?: "default" | "blue" | "red" }) {
  const base = dark ? "border-slate-900 bg-slate-900 text-white" : tone === "blue" ? "border-blue-200 bg-blue-50" : tone === "red" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col justify-between h-full min-w-0 ${base}`}>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-[0.12em] truncate ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight truncate">{value}</p>
      </div>
      <p className={`mt-2 text-[11px] leading-tight ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

function NotificacoesContent() {
  const router = useRouter();
  const { ativo, version, refresh } = useNotificacoes();

  const [items, setItems] = useState<Notificacao[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<NotifTipo | "TODAS">("TODAS");
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [prioridade, setPrioridade] = useState<NotifPrioridade | "">("");
  const [busca, setBusca] = useState("");
  const dBusca = useDebounced(busca, 300);

  const [prefs, setPrefs] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const reqId = useRef(0);
  const primeiraCarga = useRef(true);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const params = useCallback(
    (extra: Record<string, string> = {}) => {
      const p = new URLSearchParams({ limit: "30", ...extra });
      if (tab !== "TODAS") p.set("tipo", tab);
      if (apenasNaoLidas) p.set("status", "nao-lidas");
      if (prioridade) p.set("prioridade", prioridade);
      if (dBusca.trim()) p.set("search", dBusca.trim());
      return p.toString();
    },
    [tab, apenasNaoLidas, prioridade, dBusca],
  );

  const loadResumo = useCallback(async () => {
    try {
      setResumo(await api<Resumo>("/notificacoes/resumo"));
    } catch {
      /* indicadores são complementares */
    }
  }, []);

  /** silent = recarga em segundo plano (chegou notificação / ação), sem piscar a tela */
  const load = useCallback(
    async (silent = false) => {
      const my = ++reqId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const r = await api<{ data: Notificacao[]; hasMore: boolean }>(`/notificacoes?${params()}`);
        if (my !== reqId.current) return;
        setItems(r.data ?? []);
        setHasMore(!!r.hasMore);
      } catch (e) {
        if (my !== reqId.current) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar notificações");
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [params],
  );

  // Filtros mudaram → carga normal
  useEffect(() => {
    primeiraCarga.current = false;
    void load(false);
  }, [load]);

  // Chegou notificação nova ou houve ação → recarga silenciosa
  useEffect(() => {
    if (primeiraCarga.current) return;
    void load(true);
    void loadResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    void loadResumo();
  }, [loadResumo]);

  const maisAntigas = async () => {
    const ultima = items[items.length - 1];
    if (!ultima) return;
    setCarregandoMais(true);
    try {
      const r = await api<{ data: Notificacao[]; hasMore: boolean }>(`/notificacoes?${params({ before: ultima.createdAt })}`);
      setItems((atual) => {
        const ids = new Set(atual.map((x) => x.id));
        return [...atual, ...r.data.filter((x) => !ids.has(x.id))];
      });
      setHasMore(!!r.hasMore);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível carregar mais", "err");
    } finally {
      setCarregandoMais(false);
    }
  };

  const falha = (e: unknown) => toast(e instanceof Error ? e.message : "Não foi possível concluir a ação", "err");

  const alternarLida = async (n: Notificacao) => {
    const lida = !n.lidaEm;
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, lidaEm: lida ? new Date().toISOString() : null } : x)));
    try {
      await api(`/notificacoes/${n.id}/lida`, { method: "PATCH", body: JSON.stringify({ lida }) });
      await refresh();
    } catch (e) {
      setItems((l) => l.map((x) => (x.id === n.id ? n : x)));
      falha(e);
    }
  };

  const abrir = async (n: Notificacao) => {
    if (!n.lidaEm) {
      try {
        await api(`/notificacoes/${n.id}/lida`, { method: "PATCH", body: JSON.stringify({ lida: true }) });
        void refresh();
      } catch {}
    }
    if (n.href) router.push(n.href);
  };

  const remover = async (n: Notificacao) => {
    const antes = items;
    setItems((l) => l.filter((x) => x.id !== n.id));
    try {
      await api(`/notificacoes/${n.id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setItems(antes);
      falha(e);
    }
  };

  const marcarTodas = async () => {
    try {
      await api(`/notificacoes/marcar-todas-lidas${tab !== "TODAS" ? `?tipo=${tab}` : ""}`, { method: "POST" });
      toast(tab === "TODAS" ? "Todas marcadas como lidas" : `${TIPO_META[tab].label}: todas marcadas como lidas`);
      await refresh();
    } catch (e) {
      falha(e);
    }
  };

  const limparLidas = async () => {
    try {
      const r = await api<{ removidas: number }>("/notificacoes/lidas", { method: "DELETE" });
      toast(r.removidas ? `${r.removidas} notificação(ões) lida(s) removida(s)` : "Não há notificações lidas para remover");
      await refresh();
    } catch (e) {
      falha(e);
    }
  };

  const agrupadas = useMemo(() => {
    const m = new Map<string, Notificacao[]>();
    items.forEach((n) => {
      const g = grupoDoDia(n.createdAt);
      m.set(g, [...(m.get(g) ?? []), n]);
    });
    return GRUPOS_ORDEM.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [items]);

  const filtrando = tab !== "TODAS" || apenasNaoLidas || !!prioridade || !!dBusca.trim();

  return (
    <main className="px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] w-full">
        <header className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><Bell className="w-5 h-5 sm:w-6 sm:h-6" /></span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Notificações</h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 line-clamp-2 sm:line-clamp-none">Alertas da agenda, clínica, estoque, financeiro e CRM</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
            <button className={`${btnGhost} w-full sm:w-auto justify-center whitespace-nowrap`} onClick={() => void marcarTodas()} disabled={(resumo?.naoLidas ?? 0) === 0}>
              <CheckCheck size={15} /> Marcar todas como lidas
            </button>
            <button className={`${btnPrimary} w-full sm:w-auto justify-center whitespace-nowrap`} onClick={() => setPrefs(true)}>
              <Settings size={15} /> Preferências
            </button>
          </div>
        </header>

        {!ativo && (
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <AlertTriangle size={16} className="mt-0.5 sm:mt-0 shrink-0" />
            <p>
              As notificações em tempo real em outras páginas estão desligadas. Envolva o layout do app com{" "}
              <code className="rounded bg-amber-100 px-1 font-semibold">&lt;NotificacoesProvider&gt;</code> para recebê-las.
            </p>
          </div>
        )}

        {/* Abas por categoria (mesmo padrão do Prontuário) */}
        <nav className={`${card} mb-6 flex gap-1 overflow-x-auto p-1.5 scrollbar-hide`} role="tablist" aria-label="Categorias">
          {(["TODAS", ...TIPOS] as const).map((t) => {
            const ativa = tab === t;
            const Icon = t === "TODAS" ? Bell : TIPO_META[t].icon;
            const naoLidas = t === "TODAS" ? resumo?.naoLidas ?? 0 : resumo?.porTipo[t]?.naoLidas ?? 0;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={ativa}
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-semibold transition whitespace-nowrap ${ativa ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {t === "TODAS" ? "Todas" : TIPO_META[t].label.split(" ")[0]}
                {naoLidas > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold shrink-0 ${ativa ? "bg-white/25 text-white" : "bg-rose-100 text-rose-700"}`}>{naoLidas}</span>
                )}
              </button>
            );
          })}
        </nav>

        <section className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Indicadores">
          <Kpi label="Não lidas" value={String(resumo?.naoLidas ?? 0)} hint="Aguardando atenção" tone={(resumo?.naoLidas ?? 0) > 0 ? "blue" : "default"} />
          <Kpi label="Recebidas hoje" value={String(resumo?.hoje ?? 0)} hint="Desde a meia-noite" />
          <Kpi label="Prioridade alta" value={String(resumo?.altas ?? 0)} hint="Alta ou crítica" tone={(resumo?.altas ?? 0) > 0 ? "red" : "default"} />
          <Kpi dark label="No histórico" value={String(resumo?.total ?? 0)} hint="Removidas após 90 dias" />
        </section>

        {/* Filtros */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3 w-full">
          <div className="relative w-full md:max-w-sm shrink-0">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9 w-full`} placeholder="Buscar nas notificações…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar notificações" />
          </div>
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                className={`${inputCls} appearance-none pr-9 w-full sm:w-auto text-[12px] sm:text-sm font-semibold`}
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as NotifPrioridade | "")}
                aria-label="Filtrar por prioridade"
              >
                <option value="">Todas prioridades</option>
                {(Object.keys(PRIORIDADE_META) as NotifPrioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_META[p].label}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex w-full sm:w-auto gap-2">
               <button
                 type="button"
                 aria-pressed={apenasNaoLidas}
                 onClick={() => setApenasNaoLidas((v) => !v)}
                 className={`flex-1 sm:flex-none justify-center rounded-xl px-3 py-2.5 text-[11px] sm:text-xs font-bold transition whitespace-nowrap border shadow-sm ${apenasNaoLidas ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
               >
                 Somente não lidas
               </button>
               <button className={`${btnGhost} flex-1 sm:flex-none justify-center !py-2.5 text-[11px] sm:text-xs md:ml-auto whitespace-nowrap`} onClick={() => void limparLidas()}>
                 <Trash2 size={13} className="shrink-0" /> Limpar lidas
               </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : error ? (
          <div className={`${card} p-8 sm:p-12 text-center`}>
            <p className="text-sm text-rose-600">{error}</p>
            <button className={`${btnGhost} mt-3`} onClick={() => void load(false)}><RefreshCw size={14} /> Tentar de novo</button>
          </div>
        ) : items.length === 0 ? (
          <div className={`${card} p-10 sm:p-16 text-center`}>
            <Bell size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{filtrando ? "Nenhuma notificação encontrada" : "Você está em dia"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {filtrando ? "Limpe a busca ou os filtros." : "Quando houver novidades da agenda, estoque, financeiro ou CRM, elas aparecem aqui."}
            </p>
            {filtrando && (
              <button
                className={`${btnGhost} mt-4`}
                onClick={() => {
                  setTab("TODAS");
                  setApenasNaoLidas(false);
                  setPrioridade("");
                  setBusca("");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {agrupadas.map(([grupo, lista]) => (
              <section key={grupo} aria-label={grupo}>
                <h2 className={`${eyebrow} mb-2 px-1`}>{grupo}</h2>
                <ul className="space-y-2 sm:space-y-2.5">
                  {lista.map((n) => {
                    const meta = TIPO_META[n.tipo];
                    const Icon = meta.icon;
                    const naoLida = !n.lidaEm;
                    const forte = n.prioridade === "ALTA" || n.prioridade === "CRITICA";
                    return (
                      <li
                        key={n.id}
                        className={`relative flex flex-col sm:flex-row sm:items-start gap-3 rounded-2xl border p-4 transition ${naoLida ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}
                      >
                        {naoLida && <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r bg-blue-600" aria-hidden />}
                        <div className="flex items-start gap-3 w-full sm:w-auto">
                           <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tile}`}><Icon size={18} /></span>
                           <button type="button" className="min-w-0 flex-1 text-left sm:hidden" onClick={() => void abrir(n)}>
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={`text-[13px] text-slate-900 line-clamp-2 ${naoLida ? "font-extrabold" : "font-semibold"}`}>{n.titulo}</span>
                              </span>
                           </button>
                        </div>

                        <button type="button" className="min-w-0 flex-1 text-left hidden sm:block" onClick={() => void abrir(n)}>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`text-[13px] sm:text-sm text-slate-900 ${naoLida ? "font-extrabold" : "font-semibold"}`}>{n.titulo}</span>
                            {forte && <Badge cls={PRIORIDADE_META[n.prioridade].cls}>{n.prioridade === "CRITICA" ? <AlertTriangle size={11} className="shrink-0" /> : null}{PRIORIDADE_META[n.prioridade].label}</Badge>}
                          </span>
                          {n.mensagem && <span className="mt-0.5 block text-[12px] sm:text-sm text-slate-600 line-clamp-2 sm:line-clamp-none">{n.mensagem}</span>}
                          <span className="mt-1.5 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400">
                            <span className="font-bold uppercase tracking-wide">{meta.label}</span>
                            <span aria-hidden>·</span>
                            <time dateTime={n.createdAt}>{tempoRelativo(n.createdAt)}</time>
                          </span>
                        </button>
                        
                        {/* Mobile Infos that were hidden inside the button */}
                        <div className="sm:hidden min-w-0 flex-1 -mt-2 ml-14">
                           {forte && <div className="mb-1"><Badge cls={PRIORIDADE_META[n.prioridade].cls}>{n.prioridade === "CRITICA" ? <AlertTriangle size={11} className="shrink-0" /> : null}{PRIORIDADE_META[n.prioridade].label}</Badge></div>}
                           {n.mensagem && <span className="block text-[12px] text-slate-600 line-clamp-2">{n.mensagem}</span>}
                           <span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                             <span className="font-bold uppercase tracking-wide">{meta.label}</span>
                             <span aria-hidden>·</span>
                             <time dateTime={n.createdAt}>{tempoRelativo(n.createdAt)}</time>
                           </span>
                        </div>

                        <div className="flex shrink-0 items-center justify-end w-full sm:w-auto mt-2 sm:mt-0 gap-1 sm:gap-0 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-0">
                          {n.href && <IconBtn label="Abrir" onClick={() => void abrir(n)}><ExternalLink size={15} /></IconBtn>}
                          <IconBtn label={naoLida ? "Marcar como lida" : "Marcar como não lida"} onClick={() => void alternarLida(n)}>
                            {naoLida ? <Check size={16} /> : <Circle size={15} />}
                          </IconBtn>
                          <IconBtn label="Excluir" danger onClick={() => void remover(n)}><Trash2 size={15} /></IconBtn>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hasMore && (
              <div className="text-center pt-2">
                <button className={`${btnGhost} w-full sm:w-auto`} onClick={() => void maisAntigas()} disabled={carregandoMais}>
                  {carregandoMais && <Loader2 size={14} className="animate-spin" />} Carregar mais antigas
                </button>
              </div>
            )}
          </div>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[10px] sm:text-[11px] text-slate-400 text-center sm:text-left pb-4">
          HealthSystem · Central de notificações · Os alertas automáticos são verificados a cada 10 minutos
        </footer>
      </div>

      {prefs && <PreferenciasModal onClose={() => setPrefs(false)} toast={toast} onSincronizado={() => { void load(true); void loadResumo(); }} />}
      <Toasts list={toasts} />
    </main>
  );
}

export default function NotificacoesPage() {
  return (
    <AppShell trilha={["Visão Geral", "Central de Notificações"]}>
      <NotificacoesContent />
    </AppShell>
  );
}

