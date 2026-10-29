"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

/* ============================================================
 *  TIPOS (espelham as respostas de /finance/*)
 * ============================================================ */
export interface Kpis {
  revenue: number;
  salesCount: number;
  ticket: number;
  received: number;
  expenses: number;
  result: number;
  receivable: number;
  payable: number;
  procedureMargin: number;
}
export interface SeriesPoint { date: string; in: number; out: number; inPending: number; outPending: number }
export interface ProcRow { key: string; name: string; qty: number; revenue: number; cost: number; profit: number }
export interface Tx {
  id: string;
  type: "RECEITA" | "DESPESA";
  description: string;
  category: string;
  counterparty: string | null;
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: "PENDENTE" | "PAGO" | "CANCELADO";
  overdue: boolean;
  paymentMethod: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  origin: "VENDA" | "MANUAL";
  saleId: string | null;
  patientName: string | null;
}
export interface Sale {
  id: string;
  date: string;
  status: "PAGO" | "PENDENTE" | "CANCELADO";
  method: string | null;
  total: number;
  discount: number;
  notes: string | null;
  appointmentId: string | null;
  patient: { id: string; name: string };
  professional: string;
  items: { id: string; name: string; quantity: number; price: number; cost: number }[];
  installments: number;
  paidAmount: number;
  pendingAmount: number;
  transactions: Tx[];
}
export interface Billable {
  id: string;
  date: string;
  patient: { id: string; name: string };
  procedure: string;
  items: { procedureId: string | null; name: string; quantity: number; price: number }[];
  discount: number;
  total: number;
}
export interface Summary {
  period: { from: string; to: string };
  previous: { from: string; to: string };
  current: Kpis;
  prev: Kpis;
  appointmentsDone: number;
  appointmentsDonePrev: number;
  openingBalance: number;
  overdue: { receivable: { total: number; count: number }; payable: { total: number; count: number } };
  series: SeriesPoint[];
  byProcedure: ProcRow[];
  byPayment: { method: string; total: number }[];
  byProfessional: { name: string; revenue: number; count: number }[];
  upcoming: Tx[];
  billable: { count: number; total: number };
}

/* ============================================================
 *  FORMATAÇÃO
 * ============================================================ */
export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0).replace(/\u00a0/g, " ");
export const brlShort = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1).replace(".", ",")} mi` : a >= 1e4 ? `${Math.round(a / 1e3)} mil` : a >= 1e3 ? `${(a / 1e3).toFixed(1).replace(".", ",")} mil` : String(Math.round(a));
  return `${n < 0 ? "-" : ""}${s}`;
};
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d).replace(".", ",")}%`;
const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => iso(new Date());
export const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
export const dmy = (v: string) => (v.length > 10 ? iso(new Date(v)) : v).split("-").reverse().join("/");
export const shortMonth = (day: string) => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(day.slice(5, 7)) - 1];

export const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
  DINHEIRO: "Dinheiro",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  OUTRO: "Outro",
};
export const METHODS = Object.keys(METHOD_LABEL);
export const PALETTE = ["#2563eb", "#0f172a", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#f43f5e"];

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================
 *  PERÍODO
 * ============================================================ */
export type Mode = "month" | "quarter" | "year" | "30d";
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function periodOf(mode: Mode, anchor: Date) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  if (mode === "month") return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)), label: `${MONTHS[m]} de ${y}` };
  if (mode === "quarter") {
    const q = Math.floor(m / 3);
    return { from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)), label: `${q + 1}º trimestre de ${y}` };
  }
  if (mode === "year") return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return { from: iso(from), to: iso(to), label: "Últimos 30 dias" };
}
export function shiftAnchor(mode: Mode, anchor: Date, dir: number) {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  if (mode === "month") d.setMonth(d.getMonth() + dir);
  else if (mode === "quarter") d.setMonth(d.getMonth() + dir * 3);
  else if (mode === "year") d.setFullYear(d.getFullYear() + dir);
  return d;
}

/* ============================================================
 *  COMPONENTES
 * ============================================================ */
export function Delta({ cur, prev, inverse }: { cur: number; prev: number; inverse?: boolean }) {
  if (!prev && !cur) return <span className="text-[10px] font-bold text-slate-400">—</span>;
  if (!prev) return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">novo</span>;
  const d = (cur - prev) / Math.abs(prev);
  const good = inverse ? d <= 0 : d >= 0;
  const Icon = d >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black rounded px-1.5 py-0.5 tabular-nums ${Math.abs(d) < 0.0005 ? "text-slate-500 bg-slate-100" : good ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
      <Icon className="w-2.5 h-2.5" strokeWidth={3} /> {Math.abs(d * 100).toFixed(1).replace(".", ",")}%
    </span>
  );
}

export function Metric({
  title,
  value,
  sub,
  icon,
  delta,
  loading,
  dark,
  subTone,
}: {
  title: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  delta?: React.ReactNode;
  loading?: boolean;
  dark?: boolean;
  subTone?: "rose";
}) {
  return (
    <div className={`${dark ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200/60"} border rounded-2xl p-5 flex flex-col justify-between shadow-sm min-w-0 h-[118px]`}>
      <div className="flex justify-between items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${dark ? "text-slate-400" : "text-slate-400"}`}>{title}</span>
        <div className={`shrink-0 ${dark ? "text-blue-400" : "text-slate-400"}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className={`h-6 w-28 rounded ${dark ? "bg-slate-700" : "bg-slate-100"}`} />
          <div className={`h-2.5 w-32 rounded ${dark ? "bg-slate-700" : "bg-slate-100"}`} />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[22px] font-black leading-none truncate tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>{value}</span>
            {delta}
          </div>
          <p className={`text-[11px] font-medium mt-1.5 truncate ${subTone === "rose" ? "text-rose-600 font-bold" : dark ? "text-slate-400" : "text-slate-400"}`}>{sub}</p>
        </div>
      )}
    </div>
  );
}

export function StatusPill({ t }: { t: Pick<Tx, "status" | "overdue" | "paymentDate"> }) {
  if (t.status === "PAGO")
    return <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">Pago {t.paymentDate ? dm(iso(new Date(t.paymentDate))) : ""}</span>;
  if (t.status === "CANCELADO")
    return <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">Cancelado</span>;
  if (t.overdue)
    return <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">Atrasado</span>;
  return <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Pendente</span>;
}

export function Th({ children, right, onClick, active, dir }: { children?: React.ReactNode; right?: boolean; onClick?: () => void; active?: boolean; dir?: "asc" | "desc" }) {
  const inner = (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${active ? "text-slate-900" : "text-slate-400"}`}>
      {children}
      {active && (dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </span>
  );
  return <th className={`py-3 px-4 font-normal ${right ? "text-right" : "text-left"}`}>{onClick ? <button onClick={onClick} className="hover:text-slate-900">{inner}</button> : inner}</th>;
}

/* ---------- Fluxo de caixa ---------- */
interface Bucket { label: string; range: string; in: number; out: number; inPending: number; outPending: number; balance: number }

function bucketize(series: SeriesPoint[], opening: number): Bucket[] {
  const mode = series.length > 92 ? "month" : series.length > 31 ? "week" : "day";
  const groups: SeriesPoint[][] = [];
  if (mode === "day") series.forEach((s) => groups.push([s]));
  else if (mode === "week") for (let i = 0; i < series.length; i += 7) groups.push(series.slice(i, i + 7));
  else {
    const map = new Map<string, SeriesPoint[]>();
    series.forEach((s) => map.set(s.date.slice(0, 7), [...(map.get(s.date.slice(0, 7)) ?? []), s]));
    map.forEach((g) => groups.push(g));
  }
  let bal = opening;
  return groups.map((g) => {
    const sum = (k: keyof SeriesPoint) => g.reduce((a, s) => a + (s[k] as number), 0);
    bal += sum("in") - sum("out");
    const a = g[0].date;
    const b = g[g.length - 1].date;
    return {
      label: mode === "day" ? a.slice(8, 10) : mode === "week" ? dm(a) : shortMonth(a),
      range: a === b ? dmy(a) : `${dmy(a)} – ${dmy(b)}`,
      in: sum("in"), out: sum("out"), inPending: sum("inPending"), outPending: sum("outPending"), balance: bal,
    };
  });
}

export function CashflowChart({ series, openingBalance }: { series: SeriesPoint[]; openingBalance: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = bucketize(series, openingBalance);
  const W = 840, H = 280, L = 52, R = 14, T = 16, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const peak = Math.max(1, ...data.map((b) => Math.max(b.in + b.inPending, b.out + b.outPending)));
  const mag = Math.pow(10, Math.floor(Math.log10(peak)));
  const max = Math.ceil(peak / (mag / 2)) * (mag / 2);
  const y = (v: number) => T + ih - (v / max) * ih;
  const step = iw / data.length;
  const bw = Math.max(3, Math.min(16, step * 0.32));
  const bals = data.map((b) => b.balance);
  const minB = Math.min(...bals, 0), maxB = Math.max(...bals, 1);
  const by = (v: number) => T + ih - ((v - minB) / (maxB - minB || 1)) * ih * 0.86 - ih * 0.04;
  const line = data.map((b, i) => `${i ? "L" : "M"}${(L + step * (i + 0.5)).toFixed(1)} ${by(b.balance).toFixed(1)}`).join(" ");
  const every = Math.ceil(data.length / 16);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de fluxo de caixa" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? "" : "3 5"} />
            <text x={L - 8} y={y(max * t) + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#94a3b8">{brlShort(max * t)}</text>
          </g>
        ))}
        {data.map((b, i) => {
          const cx = L + step * (i + 0.5);
          return (
            <g key={i}>
              {hover === i && <rect x={cx - step / 2} y={T} width={step} height={ih} fill="#f1f5f9" />}
              <rect x={cx - bw - 1} y={y(b.in + b.inPending)} width={bw} height={Math.max(0, y(b.in) - y(b.in + b.inPending))} rx="2" fill="#2563eb" opacity="0.28" />
              <rect x={cx - bw - 1} y={y(b.in)} width={bw} height={Math.max(0, T + ih - y(b.in))} rx="2" fill="#2563eb" />
              <rect x={cx + 1} y={y(b.out + b.outPending)} width={bw} height={Math.max(0, y(b.out) - y(b.out + b.outPending))} rx="2" fill="#f43f5e" opacity="0.28" />
              <rect x={cx + 1} y={y(b.out)} width={bw} height={Math.max(0, T + ih - y(b.out))} rx="2" fill="#f43f5e" />
              {i % every === 0 && <text x={cx} y={H - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8">{b.label}</text>}
              <rect x={cx - step / 2} y={T} width={step} height={ih + B} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
        <path d={line} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <circle cx={L + step * (hover + 0.5)} cy={by(data[hover].balance)} r="4" fill="#0f172a" stroke="#fff" strokeWidth="2" />}
      </svg>
      {h && (
        <div className="absolute top-2 pointer-events-none z-10 bg-[#0B0F19] text-white rounded-xl px-3.5 py-2.5 shadow-xl text-[11px] min-w-[170px]" style={{ left: `${Math.min(84, Math.max(16, ((L + step * (hover! + 0.5)) / W) * 100))}%`, transform: "translateX(-50%)" }}>
          <p className="font-bold text-slate-300 mb-1.5">{h.range}</p>
          <p className="flex justify-between gap-4"><span className="text-slate-400">Entradas</span><b className="tabular-nums">{brl(h.in)}</b></p>
          <p className="flex justify-between gap-4"><span className="text-slate-400">Saídas</span><b className="tabular-nums">{brl(h.out)}</b></p>
          {(h.inPending > 0 || h.outPending > 0) && <p className="flex justify-between gap-4"><span className="text-slate-400">Previsto</span><b className="tabular-nums">{brl(h.inPending - h.outPending)}</b></p>}
          <p className="flex justify-between gap-4 border-t border-slate-700 mt-1.5 pt-1.5"><span className="text-slate-400">Saldo</span><b className="tabular-nums">{brl(h.balance)}</b></p>
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; line?: boolean; faded?: boolean }[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span className={i.line ? "w-3 h-0.5 rounded" : "w-2.5 h-2.5 rounded-sm"} style={{ background: i.color, opacity: i.faded ? 0.3 : 1 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- Donut e anel ---------- */
export function Donut({ data, center, sub }: { data: { label: string; value: number; color: string }[]; center: string; sub: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" className="w-[148px] h-[148px] shrink-0" role="img" aria-label="Distribuição por forma de pagamento">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {data.map((d) => {
        const len = (d.value / total) * C;
        const el = <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
        acc += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="15" fontWeight="900" fill="#0f172a">{center}</text>
      <text x="70" y="83" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#94a3b8" letterSpacing="0.8">{sub}</text>
    </svg>
  );
}

export function Ring({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 58, C = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 150 150" className="w-[170px] h-[170px]" role="img" aria-label={`${label} ${sub}`}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
      <circle cx="75" cy="75" r={r} fill="none" stroke={value >= 1 ? "#10b981" : "#2563eb"} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${v * C} ${C}`} transform="rotate(-90 75 75)" style={{ transition: "stroke-dasharray .6s ease" }} />
      <text x="75" y="76" textAnchor="middle" fontSize="26" fontWeight="900" fill="#0f172a">{label}</text>
      <text x="75" y="94" textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8" letterSpacing="0.8">{sub}</text>
    </svg>
  );
}