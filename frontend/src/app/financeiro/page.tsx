"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  DoorOpen,
  FileSignature,
  FileText,
  ImageIcon,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Menu,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  Star,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../prontuarios/lib/api";
import OverviewTab from "../financeiro/tabs/Overviewtab";
import SalesTab, { NewSaleDrawer, type SalePrefill } from "../financeiro/tabs/Salestab";
import TransactionsTab, { TransactionDrawer } from "../financeiro/tabs/Transactionstab";
import { CashflowTab, ProceduresTab } from "./tabs/Analysis";
import {
  periodOf,
  shiftAnchor,
  type Billable,
  type Mode,
  type Summary,
  type Tx,
} from "../financeiro/tabs/fin";

/* -------------------------------------------------------------------------- */
/*  Configuração das abas                                                     */
/* -------------------------------------------------------------------------- */

type Tab = "visao-geral" | "vendas" | "lancamentos" | "procedimentos" | "caixa";

type TabMeta = {
  id: Tab;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: TabMeta[] = [
  {
    id: "visao-geral",
    label: "Visão geral",
    title: "Visão geral",
    description: "Faturamento, recebimentos, despesas e resultado do período.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "vendas",
    label: "Vendas",
    title: "Vendas",
    description: "Vendas realizadas, pagamentos e atendimentos aguardando cobrança.",
    icon: Receipt,
  },
  {
    id: "lancamentos",
    label: "Lançamentos",
    title: "Lançamentos",
    description: "Receitas e despesas registradas, com edição e conciliação.",
    icon: Wallet,
  },
  {
    id: "procedimentos",
    label: "Procedimentos",
    title: "Rentabilidade por procedimento",
    description: "Quais procedimentos mais faturam e mais rendem para a clínica.",
    icon: Activity,
  },
  {
    id: "caixa",
    label: "Fluxo de caixa",
    title: "Fluxo de caixa",
    description: "Entradas, saídas e saldo ao longo do período.",
    icon: CircleDollarSign,
  },
];

const MODES: [Mode, string][] = [
  ["month", "Mês"],
  ["quarter", "Trimestre"],
  ["year", "Ano"],
  ["30d", "30 dias"],
];

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

/* -------------------------------------------------------------------------- */
/*  Sidebar (fora do componente da página: evita remontar a cada render)      */
/* -------------------------------------------------------------------------- */

const NAV_SECTIONS: {
  title: string;
  items: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    title: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Central de Notificações", href: "/notificacoes", icon: Bell },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "Agenda", href: "/", icon: Calendar },
      { label: "Clientes", href: "/pacientes", icon: Users },
      { label: "CRM Kanban", href: "/crm", icon: Kanban },
      { label: "Procedimentos", href: "/procedimentos", icon: Stethoscope },
      { label: "Recursos", href: "/recursos", icon: DoorOpen },
      { label: "Lista de Espera", href: "/lista-espera", icon: ListTodo },
    ],
  },
  {
    title: "Gestão Clínica",
    items: [
      { label: "Prontuários", href: "/prontuarios", icon: FileText },
      { label: "Avaliações Estéticas", href: "/avaliacoes", icon: Star },
      { label: "Protocolos", href: "/protocolos", icon: BookOpen },
      { label: "Fotos Clínicas", href: "/fotos", icon: ImageIcon },
      { label: "Termos & Documentos", href: "/documentos", icon: FileSignature },
    ],
  },
];

const sectionLabel = "mb-2 block px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400";

function SidebarLink({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
      {label}
    </Link>
  );
}

function FinanceNavGroup({
  activeTab,
  onSelect,
  pendingCount,
}: {
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-blue-50/60 p-1.5 ring-1 ring-blue-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
          <CircleDollarSign className="h-4 w-4" />
        </span>
        <span className="flex-1">Financeiro</span>
        <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="mt-1 space-y-0.5 pb-1">
          {TABS.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                    active
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "vendas" && pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AppSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  onNavigate,
}: {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
        <div className="flex items-center gap-2.5 text-xl font-black tracking-tight text-blue-600">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none">HealthSystem</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Clinical Suite</span>
          </div>
        </div>

        <button
          type="button"
          className="flex flex-col gap-1 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-left transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Ellevare Estética Avançada</span>
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-blue-900">Unidade Av Saudade (Matriz)</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-blue-400" />
          </span>
        </button>
      </div>

      <div
        className="flex-1 space-y-6 overflow-y-auto p-3"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onNavigate?.();
        }}
      >
        {NAV_SECTIONS.slice(0, 2).map((section) => (
          <div key={section.title}>
            <span className={sectionLabel}>{section.title}</span>
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => (
                <SidebarLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
        ))}

        {/* Nova seção: Financeiro */}
        <div>
          <span className={sectionLabel}>Financeiro</span>
          <FinanceNavGroup activeTab={activeTab} onSelect={onSelectTab} pendingCount={pendingCount} />
        </div>

        {NAV_SECTIONS.slice(2).map((section) => (
          <div key={section.title}>
            <span className={sectionLabel}>{section.title}</span>
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => (
                <SidebarLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
        ))}

        <div>
          <span className={sectionLabel}>Comercial</span>
          <nav className="space-y-0.5" aria-label="Comercial">
            <SidebarLink icon={Briefcase} label="Vendas" href="/vendas" />
          </nav>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200/60 bg-white p-4">
        <div className="flex items-center gap-3 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.pravatar.cc/150?img=5"
            alt="Dra. Joana Oliveira"
            className="h-9 w-9 rounded-full border border-slate-200"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold leading-tight text-slate-800">Dra. Joana Oliveira</span>
            <span className="truncate text-[10px] font-medium text-slate-500">Diretora Médica & Sócia</span>
          </div>
          <button
            type="button"
            aria-label="Configurações"
            className="ml-auto rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Plano Enterprise</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Suporte
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Menu "Novo" (venda, receita, despesa)                                     */
/* -------------------------------------------------------------------------- */

function NewMenu({
  onSale,
  onRevenue,
  onExpense,
}: {
  onSale: () => void;
  onRevenue: () => void;
  onExpense: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const options = [
    { label: "Nova venda", hint: "Cobrar um atendimento ou serviço", icon: Receipt, tone: "text-blue-600 bg-blue-50", fn: onSale },
    { label: "Nova receita", hint: "Entrada avulsa no caixa", icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50", fn: onRevenue },
    { label: "Nova despesa", hint: "Saída, conta ou custo", icon: TrendingDown, tone: "text-rose-600 bg-rose-50", fn: onExpense },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" />
        Novo
        <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {options.map(({ label, hint, icon: Icon, tone, fn }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              onClick={run(fn)}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{label}</span>
                <span className="text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página                                                                    */
/* -------------------------------------------------------------------------- */

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [mode, setMode] = useState<Mode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);

  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [salePrefill, setSalePrefill] = useState<SalePrefill | undefined>();
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);
  const [initialTransactionType, setInitialTransactionType] = useState<"RECEITA" | "DESPESA" | undefined>();
  const [editSignal] = useState<{ tx: Tx | null; n: number }>({ tx: null, n: 0 });

  const period = useMemo(() => periodOf(mode, anchor), [mode, anchor]);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const pendingCount = summary?.billable.count ?? 0;

  /* ---- Carregamento do resumo ---- */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ from: period.from, to: period.to });
      const data = await api<Summary>(`/finance/summary?${qs.toString()}`);
      setSummary(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar o resumo financeiro.";
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  /* ---- Aba sincronizada com a URL (?aba=vendas) ---- */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("aba");
    if (isTab(fromUrl)) setTab(fromUrl);
  }, []);

  const selectTab = useCallback((next: Tab) => {
    setTab(next);
    setMobileNav(false);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", next);
    window.history.replaceState(null, "", url);
  }, []);

  const goTab = useCallback(
    (next: "vendas" | "lancamentos" | "procedimentos" | "caixa") => selectTab(next),
    [selectTab],
  );

  /* ---- Drawer mobile: Esc fecha e bloqueia scroll do fundo ---- */
  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileNav(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNav]);

  /* ---- Ações ---- */
  const openNewTransaction = useCallback((type?: "RECEITA" | "DESPESA") => {
    setInitialTransactionType(type);
    setNewTransactionOpen(true);
  }, []);

  const openSale = useCallback(() => {
    setSalePrefill(undefined);
    setNewSaleOpen(true);
  }, []);

  const openBillable = useCallback((billable: Billable) => {
    setSalePrefill({
      appointmentId: billable.id,
      patient: billable.patient,
      items: billable.items,
      discount: billable.discount,
    });
    setNewSaleOpen(true);
  }, []);

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next === "30d") setAnchor(new Date());
  };

  const shiftPeriod = (direction: number) => {
    if (mode === "30d") {
      setAnchor(new Date());
      return;
    }
    setAnchor((c) => shiftAnchor(mode, c, direction));
  };

  const manualRefresh = () => {
    refresh();
    toast.success("Dados financeiros atualizados");
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar desktop */}
      <aside className="z-10 hidden w-[260px] shrink-0 border-r border-slate-200/60 lg:block">
        <AppSidebar activeTab={tab} onSelectTab={selectTab} pendingCount={pendingCount} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileNav(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            <AppSidebar
              activeTab={tab}
              onSelectTab={selectTab}
              pendingCount={pendingCount}
              onNavigate={() => setMobileNav(false)}
            />
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileNav(false)}
              className="absolute -right-12 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden font-medium text-slate-400 sm:inline">Financeiro</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="truncate font-bold text-slate-800">{current.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={manualRefresh}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <NewMenu
              onSale={openSale}
              onRevenue={() => openNewTransaction("RECEITA")}
              onExpense={() => openNewTransaction("DESPESA")}
            />
          </div>
        </header>

        {/* Conteúdo rolável */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1480px] space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Título + período */}
            <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{current.title}</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-500">{current.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="Tipo de período"
                  className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                >
                  {MODES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeMode(value)}
                      aria-pressed={mode === value}
                      className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                        mode === value
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 shadow-sm">
                  <button
                    type="button"
                    aria-label="Período anterior"
                    onClick={() => shiftPeriod(-1)}
                    disabled={mode === "30d"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[140px] text-center text-xs font-bold text-slate-700" aria-live="polite">
                    {period.label}
                  </span>
                  <button
                    type="button"
                    aria-label="Próximo período"
                    onClick={() => shiftPeriod(1)}
                    disabled={mode === "30d"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Abas */}
            <nav
              aria-label="Seções do financeiro"
              className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
            >
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:px-4 ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.id === "vendas" && pendingCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Aviso: atendimentos aguardando cobrança */}
            {!error && pendingCount > 0 && tab !== "vendas" && tab !== "visao-geral" && (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      {pendingCount === 1
                        ? "1 atendimento aguardando cobrança"
                        : `${pendingCount} atendimentos aguardando cobrança`}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800/80">
                      Registre as vendas para que entrem no faturamento do período.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab("vendas")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white transition hover:bg-amber-700"
                >
                  Ver cobranças pendentes
                </button>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="text-sm font-bold text-rose-800">Não foi possível carregar o resumo financeiro</p>
                    <p className="mt-1 text-xs text-rose-700">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadSummary}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                </button>
              </div>
            )}

            {/* Conteúdo da aba */}
            <div className="min-w-0">
              {tab === "visao-geral" && (
                <OverviewTab s={summary} loading={loading} mode={mode} onBill={openBillable} goTab={goTab} />
              )}

              {tab === "vendas" && (
                <SalesTab
                  from={period.from}
                  to={period.to}
                  version={version}
                  billableCount={pendingCount}
                  onNewSale={openSale}
                  onBill={openBillable}
                  onChanged={refresh}
                />
              )}

              {tab === "lancamentos" && (
                <TransactionsTab
                  from={period.from}
                  to={period.to}
                  version={version}
                  onNew={openNewTransaction}
                  onChanged={refresh}
                  editSignal={editSignal}
                />
              )}

              {tab === "procedimentos" && <ProceduresTab s={summary} label={period.label} />}
              {tab === "caixa" && <CashflowTab s={summary} />}
            </div>
          </div>
        </main>
      </div>

      {/* Drawers */}
      <NewSaleDrawer
        open={newSaleOpen}
        prefill={salePrefill}
        onClose={() => {
          setNewSaleOpen(false);
          setSalePrefill(undefined);
        }}
        onSaved={() => {
          setNewSaleOpen(false);
          setSalePrefill(undefined);
          refresh();
          toast.success("Venda registrada");
        }}
      />

      <TransactionDrawer
        open={newTransactionOpen}
        initialType={initialTransactionType}
        onClose={() => setNewTransactionOpen(false)}
        onSaved={() => {
          setNewTransactionOpen(false);
          refresh();
          toast.success("Lançamento salvo");
        }}
      />
    </div>
  );
}