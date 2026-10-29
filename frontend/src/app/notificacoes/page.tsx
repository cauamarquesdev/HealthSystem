"use client";

/**
 * CENTRAL DE NOTIFICAÇÕES — página única (Next.js App Router + Tailwind + lucide-react).
 * Depende do arquivo compartilhado notificacoes.tsx (provider + sino) e do módulo NestJS /notificacoes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Boxes,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  CircleHelp,
  ClipboardList,
  Columns3,
  ExternalLink,
  FileSignature,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MapPin,
  Menu,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Star,
  Stethoscope,
  Trash2,
  Users,
  X,
} from "lucide-react";
// Ajuste o caminho conforme onde você salvou o arquivo compartilhado.
import {
  api,
  NotificationBell,
  PRIORIDADE_META,
  TIPO_META,
  tempoRelativo,
  useNotificacoes,
} from "../../lib/notificacoes";
import type { NotifPrioridade, NotifTipo, Notificacao } from "../../lib/notificacoes";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CLINICA_NOME = "Ellevare Estética Avançada";
const UNIDADE_NOME = "Unidade Av Saudade (Matriz)";

const USUARIO = {
  nome: "Dra. Joana Oliveira",
  cargo: "Diretora Médica & Sócia",
  avatar: "",
  plano: "Plano Enterprise",
};

const NAV: { section: string; items: { label: string; href: string; icon: React.ReactNode }[] }[] = [
  {
    section: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Central de Notificações", href: "/notificacoes", icon: <Bell size={18} /> },
    ],
  },
  {
    section: "Operação",
    items: [
      { label: "Agenda da Dra. Joana", href: "/agenda", icon: <CalendarDays size={18} /> },
      { label: "Clientes", href: "/clientes", icon: <Users size={18} /> },
      { label: "CRM Kanban", href: "/crm", icon: <Columns3 size={18} /> },
      { label: "Procedimentos", href: "/procedimentos", icon: <Stethoscope size={18} /> },
      { label: "Recursos", href: "/recursos", icon: <Boxes size={18} /> },
      { label: "Lista de Espera", href: "/lista-de-espera", icon: <ListChecks size={18} /> },
    ],
  },
  {
    section: "Gestão clínica",
    items: [
      { label: "Prontuários", href: "/prontuarios", icon: <ClipboardList size={18} /> },
      { label: "Avaliações Estéticas", href: "/avaliacoes", icon: <Star size={18} /> },
      { label: "Protocolos", href: "/protocolos", icon: <BookOpen size={18} /> },
      { label: "Fotos Clínicas", href: "/fotos", icon: <ImageIcon size={18} /> },
      { label: "Termos & Documentos", href: "/termos", icon: <FileSignature size={18} /> },
    ],
  },
  {
    section: "Comercial",
    items: [
      { label: "Orçamentos", href: "/orcamentos", icon: <Receipt size={18} /> },
      { label: "Financeiro", href: "/financeiro", icon: <Landmark size={18} /> },
    ],
  },
];

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

const iniciais = (nome = "") =>
  nome
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
      className={`grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${danger ? "hover:text-rose-600" : "hover:text-blue-600"}`}
    >
      {children}
    </button>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function Avatar({ nome, size = 36, foto }: { nome: string; size?: number; foto?: string }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-700" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden>
      {iniciais(nome)}
    </span>
  );
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
      <div className={`${card} flex max-h-[92vh] w-full max-w-lg flex-col`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        {children}
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
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
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
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
          <p className="text-[11px] text-slate-400">Categorias desativadas deixam de gerar notificações novas para você.</p>
        </div>

        <div className="space-y-2">
          <p className={eyebrow}>Ferramentas</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} disabled={busy !== null} onClick={() => void rodar("teste")}>
              {busy === "teste" ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Enviar notificação de teste
            </button>
            <button className={btnGhost} disabled={busy !== null} onClick={() => void rodar("sync")}>
              {busy === "sync" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Verificar alertas agora
            </button>
          </div>
          {!ativo && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              O tempo real está desligado: falta envolver o app com o NotificacoesProvider no layout.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-100 px-6 py-4">
        <button className={btnPrimary} onClick={onClose}>Concluir</button>
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
    <div className={`rounded-2xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${base}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className={`mt-1 text-[11px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
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
      <div className="mx-auto max-w-[1100px]">
        <nav aria-label="Trilha da página" className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-slate-500">Visão Geral</span>
          <span className="text-slate-300">›</span>
          <span className="font-semibold text-blue-600">Central de Notificações</span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><Bell size={22} /></span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Central de notificações</h1>
              <p className="mt-0.5 text-sm text-slate-500">Alertas da agenda, clínica, estoque, financeiro e CRM em um só lugar</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => void marcarTodas()} disabled={(resumo?.naoLidas ?? 0) === 0}>
              <CheckCheck size={15} /> Marcar todas como lidas
            </button>
            <button className={btnPrimary} onClick={() => setPrefs(true)}>
              <Settings size={15} /> Preferências
            </button>
          </div>
        </header>

        {!ativo && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              As notificações em tempo real em outras páginas estão desligadas. Envolva o layout do app com{" "}
              <code className="rounded bg-amber-100 px-1 font-semibold">&lt;NotificacoesProvider&gt;</code> para recebê-las em qualquer tela.
            </p>
          </div>
        )}

        {/* Abas por categoria (mesmo padrão do Prontuário) */}
        <nav className={`${card} mb-6 flex gap-1 overflow-x-auto p-1.5`} role="tablist" aria-label="Categorias">
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
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${ativa ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon size={15} />
                {t === "TODAS" ? "Todas" : TIPO_META[t].label.split(" ")[0]}
                {naoLidas > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${ativa ? "bg-white/25 text-white" : "bg-rose-100 text-rose-700"}`}>{naoLidas}</span>
                )}
              </button>
            );
          })}
        </nav>

        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
          <Kpi label="Não lidas" value={String(resumo?.naoLidas ?? 0)} hint="Aguardando sua atenção" tone={(resumo?.naoLidas ?? 0) > 0 ? "blue" : "default"} />
          <Kpi label="Recebidas hoje" value={String(resumo?.hoje ?? 0)} hint="Desde a meia-noite" />
          <Kpi label="Prioridade alta" value={String(resumo?.altas ?? 0)} hint="Alta ou crítica, não lidas" tone={(resumo?.altas ?? 0) > 0 ? "red" : "default"} />
          <Kpi dark label="No histórico" value={String(resumo?.total ?? 0)} hint="Lidas são removidas após 90 dias" />
        </section>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Buscar nas notificações…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar notificações" />
          </div>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-9`}
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as NotifPrioridade | "")}
              aria-label="Filtrar por prioridade"
            >
              <option value="">Todas as prioridades</option>
              {(Object.keys(PRIORIDADE_META) as NotifPrioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_META[p].label}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="button"
            aria-pressed={apenasNaoLidas}
            onClick={() => setApenasNaoLidas((v) => !v)}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${apenasNaoLidas ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Somente não lidas
          </button>
          <button className={`${btnGhost} ml-auto !py-2 text-xs`} onClick={() => void limparLidas()}>
            <Trash2 size={13} /> Limpar lidas
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : error ? (
          <div className={`${card} p-12 text-center`}>
            <p className="text-sm text-rose-600">{error}</p>
            <button className={`${btnGhost} mt-3`} onClick={() => void load(false)}><RefreshCw size={14} /> Tentar de novo</button>
          </div>
        ) : items.length === 0 ? (
          <div className={`${card} p-16 text-center`}>
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
          <div className="space-y-6">
            {agrupadas.map(([grupo, lista]) => (
              <section key={grupo} aria-label={grupo}>
                <h2 className={`${eyebrow} mb-2 px-1`}>{grupo}</h2>
                <ul className="space-y-2.5">
                  {lista.map((n) => {
                    const meta = TIPO_META[n.tipo];
                    const Icon = meta.icon;
                    const naoLida = !n.lidaEm;
                    const forte = n.prioridade === "ALTA" || n.prioridade === "CRITICA";
                    return (
                      <li
                        key={n.id}
                        className={`relative flex items-start gap-3 rounded-2xl border p-4 transition ${naoLida ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}
                      >
                        {naoLida && <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r bg-blue-600" aria-hidden />}
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tile}`}><Icon size={18} /></span>

                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => void abrir(n)}>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm text-slate-900 ${naoLida ? "font-extrabold" : "font-semibold"}`}>{n.titulo}</span>
                            {forte && <Badge cls={PRIORIDADE_META[n.prioridade].cls}>{n.prioridade === "CRITICA" ? <AlertTriangle size={11} /> : null}{PRIORIDADE_META[n.prioridade].label}</Badge>}
                          </span>
                          {n.mensagem && <span className="mt-0.5 block text-sm text-slate-600">{n.mensagem}</span>}
                          <span className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold uppercase tracking-wide">{meta.label}</span>
                            <span aria-hidden>·</span>
                            <time dateTime={n.createdAt}>{tempoRelativo(n.createdAt)}</time>
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center">
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
              <div className="text-center">
                <button className={btnGhost} onClick={() => void maisAntigas()} disabled={carregandoMais}>
                  {carregandoMais && <Loader2 size={14} className="animate-spin" />} Carregar mais antigas
                </button>
              </div>
            )}
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
          HealthSystem · Central de notificações · Os alertas automáticos são verificados a cada 10 minutos
        </footer>
      </div>

      {prefs && <PreferenciasModal onClose={() => setPrefs(false)} toast={toast} onSincronizado={() => { void load(true); void loadResumo(); }} />}
      <Toasts list={toasts} />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHELL DO SISTEMA (sidebar + topbar)
   Se o seu layout.tsx já renderiza isso, remova AppShell e exporte só <NotificacoesContent />
   ═══════════════════════════════════════════════════════════════ */

function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Activity size={20} /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-slate-900">HealthSystem</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Clinical Suite</p>
          </div>
        </div>

        <button type="button" className="flex w-full items-center justify-between border-y border-slate-100 px-5 py-3 text-left hover:bg-slate-50" aria-label="Trocar unidade">
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-semibold text-blue-600">{CLINICA_NOME}</span>
            <span className="block truncate text-[13px] font-semibold text-slate-800">{UNIDADE_NOME}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.section}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar nome={USUARIO.nome} foto={USUARIO.avatar} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-slate-900">{USUARIO.nome}</p>
              <p className="truncate text-[11px] text-blue-600">{USUARIO.cargo}</p>
            </div>
            <IconBtn label="Configurações" onClick={() => {}}><Settings size={16} /></IconBtn>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <Badge cls="border-blue-200 bg-blue-50 text-blue-700">{USUARIO.plano}</Badge>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"><CircleHelp size={13} /> Suporte</button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[62px] shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <nav aria-label="Trilha" className="hidden items-center gap-2 text-[13px] sm:flex">
            <span className="text-slate-500">Visão Geral</span>
            <span className="text-slate-300">›</span>
            <span className="font-bold text-slate-900">Central de Notificações</span>
          </nav>
          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-blue-600 lg:flex"><MapPin size={15} /> {UNIDADE_NOME}</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-50" aria-label="Ajuda"><CircleHelp size={18} /></button>
            <Avatar nome={USUARIO.nome} foto={USUARIO.avatar} size={36} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50">{children}</div>
      </div>
    </div>
  );
}

export default function NotificacoesPage() {
  return (
    <AppShell>
      <NotificacoesContent />
    </AppShell>
  );
}