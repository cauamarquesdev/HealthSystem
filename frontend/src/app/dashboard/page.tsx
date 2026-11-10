"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Download, MoreVertical, Clock, Gift, MessageCircle,
  Loader2, AlertTriangle, X, Kanban, Stethoscope, Search, User, Bell,
  ChevronRight, Users,
} from "lucide-react";
import { AppShell } from "../../components/AppShell"; // Ajuste o caminho conforme a estrutura da sua pasta

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const FILTROS = ["Hoje", "Esta semana", "Este mês"];
const DONUT_COLORS = ["#0f766e", "#334155", "#5eaaa0", "#cbd5d1"];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [dateFilter, setDateFilter] = useState("Hoje");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isEligibleOpen, setIsEligibleOpen] = useState(false);

  // BUSCA OS DADOS REAIS DO NESTJS COM BASE NO FILTRO
  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/dashboard/metrics?filter=${dateFilter}`);
        if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
        setMetrics({
          faturamentoHoje: "0,00",
          agendamentosHoje: 0,
          pacientesAtendidos: 0,
          ticketMedio: "0,00",
          taxaComparecimento: "0%",
          conversaoAvaliacoes: "0%",
          ocupacaoAgenda: "0%",
          recorrencia: "0%",
          agenda: [],
          crm: [],
          alerts: [],
          mixChart: [],
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetrics();
  }, [dateFilter]);

  // EXPORTAR RELATÓRIO (CSV)
  const handleExportExcel = () => {
    const csvRows = [
      ["Relatorio de Performance Clinica", `Filtro: ${dateFilter}`],
      [""],
      ["Metrica", "Valor"],
      ["Faturamento", `R$ ${metrics?.faturamentoHoje || "0"}`],
      ["Agendamentos", metrics?.agendamentosHoje || "0"],
      ["Pacientes Atendidos", metrics?.pacientesAtendidos || "0"],
      ["Ticket Medio", `R$ ${metrics?.ticketMedio || "0"}`],
      ["Taxa de Comparecimento", metrics?.taxaComparecimento || "0%"],
      ["Conversao de Avaliacoes", metrics?.conversaoAvaliacoes || "0%"],
      ["Recorrencia", metrics?.recorrencia || "0%"],
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Relatorio_Dashboard_${dateFilter.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const acoesTopo = (
    <>
      <button
        onClick={() => setIsNewSaleOpen(true)}
        className="hidden md:inline-flex h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        <Plus className="h-4 w-4" /> Nova venda
      </button>
      <button
        onClick={() => setIsNewAppointmentOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3.5 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Novo agendamento</span>
        <span className="sm:hidden">Agendar</span>
      </button>
    </>
  );

  const agenda: any[] = metrics?.agenda || [];
  const mix: any[] = metrics?.mixChart || [];
  const mixView: any[] = mix;
  const fluxo = buildFluxo(metrics);
  const totalFluxo = fluxo.reduce((s, p) => s + p.valor, 0);
  const pico = fluxo.reduce((m: any, p) => (p.valor > (m?.valor ?? 0) ? p : m), null);
  const projecao = parseMoney(metrics?.projecao);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppShell
      trilha={["Visão Geral", "Dashboard Executivo"]}
      busca={{ valor: busca, onChange: setBusca, placeholder: "Pesquisar no dashboard..." }}
      acoes={acoesTopo}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-stone-100 text-stone-900">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-stone-500">
            <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            <span className="text-sm">Carregando indicadores…</span>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto max-w-[1400px] space-y-6">
              {/* CABEÇALHO + FILTROS */}
              <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bom dia!</h1>
                  <p className="mt-1 text-sm capitalize text-stone-500">
                    {hoje} <span className="normal-case">· Resumo {dateFilter.toLowerCase()}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div role="tablist" className="inline-flex w-full rounded-lg border border-stone-300 bg-white p-0.5 sm:w-auto">
                    {FILTROS.map((t) => (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={dateFilter === t}
                        onClick={() => setDateFilter(t)}
                        className={`flex-1 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                          dateFilter === t ? "bg-teal-700 text-white" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <Download className="h-4 w-4" /> Exportar relatório
                  </button>
                </div>
              </header>

              {/* INDICADORES */}
              <section aria-label="Indicadores" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-300 bg-stone-300 lg:grid-cols-4">
                <Kpi
                  title="Faturamento"
                  value={`R$ ${metrics?.faturamentoHoje || "0"}`}
                  trend="+14,2%"
                  note="Meta em 105%"
                  tone="up"
                  big
                />
                <Kpi
                  title="Agendamentos"
                  value={metrics?.agendamentosHoje || "0"}
                  note={`${metrics?.pacientesAtendidos || "0"} confirmados na grade`}
                  extra={
                    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div className="w-[70%] bg-teal-700" />
                      <div className="w-[20%] bg-amber-400" />
                      <div className="w-[10%] bg-rose-400" />
                    </div>
                  }
                />
                <Kpi
                  title="Pacientes atendidos"
                  value={metrics?.pacientesAtendidos || "0"}
                  suffix={`de ${metrics?.agendamentosHoje || "0"}`}
                  trend="95%"
                  note="de pontualidade"
                  tone="flat"
                />
                <Kpi title="Comparecimento" value={metrics?.taxaComparecimento || "0%"} trend="+3,2%" note="Sem faltas pela manhã" tone="up" />
                <Kpi title="Ticket médio" value={`R$ ${metrics?.ticketMedio || "0"}`} trend="+8,5%" note="Mix de injetáveis" tone="up" />
                <Kpi title="Conversão de avaliações" value={metrics?.conversaoAvaliacoes || "0%"} trend="+5,1%" note="13 orçamentos fechados" tone="up" />
                <Kpi title="Ocupação da agenda" value={metrics?.ocupacaoAgenda || "0%"} trend="Salas 1, 2 e 3 lotadas" note="5 salas ativas" tone="flat" />
                <Kpi title="Recorrência" value={metrics?.recorrencia || "0%"} trend="+4,0%" note="Planos anuais" tone="up" />
              </section>

              {/* AGENDA + LATERAL */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="rounded-xl border border-stone-300 bg-white lg:col-span-2">
                  <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                      <h2 className="text-base font-semibold">Agenda do dia</h2>
                      <p className="text-sm text-stone-500">{agenda.length} procedimentos · linha do tempo e prontuários</p>
                    </div>
                    <div className="flex gap-4 overflow-x-auto text-sm">
                      <Tab active label={`Todos (${agenda.length})`} />
                      <Tab label="Em curso (0)" />
                      <Tab label="A confirmar (0)" />
                      <Tab label="Concluídos (0)" />
                    </div>
                  </div>

                  <div className="divide-y divide-stone-200">
                    {agenda.length > 0 ? (
                      agenda.map((item: any, idx: number) => (
                        <AgendaItem key={idx} {...item} buttonLabel="Detalhes" />
                      ))
                    ) : (
                      <Empty icon={<Calendar className="h-6 w-6" />} title="Agenda livre" text="Nenhum agendamento para este período." />
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm sm:px-5">
                    <button className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800">
                      Ver grade completa <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="text-stone-400">Atualizado há 2 min</span>
                  </div>
                </section>

                <div className="space-y-6">
                  {/* Retorno de pacientes (antigo banner) */}
                  <section className="rounded-xl border border-stone-300 bg-white p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold">Retornos pendentes</h2>
                        <p className="mt-1 text-sm leading-relaxed text-stone-500">
                          14 pacientes com toxina ou bioestimulador há mais de 120 dias, sem retorno marcado.
                        </p>
                        <p className="mt-2 text-sm font-medium text-stone-900">Potencial de R$ 58.400,00</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                      <button className="h-9 flex-1 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800">
                        Enviar WhatsApp
                      </button>
                      <button
                        onClick={() => setIsEligibleOpen(true)}
                        className="h-9 flex-1 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Ver lista (14)
                      </button>
                    </div>
                  </section>

                  {/* CRM */}
                  <section className="rounded-xl border border-stone-300 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-semibold">Negociações no CRM</h2>
                        <p className="text-sm text-stone-500">Aguardando fechamento · R$ 0,00</p>
                      </div>
                      <MoreVertical className="h-4 w-4 shrink-0 text-stone-400" />
                    </div>
                    <div className="space-y-4">
                      {metrics?.crm && metrics.crm.length > 0 ? (
                        metrics.crm.map((item: any, idx: number) => <CRMItem key={idx} {...item} />)
                      ) : (
                        <Empty icon={<Kanban className="h-5 w-5" />} title="Sem negociações" text="Nada pendente no CRM por agora." compact />
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* GRÁFICOS + ALERTAS */}
              <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-3">
                <section className="rounded-xl border border-stone-300 bg-white p-4 sm:p-5 lg:col-span-2">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Faturamento por horário</h2>
                      <p className="text-sm text-stone-500">Receita registrada em cada faixa do período</p>
                    </div>
                    {fluxo.length > 0 && (
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span className="flex items-center gap-2 text-stone-700">
                          <span className="h-0.5 w-4 bg-teal-700" /> Realizado ({brl(totalFluxo)})
                        </span>
                        {fluxo.some((p) => p.projetado != null) && (
                          <span className="flex items-center gap-2 text-stone-500">
                            <span className="h-0 w-4 border-t-2 border-dashed border-stone-400" /> Projetado
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {totalFluxo > 0 ? (
                    <>
                      <RevenueChart data={fluxo} />
                      <div className="mt-4 flex flex-col gap-1 rounded-lg bg-stone-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-stone-700">
                          Maior faturamento: {pico?.label}, com {brl(pico?.valor || 0)}.
                        </span>
                        {projecao > 0 && (
                          <span className="whitespace-nowrap font-medium text-stone-900">Projeção do período: {brl(projecao)}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <Empty icon={<Clock className="h-6 w-6" />} title="Sem receita no período" text="Os valores aparecem aqui conforme os atendimentos são faturados." />
                  )}
                </section>

                <div className="space-y-6">
                  <section className="rounded-xl border border-stone-300 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-semibold">Receita por categoria</h2>
                        <p className="text-sm text-stone-500">Distribuição percentual</p>
                      </div>
                      <MoreVertical className="h-4 w-4 shrink-0 text-stone-400" />
                    </div>
                    {mixView.length > 0 ? (
                      <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                        <Donut items={mixView} total={`R$ ${metrics?.faturamentoHoje || "0"}`} />
                        <ul className="w-full space-y-2.5 text-sm">
                          {mixView.map((item: any, idx: number) => (
                            <li key={idx} className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2 text-stone-700">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[idx % 4] }} />
                                <span className="truncate">{item.label}</span>
                              </span>
                              <span className="shrink-0 text-stone-500">
                                {item.pct} <span className="ml-1 font-medium text-stone-900">{item.val}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <Empty icon={<Search className="h-5 w-5" />} title="Sem categorias" text="Nenhuma receita categorizada no período." compact />
                    )}
                  </section>

                  <section className="rounded-xl border border-stone-300 bg-white p-4 sm:p-5">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                      <Gift className="h-4 w-4 text-teal-700" /> Aniversariantes e alertas
                    </h2>
                    <div className="space-y-2.5">
                      {metrics?.alerts && metrics.alerts.length > 0 ? (
                        metrics.alerts.map((item: any, idx: number) => <AlertItem key={idx} {...item} />)
                      ) : (
                        <p className="py-2 text-center text-sm text-stone-400">Sem alertas por agora.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAIS */}
      <Modal open={isNewSaleOpen} onClose={() => setIsNewSaleOpen(false)} title="Lançar nova venda" subtitle="Registre um contrato ou procedimento pago." confirm="Confirmar venda">
        <Field label="Paciente">
          <input type="text" placeholder="Buscar paciente..." className={inputCls} />
        </Field>
        <Field label="Procedimento ou plano">
          <select className={inputCls}>
            <option>Selecione...</option>
            <option>Harmonização Full Face</option>
            <option>Toxina Botulínica</option>
          </select>
        </Field>
        <Field label="Forma de pagamento">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Cartão de crédito", "PIX"].map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 p-3 text-sm font-medium text-stone-700 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
                <input type="radio" name="payment" className="accent-teal-700" /> {p}
              </label>
            ))}
          </div>
        </Field>
      </Modal>

      <Modal open={isNewAppointmentOpen} onClose={() => setIsNewAppointmentOpen(false)} title="Novo agendamento" subtitle="Reserve um horário na agenda." confirm="Reservar horário" wide>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Paciente">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input type="text" placeholder="Buscar por nome ou CPF..." className={`${inputCls} pl-9`} />
              </div>
            </Field>
          </div>
          <Field label="Profissional">
            <select className={inputCls}><option>Dra. Joana Oliveira</option></select>
          </Field>
          <Field label="Procedimento">
            <select className={inputCls}><option>Avaliação Estética</option><option>Harmonização Facial</option></select>
          </Field>
          <Field label="Data"><input type="date" className={inputCls} /></Field>
          <Field label="Horário"><input type="time" className={inputCls} /></Field>
        </div>
      </Modal>

      <Modal
        open={isEligibleOpen}
        onClose={() => setIsEligibleOpen(false)}
        title="Pacientes elegíveis"
        subtitle="Ciclo de toxina e bioestimuladores."
        confirm="Enviar WhatsApp"
        footerNote="Potencial: R$ 58.400,00"
      >
        <div className="custom-scrollbar max-h-[320px] space-y-2 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500"><User className="h-4 w-4" /></div>
                <div>
                  <h4 className="text-sm font-medium">Paciente VIP 0{i}</h4>
                  <span className="text-xs text-stone-500">Última visita há {120 + i * 10} dias</span>
                </div>
              </div>
              <button aria-label="Enviar mensagem" className="rounded-lg bg-teal-700 p-2 text-white hover:bg-teal-800"><MessageCircle className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Modal>
    </AppShell>
  );
}

// --- DADOS DOS GRÁFICOS ---
const parseMoney = (v: any): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "");
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
};
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compact = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${n}`;

// Usa metrics.fluxoHorario [{ label, valor, projetado? }]; se não vier, soma os valores da agenda por hora.
function buildFluxo(metrics: any): { label: string; valor: number; projetado?: number }[] {
  if (Array.isArray(metrics?.fluxoHorario) && metrics.fluxoHorario.length) {
    return metrics.fluxoHorario.map((p: any) => ({
      label: String(p.label ?? p.hora),
      valor: parseMoney(p.valor),
      projetado: p.projetado != null ? parseMoney(p.projetado) : undefined,
    }));
  }
  const byHour: Record<string, number> = {};
  (metrics?.agenda || []).forEach((a: any) => {
    const h = String(a.time || "").slice(0, 2);
    if (!/^\d{2}$/.test(h)) return;
    byHour[h] = (byHour[h] || 0) + parseMoney(a.val);
  });
  return Object.keys(byHour).sort().map((h) => ({ label: `${h}h`, valor: byHour[h] }));
}

function RevenueChart({ data }: { data: { label: string; valor: number; projetado?: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const H = 260, L = 64, R = 16, T = 16, B = 30;
  const max = Math.max(...data.map((d) => Math.max(d.valor, d.projetado ?? 0)), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const top = (Math.ceil((max / mag) * 2) / 2) * mag;
  const x = (i: number) => (data.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const path = (k: "valor" | "projetado") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y((d as any)[k] ?? 0)}`).join(" ");
  const step = Math.ceil(data.length / Math.max(2, Math.floor((W - L) / 56)));
  const colW = data.length > 1 ? (W - L - R) / (data.length - 1) : W - L - R;
  const h = hover != null ? data[hover] : null;

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} role="img" aria-label="Faturamento por horário" className="block">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (top * i) / 4;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e7e5e4" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#78716c">{compact(v)}</text>
            </g>
          );
        })}
        {data.some((d) => d.projetado != null) && (
          <path d={path("projetado")} fill="none" stroke="#a8a29e" strokeWidth="2" strokeDasharray="6 5" />
        )}
        <path d={`${path("valor")} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="#0f766e" opacity="0.08" />
        <path d={path("valor")} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.valor)} r={hover === i ? 5 : 3.5} fill="#fff" stroke="#0f766e" strokeWidth="2" />
            {i % step === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#78716c">{d.label}</text>
            )}
            <rect
              x={x(i) - colW / 2} y={T} width={Math.max(colW, 24)} height={H - T - B}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}
            />
          </g>
        ))}
        {h && hover != null && (
          <g pointerEvents="none">
            <rect x={Math.min(Math.max(x(hover) - 50, 4), W - 104)} y={Math.max(y(h.valor) - 48, 2)} width="100" height="38" rx="6" fill="#1c1917" />
            <text x={Math.min(Math.max(x(hover) - 50, 4), W - 104) + 50} y={Math.max(y(h.valor) - 48, 2) + 16} textAnchor="middle" fontSize="11" fill="#d6d3d1">{h.label}</text>
            <text x={Math.min(Math.max(x(hover) - 50, 4), W - 104) + 50} y={Math.max(y(h.valor) - 48, 2) + 31} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">{brl(h.valor)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// --- COMPONENTES ---
const inputCls =
  "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20";

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, confirm, footerNote, wide, children }: any) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 cursor-pointer bg-stone-900/40" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
          >
            <div className="flex items-start justify-between border-b border-stone-200 p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-stone-500">{subtitle}</p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>
            <div className="flex flex-col-reverse items-stretch gap-2 border-t border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
              {footerNote && <span className="text-sm text-stone-500 sm:mr-auto">{footerNote}</span>}
              <button onClick={onClose} className="h-9 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-200/60">Cancelar</button>
              <button className="h-9 rounded-lg bg-teal-700 px-5 text-sm font-medium text-white hover:bg-teal-800">{confirm}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Kpi({ title, value, suffix, trend, note, tone, extra, big }: any) {
  const trendCls =
    tone === "up" ? "text-emerald-700 bg-emerald-50" : tone === "down" ? "text-rose-700 bg-rose-50" : "text-amber-700 bg-amber-50";
  return (
    <div className="flex flex-col justify-between bg-white p-4 sm:p-5">
      <div>
        <span className="text-sm text-stone-500">{title}</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`font-semibold tracking-tight tabular-nums ${big ? "text-2xl sm:text-3xl" : "text-2xl"}`}>{value}</span>
          {suffix && <span className="text-sm text-stone-400">{suffix}</span>}
        </div>
        {extra}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {trend && <span className={`rounded px-1.5 py-0.5 font-medium ${trendCls}`}>{trend}</span>}
        {note && <span className="text-stone-500">{note}</span>}
      </div>
    </div>
  );
}

function Donut({ items, total }: any) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const vals = items.map((i: any) => parseFloat(String(i.pct).replace(",", ".")) || 0);
  const sum = vals.reduce((a: number, b: number) => a + b, 0) || 1;
  let acc = 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f5f5f4" strokeWidth="14" />
        {vals.map((v: number, i: number) => {
          const len = (v / sum) * c;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={r} fill="none"
              stroke={DONUT_COLORS[i % 4]}
              strokeWidth="14"
              strokeDasharray={`${Math.max(len - 1, 0)} ${c}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-stone-500">Total</span>
        <span className="text-base font-semibold leading-tight tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function Tab({ label, active }: any) {
  return (
    <button
      className={`-mb-px whitespace-nowrap border-b-2 pb-1 font-medium transition-colors ${
        active ? "border-teal-700 text-teal-700" : "border-transparent text-stone-500 hover:text-stone-800"
      }`}
    >
      {label}
    </button>
  );
}

function Empty({ icon, title, text, compact }: any) {
  return (
    <div className={`flex flex-col items-center gap-1 text-center text-stone-400 ${compact ? "py-3" : "py-12"}`}>
      {icon}
      <span className="mt-1 text-sm font-medium text-stone-600">{title}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function AgendaItem({ time, duration, status, statusColor, name, room, doc, procedure, val, buttonLabel, active }: any) {
  return (
    <div className={`flex gap-3 p-4 sm:gap-5 sm:px-5 ${active ? "bg-teal-50/60" : ""}`}>
      <div className="w-12 shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{time}</div>
        <div className="text-xs text-stone-400">{duration}</div>
      </div>
      <div className={`w-px shrink-0 ${active ? "bg-teal-700" : "bg-stone-200"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold">{name}</h4>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor}`}>{status}</span>
        </div>
        <p className="mt-1 truncate text-sm text-stone-600">{procedure}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-stone-500">
          <Stethoscope className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{doc}{val && ` · ${val}`}{room && ` · ${room}`}</span>
        </p>
      </div>
      <button className="h-8 self-start whitespace-nowrap rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
        {buttonLabel}
      </button>
    </div>
  );
}

function CRMItem({ name, status, statusColor, proc, follow, val, action }: any) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold">{name}</h4>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${statusColor}`}>{status}</span>
        </div>
        <p className="truncate text-sm text-stone-600">{proc}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400"><Clock className="h-3 w-3" /> {follow}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{val}</span>
        <button className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100">{action}</button>
      </div>
    </div>
  );
}

function AlertItem({ iconName, color, title, sub, action, noBtn }: any) {
  const icons: any = { Gift, Clock, AlertTriangle, Bell };
  const Icon = icons[iconName] || Bell;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium">{title}</h4>
          <p className="truncate text-xs text-stone-500">{sub}</p>
        </div>
      </div>
      {!noBtn ? (
        <button className="shrink-0 whitespace-nowrap rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50">{action}</button>
      ) : (
        <span className="shrink-0 whitespace-nowrap rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">{action}</span>
      )}
    </div>
  );
}
