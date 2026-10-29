"use client";

import React, { useMemo, useState } from "react";
import { Download, Stethoscope, Trophy, Gem, TrendingDown, Landmark } from "lucide-react";
import { card, labelCls, btnLight, EmptyState } from "../../prontuarios/lib/api";
import { brl, pct, dm, dmy, downloadCsv, Th, CashflowChart, Legend, Delta, type Summary } from "./fin";

/* ============================================================
 *  PROCEDIMENTOS FECHADOS NO PERÍODO
 * ============================================================ */
type SortKey = "name" | "qty" | "revenue" | "ticket" | "profit" | "margin";

export function ProceduresTab({ s, label }: { s: Summary | null; label: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });

  const rows = useMemo(() => {
    type ProcedureRow = {
      name: string;
      qty: number;
      revenue: number;
      cost: number;
      profit: number;
      ticket: number;
      margin: number | null;
      share: number;
    };

    const total = s?.current.revenue || 1;
    const list: ProcedureRow[] = (s?.byProcedure ?? []).map((r: { name: string; qty: number; revenue: number; cost: number; profit: number; }) => ({
      ...r,
      ticket: r.qty ? r.revenue / r.qty : 0,
      margin: r.revenue > 0 && r.cost > 0 ? r.profit / r.revenue : null,
      share: r.revenue / total,
    }));
    const d = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * d;
      return (((a[sort.key] ?? -1) as number) - ((b[sort.key] ?? -1) as number)) * d;
    });
  }, [s, sort]);

  if (s && rows.length === 0)
    return <EmptyState icon={<Stethoscope className="w-6 h-6" />} title="Nenhum procedimento fechado" text={`Não há vendas registradas em ${label.toLowerCase()}. Fature os atendimentos concluídos para ver o desempenho por procedimento.`} />;

  const t = rows.reduce((a: { qty: any; revenue: any; cost: any; profit: any; }, r: { qty: any; revenue: any; cost: any; profit: any; }) => ({ qty: a.qty + r.qty, revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { qty: 0, revenue: 0, cost: 0, profit: 0 });
  const best = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const profitable = [...rows].sort((a, b) => b.profit - a.profit)[0];
  const weak = [...rows]
    .filter((r) => r.margin !== null)
    .sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))[0];
  const toggle = (key: SortKey) => setSort((x) => (x.key === key ? { key, dir: x.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  const insight = (icon: React.ReactNode, title: string, name?: string, value?: string, tone = "text-slate-900") => (
    <div className={`${card} p-5 flex items-start gap-4`}>
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">{icon}</div>
      <div className="min-w-0"><p className={labelCls}>{title}</p><p className="text-[14px] font-black text-slate-900 truncate mt-1">{name ?? "—"}</p><p className={`text-[13px] font-bold tabular-nums ${tone}`}>{value ?? ""}</p></div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0f172a] rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[118px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Procedimentos realizados</span>
          <div>
            <p className="text-[26px] font-black text-white leading-none tabular-nums">{t.qty}</p>
            <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-2">{s && <><span>{s.appointmentsDone} atendimentos concluídos</span><span className="[&>span]:!bg-white/10 [&>span]:!text-white"><Delta cur={s.appointmentsDone} prev={s.appointmentsDonePrev} /></span></>}</p>
          </div>
        </div>
        {insight(<Trophy className="w-5 h-5" />, "Maior receita", best?.name, best && `${brl(best.revenue)} • ${best.qty}x`)}
        {insight(<Gem className="w-5 h-5" />, "Maior lucro", profitable?.name, profitable && brl(profitable.profit), "text-emerald-600")}
        {insight(<TrendingDown className="w-5 h-5" />, "Menor margem", weak?.name, weak && pct(weak.margin!, 0), "text-amber-600")}
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div><h3 className="text-[15px] font-black text-slate-900 tracking-tight">Desempenho por procedimento</h3><p className="text-[12px] font-medium text-slate-500 mt-0.5">Receita líquida (com desconto rateado) e lucro sobre custo de insumos.</p></div>
          <button className={btnLight} onClick={() => downloadCsv("procedimentos.csv", [["Procedimento", "Qtd", "Receita", "Ticket médio", "Custo", "Lucro", "Margem (%)"], ...rows.map((r: { name: any; qty: any; revenue: number; ticket: number; cost: number; profit: number; margin: number | null; }) => [r.name, r.qty, r.revenue.toFixed(2), r.ticket.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2), r.margin === null ? "" : (r.margin * 100).toFixed(1)])])}><Download className="w-4 h-4 text-slate-400" /> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className="border-b border-slate-200 bg-slate-50/60">
              <Th active={sort.key === "name"} dir={sort.dir} onClick={() => toggle("name")}>Procedimento</Th>
              <Th right active={sort.key === "qty"} dir={sort.dir} onClick={() => toggle("qty")}>Qtd.</Th>
              <Th right active={sort.key === "revenue"} dir={sort.dir} onClick={() => toggle("revenue")}>Receita</Th>
              <Th>% da receita</Th>
              <Th right active={sort.key === "ticket"} dir={sort.dir} onClick={() => toggle("ticket")}>Ticket</Th>
              <Th right>Custo</Th>
              <Th right active={sort.key === "profit"} dir={sort.dir} onClick={() => toggle("profit")}>Lucro</Th>
              <Th active={sort.key === "margin"} dir={sort.dir} onClick={() => toggle("margin")}>Margem</Th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!s && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>)}
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold text-slate-600 tabular-nums">{r.qty}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-black text-slate-900 tabular-nums">{brl(r.revenue)}</td>
                  <td className="px-4 py-3 w-[150px]"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, r.share * 100)}%` }} /></div><span className="text-[11px] font-bold text-slate-500 tabular-nums w-9 text-right">{pct(r.share, 0)}</span></div></td>
                  <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-600 tabular-nums">{brl(r.ticket)}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-400 tabular-nums">{r.cost > 0 ? brl(r.cost) : "—"}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-black tabular-nums text-emerald-600">{brl(r.profit)}</td>
                  <td className="px-4 py-3 w-[130px]">{r.margin === null ? <span className="text-[11px] font-medium text-slate-400">Sem custo</span> : <div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${r.margin >= 0.6 ? "bg-emerald-500" : r.margin >= 0.3 ? "bg-blue-600" : "bg-amber-500"}`} style={{ width: `${Math.max(0, Math.min(100, r.margin * 100))}%` }} /></div><span className="text-[11px] font-bold text-slate-700 tabular-nums w-9 text-right">{pct(r.margin, 0)}</span></div>}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot><tr className="border-t border-slate-200 bg-slate-50/60">
                <td className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total</td>
                <td className="px-4 py-3 text-right text-[13px] font-black tabular-nums">{t.qty}</td>
                <td className="px-4 py-3 text-right text-[14px] font-black tabular-nums">{brl(t.revenue)}</td>
                <td /><td className="px-4 py-3 text-right text-[13px] font-bold text-slate-600 tabular-nums">{brl(t.qty ? t.revenue / t.qty : 0)}</td>
                <td className="px-4 py-3 text-right text-[13px] font-bold text-slate-400 tabular-nums">{brl(t.cost)}</td>
                <td className="px-4 py-3 text-right text-[14px] font-black tabular-nums text-emerald-600">{brl(t.profit)}</td><td />
              </tr></tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
 *  FLUXO DE CAIXA
 * ============================================================ */
export function CashflowTab({ s }: { s: Summary | null }) {
  const [all, setAll] = useState(false);

  type CashflowDay = {
    date: any;
    in: number;
    out: number;
    inPending: number;
    outPending: number;
    net: number;
    balance: number;
    active: boolean;
  };

  const days = useMemo<CashflowDay[]>(() => {
    if (!s) return [];
    let bal = s.openingBalance;
    return s.series.map((d: { date?: any; in: number; out: number; inPending: any; outPending: any; }) => {
      bal += d.in - d.out;
      return {
        ...d,
        date: d.date ?? null,
        inPending: Number(d.inPending ?? 0),
        outPending: Number(d.outPending ?? 0),
        net: d.in - d.out,
        balance: bal,
        active: d.in + d.out + Number(d.inPending ?? 0) + Number(d.outPending ?? 0) > 0,
      } satisfies CashflowDay;
    });
  }, [s]);
  const shown = all ? days : days.filter((d: { active: any; }) => d.active);
  const tin = days.reduce((a: any, d: { in: any; }) => a + d.in, 0), tout = days.reduce((a: any, d: { out: any; }) => a + d.out, 0);
  const pin = days.reduce((a: any, d: { inPending: any; }) => a + d.inPending, 0), pout = days.reduce((a: any, d: { outPending: any; }) => a + d.outPending, 0);
  const closing = (s?.openingBalance ?? 0) + tin - tout;

  const stat = (l: string, v: number, tone = "text-slate-900", dark = false) => (
    <div className={`${dark ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200/60"} border rounded-2xl px-5 py-4 shadow-sm`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-400"}`}>{l}</p>
      <p className={`text-[20px] font-black tabular-nums mt-1 ${dark ? "text-white" : tone}`}>{brl(v)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-4">
        {stat("Saldo inicial", s?.openingBalance ?? 0)}
        {stat("Entradas", tin, "text-emerald-600")}
        {stat("Saídas", tout, "text-rose-600")}
        {stat("Previsto líquido", pin - pout, pin - pout >= 0 ? "text-blue-600" : "text-rose-600")}
        {stat("Saldo final", closing, "", true)}
      </div>

      <section className={`${card} p-6`}>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div><h3 className="text-[15px] font-black text-slate-900 tracking-tight">Evolução do caixa</h3><p className="text-[12px] font-medium text-slate-500 mt-0.5">O saldo acumulado parte do caixa existente antes do período.</p></div>
          <Legend items={[{ color: "#2563eb", label: "Entradas" }, { color: "#f43f5e", label: "Saídas" }, { color: "#94a3b8", label: "Previsto", faded: true }, { color: "#0f172a", label: "Saldo", line: true }]} />
        </div>
        {s ? <CashflowChart series={s.series} openingBalance={s.openingBalance} /> : <div className="h-[280px] rounded-xl bg-slate-50 animate-pulse" />}
      </section>

      <section className={`${card} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-black text-slate-900 tracking-tight">Movimento diário</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setAll((v) => !v)} className={btnLight}>{all ? "Só dias com movimento" : "Mostrar todos os dias"}</button>
            <button className={btnLight} disabled={!days.length} onClick={() => downloadCsv("fluxo-de-caixa.csv", [["Data", "Entradas", "Saídas", "Resultado", "Saldo", "A receber", "A pagar"], ...days.map((d: { date: any; in: number; out: number; net: number; balance: number; inPending: number; outPending: number; }) => [dmy(d.date), d.in.toFixed(2), d.out.toFixed(2), d.net.toFixed(2), d.balance.toFixed(2), d.inPending.toFixed(2), d.outPending.toFixed(2)])])}><Download className="w-4 h-4 text-slate-400" /> CSV</button>
          </div>
        </div>
        {s && shown.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center"><Landmark className="w-6 h-6 text-slate-300 mb-2" /><p className="text-[13px] font-bold text-slate-600">Sem movimentação no período</p></div>
        ) : (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
            <table className="w-full min-w-[820px]">
              <thead className="sticky top-0 bg-slate-50 z-10"><tr className="border-b border-slate-200"><Th>Data</Th><Th right>Entradas</Th><Th right>Saídas</Th><Th right>Resultado</Th><Th right>Saldo</Th><Th right>A receber</Th><Th right>A pagar</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((d: { date: React.Key | null | undefined; active: any; in: any; out: any; net: number; balance: number; inPending: any; outPending: any; }) => {
                  const dateStr = d.date == null ? "" : String(d.date);
                  const dayLabel = dateStr ? ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${dateStr}T12:00:00`).getDay()] : "—";

                  return (
                    <tr key={d.date} className={`hover:bg-slate-50/70 transition-colors ${d.active ? "" : "text-slate-300"}`}>
                      <td className="px-4 py-2.5 text-[13px] font-semibold tabular-nums">{dateStr ? dm(dateStr) : "—"} <span className="text-slate-400 font-medium">{dayLabel}</span></td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-emerald-600">{d.in ? brl(d.in) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-rose-600">{d.out ? brl(d.out) : "—"}</td>
                      <td className={`px-4 py-2.5 text-right text-[13px] font-black tabular-nums ${d.net < 0 ? "text-rose-600" : "text-slate-900"}`}>{d.in || d.out ? brl(d.net) : "—"}</td>
                      <td className={`px-4 py-2.5 text-right text-[13px] font-black tabular-nums ${d.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>{brl(d.balance)}</td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-medium tabular-nums text-slate-500">{d.inPending ? brl(d.inPending) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-medium tabular-nums text-slate-500">{d.outPending ? brl(d.outPending) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}