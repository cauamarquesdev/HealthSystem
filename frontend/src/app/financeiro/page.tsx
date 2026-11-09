"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../../components/AppShell"; // Ajuste o caminho se necessário
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
    const url = new URL(window.location.href);
    url.searchParams.set("aba", next);
    window.history.replaceState(null, "", url);
  }, []);

  const goTab = useCallback(
    (next: "vendas" | "lancamentos" | "procedimentos" | "caixa") => selectTab(next),
    [selectTab],
  );

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

  const acoesTopo = (
    <>
      <button
        onClick={manualRefresh}
        title="Atualizar dados"
        aria-label="Atualizar dados"
        className="flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </button>
      <div className="flex gap-2">
        <button
          onClick={openSale}
          className="flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-blue-600 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 whitespace-nowrap"
        >
          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nova venda</span><span className="sm:hidden">Venda</span>
        </button>
        <button
          onClick={() => openNewTransaction("RECEITA")}
          className="flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-600 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 whitespace-nowrap"
        >
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nova receita</span><span className="sm:hidden">Receita</span>
        </button>
        <button
          onClick={() => openNewTransaction("DESPESA")}
          className="flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-rose-600 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 whitespace-nowrap"
        >
          <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nova despesa</span><span className="sm:hidden">Despesa</span>
        </button>
      </div>
    </>
  );

  return (
    <AppShell
      trilha={["Comercial", "Financeiro"]}
      acoes={acoesTopo}
    >
      <div className="flex flex-col flex-1 w-full min-h-0 bg-slate-50 relative z-0">
        
        {/* Conteúdo rolável */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto w-full max-w-[1480px] space-y-5 sm:space-y-6 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 h-full">
            
            {/* Título + período */}
            <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end shrink-0">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 sm:text-3xl truncate">{current.title}</h1>
                <p className="mt-1 max-w-xl text-[12px] sm:text-sm text-slate-500 line-clamp-2">{current.description}</p>
              </div>

              {/* Controles de Período Responsivos */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
                <div
                  role="group"
                  aria-label="Tipo de período"
                  className="flex w-full sm:w-auto overflow-x-auto scrollbar-hide h-9 sm:h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0"
                >
                  {MODES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeMode(value)}
                      aria-pressed={mode === value}
                      className={`flex-1 sm:flex-none h-7 sm:h-8 rounded-lg px-3 text-[11px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 ${
                        mode === value
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex w-full sm:w-auto justify-between sm:justify-center h-9 sm:h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 shadow-sm shrink-0">
                  <button
                    type="button"
                    aria-label="Período anterior"
                    onClick={() => shiftPeriod(-1)}
                    disabled={mode === "30d"}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[120px] sm:min-w-[140px] px-2 truncate text-center text-[11px] sm:text-xs font-bold text-slate-700" aria-live="polite">
                    {period.label}
                  </span>
                  <button
                    type="button"
                    aria-label="Próximo período"
                    onClick={() => shiftPeriod(1)}
                    disabled={mode === "30d"}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Abas */}
            <nav
              aria-label="Seções do financeiro"
              className="flex w-full gap-1 overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm shrink-0"
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
                    className={`inline-flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    {item.label}
                    {item.id === "vendas" && pendingCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold shrink-0 ${
                          active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700 border border-amber-200"
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
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between w-full shrink-0">
                <div className="flex items-start gap-3 min-w-0">
                  <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-sm font-bold text-amber-900 truncate">
                      {pendingCount === 1
                        ? "1 atendimento aguardando cobrança"
                        : `${pendingCount} atendimentos aguardando cobrança`}
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-amber-800/80 truncate">
                      Registre as vendas para que entrem no faturamento.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab("vendas")}
                  className="inline-flex shrink-0 h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-[11px] sm:text-xs font-bold text-white transition hover:bg-amber-700 whitespace-nowrap shadow-sm"
                >
                  Ver cobranças
                </button>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between w-full shrink-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-sm font-bold text-rose-800 truncate">Não foi possível carregar o resumo</p>
                    <p className="mt-1 text-[11px] sm:text-xs text-rose-700 truncate">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadSummary}
                  className="inline-flex shrink-0 h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-[11px] sm:text-xs font-bold text-white hover:bg-rose-800 whitespace-nowrap shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                </button>
              </div>
            )}

            {/* Conteúdo das abas */}
            <div className="flex-1 flex flex-col min-h-0 w-full relative">
              <div className="flex-1 flex flex-col overflow-x-hidden min-h-0 w-full relative h-full">
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
    </AppShell>
  );
}