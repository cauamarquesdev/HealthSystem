"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Wallet, Clock, ArrowDownRight, Banknote, Target, Pencil, Receipt, CalendarClock } from "lucide-react";
import { api, card, labelCls, inputCls, btnDark, btnLight, Dialog } from "../../prontuarios/lib/api";
import {
  brl, brlShort, pct, dm, dmy, iso, METHOD_LABEL, PALETTE,
  Metric, Delta, CashflowChart, Legend, Donut, Ring, StatusPill,
  type Summary, type Billable, type Mode,
} from "./fin";

const GOAL_KEY = "fin:monthly-goal";

export default function OverviewTab({ s, loading, mode, onBill, goTab }: {
  s: Summary | null;
  loading: boolean;
  mode: Mode;
  onBill: (b: Billable) => void;
  goTab: (t: "vendas" | "lancamentos" | "procedimentos" | "caixa") => void;
}) {
  const [goal, setGoal] = useState(0);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [billable, setBillable] = useState<Billable[]>([]);

  useEffect(() => {
    try { setGoal(Number(localStorage.getItem(GOAL_KEY)) || 0); } catch {}
  }, []);
  useEffect(() => {
    if (!s?.billable.count) { setBillable([]); return; }
    api<Billable[]>("/finance/billable").then(setBillable).catch(() => setBillable([]));
  }, [s?.billable.count, s?.billable.total]);

  const c = s?.current, p = s?.prev;
  const saveGoal = () => {
    const v = Number(goalInput.replace(/\./g, "").replace(",", ".")) || 0;
    setGoal(v);
    try { localStorage.setItem(GOAL_KEY, String(v)); } catch {}
    setEditGoal(false);
  };

  const topProcs = (s?.byProcedure ?? []).slice(0, 6);
  const maxProc = Math.max(1, ...topProcs.map((r: { revenue: any; }) => r.revenue));
  const payTotal = (s?.byPayment ?? []).reduce((a: any, b: { total: any; }) => a + b.total, 0);
  const payData: { label: string; value: number; color: string }[] = (s?.byPayment ?? []).map((x: { method: string | number; total: any; }, i: number) => ({
    label: String(METHOD_LABEL[x.method] ?? x.method),
    value: Number(x.total) || 0,
    color: String(PALETTE[i % PALETTE.length]),
  }));
  const progress = goal > 0 && c ? c.revenue / goal : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Metric loading={loading} title="Faturamento" icon={<TrendingUp className="w-4 h-4" />} value={brl(c?.revenue ?? 0)}
          delta={c && p && <Delta cur={c.revenue} prev={p.revenue} />}
          sub={c ? `${c.salesCount} venda${c.salesCount === 1 ? "" : "s"} • ticket ${brl(c.ticket)}` : ""} />
        <Metric loading={loading} title="Recebido" icon={<Wallet className="w-4 h-4" />} value={brl(c?.received ?? 0)}
          delta={c && p && <Delta cur={c.received} prev={p.received} />}
          sub={c && c.revenue > 0 ? `${pct(Math.min(c.received / c.revenue, 9.99), 0)} do faturado` : "Entradas pagas no período"} />
        <Metric loading={loading} title="A receber" icon={<Clock className="w-4 h-4" />} value={brl(c?.receivable ?? 0)}
          sub={s && s.overdue.receivable.count > 0 ? `${s.overdue.receivable.count} em atraso • ${brl(s.overdue.receivable.total)}` : "Nenhum atraso"}
          subTone={s && s.overdue.receivable.count > 0 ? "rose" : undefined} />
        <Metric loading={loading} title="Despesas" icon={<ArrowDownRight className="w-4 h-4" />} value={brl(c?.expenses ?? 0)}
          delta={c && p && <Delta cur={c.expenses} prev={p.expenses} inverse />}
          sub={c ? `A pagar: ${brl(c.payable)}` : ""} />
        <Metric dark loading={loading} title="Resultado" icon={<Banknote className="w-4 h-4" />} value={brl(c?.result ?? 0)}
          delta={c && p && <span className="[&>span]:!bg-white/10 [&>span]:!text-white"><Delta cur={c.result} prev={p.result} /></span>}
          sub={c && c.received > 0 ? `Margem de caixa ${pct(c.result / c.received)}` : "Recebido − despesas pagas"} />
      </div>

      {/* Fluxo + meta */}
      <div className="grid grid-cols-3 gap-5">
        <section className={`${card} p-6 col-span-2`}>
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Fluxo de caixa</h3>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Entradas e saídas realizadas; as barras claras são valores previstos.</p>
            </div>
            <Legend items={[{ color: "#2563eb", label: "Entradas" }, { color: "#f43f5e", label: "Saídas" }, { color: "#94a3b8", label: "Previsto", faded: true }, { color: "#0f172a", label: "Saldo", line: true }]} />
          </div>
          {s ? <CashflowChart series={s.series} openingBalance={s.openingBalance} /> : <div className="h-[280px] rounded-xl bg-slate-50 animate-pulse" />}
        </section>

        <section className={`${card} p-6 flex flex-col`}>
          {mode === "month" ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Meta do mês</h3>
                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">Faturamento × objetivo</p>
                </div>
                <button onClick={() => { setGoalInput(goal ? String(goal).replace(".", ",") : ""); setEditGoal(true); }} aria-label="Editar meta" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {goal > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-2">
                  <Ring value={progress} label={pct(progress, 0)} sub="DA META" />
                  <p className="text-[13px] font-bold text-slate-900 tabular-nums">{brl(c?.revenue ?? 0)} <span className="text-slate-400 font-medium">de {brl(goal)}</span></p>
                  <p className="text-[12px] font-medium text-slate-500">{progress >= 1 ? "Meta superada" : `Faltam ${brl(goal - (c?.revenue ?? 0))}`}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center"><Target className="w-5 h-5 text-blue-600" /></div>
                  <p className="text-[13px] font-medium text-slate-500 max-w-[200px]">Defina uma meta mensal para acompanhar o ritmo do faturamento.</p>
                  <button onClick={() => { setGoalInput(""); setEditGoal(true); }} className={btnDark}>Definir meta</button>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Por profissional</h3>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5 mb-4">Faturamento do período</p>
              <div className="space-y-3.5 flex-1">
                {(s?.byProfessional ?? []).slice(0, 6).map((r: { name: string; revenue: number; count: number }) => (
                  <div key={String(r.name)}>
                    <div className="flex justify-between text-[12px] mb-1"><span className="font-bold text-slate-800 truncate">{r.name}</span><span className="font-black tabular-nums">{brl(r.revenue)}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(r.revenue / Math.max(1, s!.byProfessional[0].revenue)) * 100}%` }} /></div>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">{r.count} venda{r.count === 1 ? "" : "s"}</p>
                  </div>
                ))}
                {s && s.byProfessional.length === 0 && <p className="text-[13px] font-medium text-slate-400 text-center pt-10">Sem vendas no período.</p>}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Procedimentos, pagamentos, vencimentos */}
      <div className="grid grid-cols-3 gap-5">
        <section className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Procedimentos fechados</h3>
            <button onClick={() => goTab("procedimentos")} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">Ver todos</button>
          </div>
          <div className="space-y-3.5">
            {topProcs.map((r: { key: React.Key | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; revenue: number; qty: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, i: number) => (
              <div key={String(r.key)}>
                <div className="flex justify-between gap-3 text-[12px] mb-1">
                  <span className="font-bold text-slate-800 truncate">{r.name}</span>
                  <span className="font-black tabular-nums shrink-0">{brl(r.revenue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.revenue / maxProc) * 100}%`, background: i === 0 ? "#2563eb" : "#93c5fd" }} /></div>
                <p className="text-[11px] font-medium text-slate-400 mt-1">{r.qty} realizado{r.qty === 1 ? "" : "s"}</p>
              </div>
            ))}
            {s && topProcs.length === 0 && <p className="text-[13px] font-medium text-slate-400 text-center py-10">Nenhuma venda de procedimento no período.</p>}
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Formas de pagamento</h3>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5 mb-4">Entradas recebidas no período</p>
          {payData.length ? (
            <div className="flex items-center gap-4">
              <Donut data={payData} center={`R$ ${brlShort(payTotal)}`} sub="RECEBIDO" />
              <ul className="space-y-2 min-w-0 flex-1">
                {payData.map((d) => (
                  <li key={String(d.label)} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                    <span className="font-bold text-slate-700 truncate flex-1">{d.label}</span>
                    <span className="font-black text-slate-900 tabular-nums">{pct(d.value / payTotal, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] font-medium text-slate-400 text-center py-10">Sem recebimentos no período.</p>
          )}
        </section>

        <section className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Próximos vencimentos</h3>
            <button onClick={() => goTab("lancamentos")} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">Ver todos</button>
          </div>
          <ul className="divide-y divide-slate-100 -my-1.5">
            {(s?.upcoming ?? []).slice(0, 6).map((t: { id: React.Key | null | undefined; dueDate: string | number | Date; description: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; type: string; amount: any; }) => (
              <li key={String(t.id)} className="py-2.5 flex items-center gap-3">
                <div className="w-10 shrink-0 text-center">
                  <p className="text-[13px] font-black text-slate-900 leading-none tabular-nums">{dm(iso(new Date(t.dueDate))).slice(0, 2)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][new Date(t.dueDate).getMonth()]}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{t.description}</p>
                  <div className="mt-0.5"><StatusPill t={t as any} /></div>
                </div>
                <span className={`text-[12px] font-black tabular-nums shrink-0 ${t.type === "RECEITA" ? "text-emerald-600" : "text-rose-600"}`}>{t.type === "RECEITA" ? "+" : "−"}{brl(t.amount)}</span>
              </li>
            ))}
            {s && s.upcoming.length === 0 && <li className="text-[13px] font-medium text-slate-400 text-center py-10">Nada pendente.</li>}
          </ul>
        </section>
      </div>

      {/* A faturar */}
      {billable.length > 0 && (
        <section className={`${card} overflow-hidden border-amber-200`}>
          <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-100 flex items-center gap-3">
            <Receipt className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <h3 className="text-[14px] font-black text-amber-950">Atendimentos concluídos aguardando faturamento</h3>
              <p className="text-[12px] font-medium text-amber-800/80">{s!.billable.count} atendimento{s!.billable.count === 1 ? "" : "s"} • {brl(s!.billable.total)} ainda não viraram venda.</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {billable.slice(0, 4).map((b) => (
              <li key={b.id} className="px-6 py-3 flex items-center gap-4">
                <CalendarClock className="w-4 h-4 text-slate-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 truncate">{b.patient.name}</p>
                  <p className="text-[12px] font-medium text-slate-500 truncate">{dmy(b.date)} • {b.procedure || "Atendimento"}</p>
                </div>
                <span className="text-[13px] font-black tabular-nums">{brl(b.total)}</span>
                <button onClick={() => onBill(b)} className={btnDark}>Faturar</button>
              </li>
            ))}
          </ul>
          {billable.length > 4 && <button onClick={() => goTab("vendas")} className="w-full py-3 text-[12px] font-bold text-blue-600 hover:bg-slate-50 border-t border-slate-100 transition-colors">Ver os {billable.length} atendimentos</button>}
        </section>
      )}

      <Dialog open={editGoal} onClose={() => setEditGoal(false)} title="Meta mensal de faturamento" icon={<Target className="w-5 h-5 text-slate-500" />} maxWidth={420}
        footer={<><button onClick={() => setEditGoal(false)} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button><button onClick={saveGoal} className={btnDark}>Salvar meta</button></>}>
        <label className={labelCls}>Valor da meta</label>
        <div className="relative mt-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">R$</span>
          <input autoFocus inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value.replace(/[^\d,]/g, ""))} onKeyDown={(e) => e.key === "Enter" && saveGoal()} placeholder="0,00" className={`${inputCls} pl-10 tabular-nums`} />
        </div>
        <p className="text-[11px] font-medium text-slate-400 mt-2">A meta fica salva neste navegador. Deixe em branco para remover.</p>
      </Dialog>
    </div>
  );
}