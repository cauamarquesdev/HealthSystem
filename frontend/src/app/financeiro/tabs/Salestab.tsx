"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Receipt, Trash2, X, Loader2, Check, Ban, Undo2, HandCoins, Download } from "lucide-react";
import { toast } from "sonner";
import {
  api, post, errMsg, card, labelCls, inputCls, areaCls, btnDark, btnLight, btnBlue,
  Drawer, Dialog, ConfirmDialog, EmptyState, Chip, Avatar,
} from "../../prontuarios/lib/api";
import { brl, dmy, dm, iso, todayIso, METHODS, METHOD_LABEL, useDebounced, downloadCsv, Th, StatusPill, type Sale, type Billable } from "./fin";
import { PayDialog } from "./Transactionstab";

/* ============================================================
 *  ABA
 * ============================================================ */
export default function SalesTab({ from, to, version, billableCount, onNewSale, onBill, onChanged }: {
  from: string;
  to: string;
  version: number;
  billableCount: number;
  onNewSale: () => void;
  onBill: (b: Billable) => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [billableOpen, setBillableOpen] = useState(false);
  const dq = useDebounced(q);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ from, to, ...(status && { status }), ...(dq.trim() && { q: dq.trim() }) });
      setRows(await api<Sale[]>(`/finance/sales?${qs}`));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [from, to, status, dq]);
  useEffect(() => { load(); }, [load, version]);

  const live = rows.filter((r) => r.status !== "CANCELADO");
  const total = live.reduce((s, r) => s + r.total, 0);
  const selected = rows.find((r) => r.id === open) ?? null;

  const exportCsv = () =>
    downloadCsv("vendas.csv", [
      ["Data", "Paciente", "Itens", "Forma", "Parcelas", "Desconto", "Total", "Status"],
      ...rows.map((r) => [dmy(r.date), r.patient.name, r.items.map((i: { quantity: any; name: any; }) => `${i.quantity}x ${i.name}`).join(" + "), METHOD_LABEL[r.method ?? ""] ?? "", r.installments, r.discount.toFixed(2), r.total.toFixed(2), r.status]),
    ]);

  return (
    <div className="space-y-5">
      {billableCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 flex items-center gap-3">
          <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[12px] font-medium text-amber-900 flex-1"><strong>{billableCount} atendimento{billableCount > 1 ? "s concluídos" : " concluído"}</strong> ainda não {billableCount > 1 ? "viraram" : "virou"} venda.</p>
          <button onClick={() => setBillableOpen(true)} className="text-[12px] font-bold text-amber-800 hover:underline">Revisar e faturar</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {[["", "Todas"], ["PAGO", "Pagas"], ["PENDENTE", "Com pendência"], ["CANCELADO", "Canceladas"]].map(([v, l]) => (
            <Chip key={v} active={status === v} onClick={() => setStatus(v)}>{l}</Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por paciente" className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <button onClick={exportCsv} disabled={!rows.length} className={btnLight}><Download className="w-4 h-4 text-slate-400" /> CSV</button>
          <button onClick={onNewSale} className={btnDark}><Plus className="w-4 h-4" /> Nova venda</button>
        </div>
      </div>

      {error ? (
        <div className={`${card} p-10 text-center`}><p className="text-[13px] font-bold text-rose-600">{error}</p><button onClick={load} className={`${btnDark} mx-auto mt-4`}>Tentar novamente</button></div>
      ) : !loading && rows.length === 0 ? (
        <EmptyState icon={<Receipt className="w-6 h-6" />} title="Nenhuma venda no período" text="Registre uma venda ou fature os atendimentos concluídos para acompanhar o faturamento." action={<button onClick={onNewSale} className={btnDark}><Plus className="w-4 h-4" /> Nova venda</button>} />
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr className="border-b border-slate-200 bg-slate-50/60"><Th>Data</Th><Th>Paciente</Th><Th>Itens</Th><Th>Pagamento</Th><Th right>Total</Th><Th>Status</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>)}
                {!loading && rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r.id)} className={`cursor-pointer hover:bg-slate-50/70 transition-colors ${r.status === "CANCELADO" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">{dmy(r.date)}</td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-2.5"><Avatar name={r.patient.name} size={30} /><span className="text-[13px] font-bold text-slate-900">{r.patient.name}</span></div></td>
                    <td className="px-4 py-3.5 text-[12px] font-medium text-slate-500 max-w-[280px] truncate">{r.items.map((i: { quantity: string | number; name: any; }) => `${Number(i.quantity) > 1 ? Number(i.quantity) + "x " : ""}${i.name}`).join(" + ")}</td>
                    <td className="px-4 py-3.5 text-[12px] font-medium text-slate-600 whitespace-nowrap">{METHOD_LABEL[r.method ?? ""] ?? "—"}{r.installments > 1 ? ` • ${r.installments}x` : ""}</td>
                    <td className="px-4 py-3.5 text-right text-[13px] font-black text-slate-900 tabular-nums">{brl(r.total)}</td>
                    <td className="px-4 py-3.5"><SaleBadge s={r} /></td>
                  </tr>
                ))}
              </tbody>
              {!loading && rows.length > 0 && (
                <tfoot><tr className="border-t border-slate-200 bg-slate-50/60"><td colSpan={4} className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{live.length} venda{live.length === 1 ? "" : "s"} válida{live.length === 1 ? "" : "s"}</td><td className="px-4 py-3 text-right text-[14px] font-black tabular-nums">{brl(total)}</td><td /></tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <SaleDrawer sale={selected} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged(); }} />
      <BillableDialog open={billableOpen} onClose={() => setBillableOpen(false)} onBill={(b) => { setBillableOpen(false); onBill(b); }} />
    </div>
  );
}

function SaleBadge({ s }: { s: Sale }) {
  if (s.status === "CANCELADO") return <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">Cancelada</span>;
  if (s.status === "PAGO") return <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">Paga</span>;
  const late = s.transactions.some((t: { overdue: any; }) => t.overdue);
  return <span className={`text-[10px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded ${late ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{late ? "Em atraso" : "A receber"}</span>;
}

/* ============================================================
 *  DETALHE DA VENDA
 * ============================================================ */
function SaleDrawer({ sale, onClose, onChanged }: { sale: Sale | null; onClose: () => void; onChanged: () => void }) {
  const [payTarget, setPayTarget] = useState<Sale["transactions"][number] | null>(null);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const reopen = async (id: string) => {
    try { await post(`/finance/transactions/${id}/reopen`); toast?.success("Baixa estornada."); onChanged(); } catch (e) { toast?.error(errMsg(e)); }
  };
  const doCancel = async () => {
    if (!sale) return;
    setBusy(true);
    try {
      const r = await post<{ refunded: number }>(`/finance/sales/${sale.id}/cancel`);
      toast?.success(r.refunded > 0 ? `Venda cancelada. Estorno de ${brl(r.refunded)} lançado.` : "Venda cancelada.");
      setCancel(false);
      onChanged();
    } catch (e) { toast?.error(errMsg(e)); } finally { setBusy(false); }
  };

  const subtotal = sale ? sale.items.reduce((s: number, i: { price: number; quantity: number; }) => s + i.price * i.quantity, 0) : 0;
  const cost = sale ? sale.items.reduce((s: number, i: { cost: number; quantity: number; }) => s + i.cost * i.quantity, 0) : 0;

  return (
    <>
      <Drawer open={!!sale} onClose={onClose} width={560} eyebrow={sale ? `Venda de ${dmy(sale.date)}` : ""} title={sale?.patient.name ?? ""}>
        {sale && (
          <div className="p-7 space-y-6">
            <div className="flex items-center gap-3 flex-wrap"><SaleBadge s={sale} /><span className="text-[12px] font-medium text-slate-500">{METHOD_LABEL[sale.method ?? ""] ?? "—"} • {sale.professional}</span></div>

            <section className={`${card} overflow-hidden`}>
              <table className="w-full">
                <thead><tr className="border-b border-slate-200 bg-slate-50/60"><Th>Item</Th><Th right>Qtd.</Th><Th right>Valor</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((i: { id: string; name: string; quantity: number; price: number; }) => (
                    <tr key={i.id}><td className="px-4 py-2.5 text-[13px] font-bold text-slate-800">{i.name}</td><td className="px-4 py-2.5 text-right text-[13px] font-medium text-slate-600 tabular-nums">{i.quantity}</td><td className="px-4 py-2.5 text-right text-[13px] font-black tabular-nums">{brl(i.price * i.quantity)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 space-y-1 text-[12px]">
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Subtotal</span><b className="tabular-nums">{brl(subtotal)}</b></p>
                {sale.discount > 0 && <p className="flex justify-between"><span className="text-slate-500 font-medium">Desconto</span><b className="tabular-nums text-emerald-600">− {brl(sale.discount)}</b></p>}
                <p className="flex justify-between text-[14px] pt-1"><span className="font-black">Total</span><b className="font-black tabular-nums">{brl(sale.total)}</b></p>
                {cost > 0 && <p className="flex justify-between pt-1 text-slate-400 font-medium"><span>Lucro sobre insumos</span><span className="tabular-nums">{brl(sale.total - cost)}</span></p>}
              </div>
            </section>

            <section>
              <h3 className="text-[13px] font-black text-slate-900 mb-3">Parcelas</h3>
              <div className={`${card} divide-y divide-slate-100`}>
                {sale.transactions.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-14 text-[12px] font-bold text-slate-500 tabular-nums">{t.installmentTotal && t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal}` : "À vista"}</span>
                    <span className="text-[12px] font-medium text-slate-500 flex-1 tabular-nums">Vence {dm(iso(new Date(t.dueDate)))}</span>
                    <StatusPill t={t} />
                    <span className="text-[13px] font-black tabular-nums w-24 text-right">{brl(t.amount)}</span>
                    {t.status === "PENDENTE" && sale.status !== "CANCELADO" && <button onClick={() => setPayTarget(t)} className="h-8 px-3 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 transition-colors"><HandCoins className="w-3.5 h-3.5" /> Baixar</button>}
                    {t.status === "PAGO" && sale.status !== "CANCELADO" && <button onClick={() => reopen(String(t.id))} aria-label="Estornar baixa" title="Estornar baixa" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"><Undo2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </section>

            {sale.notes && <section><p className={labelCls}>Observações</p><p className="text-[13px] font-medium text-slate-700 mt-1 whitespace-pre-wrap">{sale.notes}</p></section>}

            {sale.status !== "CANCELADO" && (
              <button onClick={() => setCancel(true)} className="h-10 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 flex items-center gap-2 transition-colors"><Ban className="w-4 h-4" /> Cancelar venda</button>
            )}
          </div>
        )}
      </Drawer>
      <PayDialog tx={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); onChanged(); }} />
      <ConfirmDialog open={cancel} title="Cancelar venda?" text="Parcelas pendentes serão canceladas. Valores já recebidos geram um estorno automático nas despesas, preservando o histórico." confirmLabel="Cancelar venda" danger busy={busy} onConfirm={doCancel} onClose={() => setCancel(false)} />
    </>
  );
}

/* ============================================================
 *  ATENDIMENTOS A FATURAR
 * ============================================================ */
function BillableDialog({ open, onClose, onBill }: { open: boolean; onClose: () => void; onBill: (b: Billable) => void }) {
  const [list, setList] = useState<Billable[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setList(null);
    api<Billable[]>("/finance/billable").then(setList).catch((e: any) => { toast?.error(errMsg(e)); setList([]); });
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title="Atendimentos a faturar" icon={<Receipt className="w-5 h-5 text-slate-500" />} maxWidth={620}>
      {!list ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : list.length === 0 ? <p className="text-[13px] font-medium text-slate-500 py-6 text-center">Tudo faturado por aqui.</p> : (
        <ul className="divide-y divide-slate-100 -mx-1">
          {list.map((b) => (
            <li key={b.id} className="py-3 px-1 flex items-center gap-3">
              <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-slate-900 truncate">{b.patient.name}</p><p className="text-[12px] font-medium text-slate-500 truncate">{dmy(b.date)} • {b.procedure || "Atendimento"}</p></div>
              <span className="text-[13px] font-black tabular-nums">{brl(b.total)}</span>
              <button onClick={() => onBill(b)} className={btnDark}>Faturar</button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/* ============================================================
 *  NOVA VENDA
 * ============================================================ */
interface Line { key: string; procedureId: string | null; name: string; quantity: number; price: string }
export interface SalePrefill {
  appointmentId?: string;
  patient?: { id: string; name: string };
  items?: { procedureId: string | null; name: string; quantity: number; price: number }[];
  discount?: number;
}
const uid = () => Math.random().toString(36).slice(2, 9);
const money = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
const toInput = (n: number) => n.toFixed(2).replace(".", ",");

export function NewSaleDrawer({ open, prefill, proId, onClose, onSaved }: { open: boolean; prefill?: SalePrefill; proId?: string; onClose: () => void; onSaved: () => void }) {
  const [patients, setPatients] = useState<{ id: string; name: string; cpf?: string; phone?: string; active: boolean }[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string; price: number; active: boolean }[]>([]);
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null);
  const [pq, setPq] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [disc, setDisc] = useState<{ type: "value" | "percent"; v: string }>({ type: "value", v: "" });
  const [method, setMethod] = useState("PIX");
  const [installments, setInstallments] = useState(1);
  const [paid, setPaid] = useState(true);
  const [due, setDue] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatient(prefill?.patient ?? null);
    setPq("");
    setLines((prefill?.items ?? []).map((i) => ({ key: uid(), procedureId: i.procedureId, name: i.name, quantity: i.quantity, price: toInput(i.price) })));
    setDisc({ type: "value", v: prefill?.discount ? toInput(prefill.discount) : "" });
    setMethod("PIX"); setInstallments(1); setPaid(true); setDue(todayIso()); setNotes("");
    api<any[]>("/patients").then((l: any[]) => setPatients(l.map((p: { id: any; name: any; nome: any; cpf: any; phone: any; active: boolean; }) => ({ id: p.id, name: p.name ?? p.nome, cpf: p.cpf, phone: p.phone, active: p.active !== false })))).catch(() => setPatients([]));
    api<any[]>("/procedures").then((l: any[]) => setCatalog(l.filter((p: { active: boolean; }) => p.active !== false).map((p: { id: any; name: any; price: any; }) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, active: true })))).catch(() => setCatalog([]));
  }, [open, prefill]);

  const results = useMemo(() => {
    const t = pq.trim().toLowerCase(), d = pq.replace(/\D/g, "");
    return patients.filter((p) => !t || p.name.toLowerCase().includes(t) || (d && ((p.cpf ?? "").includes(d) || (p.phone ?? "").replace(/\D/g, "").includes(d)))).slice(0, 6);
  }, [patients, pq]);

  const setLine = (key: string, patch: Partial<Line>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const subtotal = lines.reduce((s, l) => s + money(l.price) * l.quantity, 0);
  const dRaw = money(disc.v);
  const discount = Math.min(subtotal, Math.max(0, disc.type === "percent" ? (subtotal * Math.min(dRaw, 100)) / 100 : dRaw));
  const total = subtotal - discount;
  const canInstall = method === "CARTAO_CREDITO" || method === "BOLETO";
  const n = canInstall ? installments : 1;

  const save = async () => {
    if (!patient) return toast?.error("Selecione um cliente cadastrado.");
    if (!lines.length) return toast?.error("Adicione ao menos um item.");
    if (lines.some((l) => !l.name.trim())) return toast?.error("Todos os itens precisam de um nome.");
    if (total <= 0) return toast?.error("O total da venda deve ser maior que zero.");
    setSaving(true);
    try {
      await post("/finance/sales", {
        patientId: patient.id, userId: proId, appointmentId: prefill?.appointmentId,
        items: lines.map((l) => ({ procedureId: l.procedureId, name: l.name.trim(), quantity: l.quantity, price: money(l.price) })),
        discount, method, installments: n, paid, firstDueDate: due, notes,
      });
      toast?.success("Venda registrada.");
      onSaved();
    } catch (e) { toast?.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} width={620} eyebrow={prefill?.appointmentId ? "Faturando atendimento concluído" : "Nova venda"} title="Registrar venda"
      footer={<><button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={save} disabled={saving} className={btnBlue}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Registrar venda • {brl(total)}</button></>}>
      <div className="px-7 py-6 space-y-7">
        <section className="space-y-3">
          <h3 className="text-sm font-black text-slate-900">Cliente</h3>
          {patient ? (
            <div className={`${card} p-3.5 flex items-center gap-3`}>
              <Avatar name={patient.name} size={40} />
              <span className="text-[14px] font-black text-slate-900 flex-1">{patient.name}</span>
              {!prefill?.patient && <button onClick={() => setPatient(null)} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">Alterar</button>}
            </div>
          ) : (
            <>
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Buscar cliente cadastrado por nome, CPF ou telefone" className={`${inputCls} pl-10`} /></div>
              <div className={`${card} divide-y divide-slate-100 overflow-hidden`}>
                {results.map((p) => (
                  <button key={p.id} disabled={!p.active} onClick={() => setPatient({ id: p.id, name: p.name })} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    <Avatar name={p.name} size={32} /><span className="text-[13px] font-bold text-slate-900 flex-1 truncate">{p.name}</span>{!p.active && <span className="text-[10px] font-bold text-slate-400">INATIVO</span>}
                  </button>
                ))}
                {results.length === 0 && <p className="px-4 py-6 text-center text-[13px] font-medium text-slate-500">Nenhum cliente encontrado. Só é possível vender para clientes cadastrados.</p>}
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Itens</h3>
            <button onClick={() => setLines((l) => [...l, { key: uid(), procedureId: null, name: "", quantity: 1, price: "" }])} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">+ Item avulso</button>
          </div>
          <select value="" onChange={(e) => { const p = catalog.find((c) => c.id === e.target.value); if (p) setLines((l) => [...l, { key: uid(), procedureId: p.id, name: p.name, quantity: 1, price: toInput(p.price) }]); }} className={`${inputCls} appearance-none`}>
            <option value="">Adicionar procedimento do catálogo…</option>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} — {brl(c.price)}</option>)}
          </select>
          {lines.map((l) => (
            <div key={l.key} className={`${card} p-3 grid grid-cols-[1fr_64px_120px_32px] gap-2 items-center`}>
              <input value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })} readOnly={!!l.procedureId} placeholder="Descrição do item" className="h-9 px-3 rounded-lg border border-slate-200 text-[13px] font-bold outline-none focus:border-blue-500 read-only:bg-slate-50" />
              <input type="number" min={1} max={99} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} aria-label="Quantidade" className="h-9 px-2 rounded-lg border border-slate-200 text-[13px] font-bold text-center outline-none focus:border-blue-500" />
              <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span><input inputMode="decimal" value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value.replace(/[^\d,]/g, "") })} aria-label="Preço unitário" className="w-full h-9 pl-7 pr-2 rounded-lg border border-slate-200 text-[13px] font-bold tabular-nums outline-none focus:border-blue-500" /></div>
              <button onClick={() => setLines((x) => x.filter((i) => i.key !== l.key))} aria-label="Remover item" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ))}
          {lines.length === 0 && <p className="text-[12px] font-medium text-slate-400">Nenhum item adicionado.</p>}
          <div className="flex items-center gap-2 pt-1">
            <span className={labelCls}>Desconto</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5">{(["value", "percent"] as const).map((t) => <button key={t} onClick={() => setDisc((d) => ({ ...d, type: t }))} className={`px-3 h-7 rounded-md text-[12px] font-bold transition-colors ${disc.type === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t === "value" ? "R$" : "%"}</button>)}</div>
            <input inputMode="decimal" value={disc.v} onChange={(e) => setDisc((d) => ({ ...d, v: e.target.value.replace(/[^\d,]/g, "") }))} placeholder="0" className="h-9 w-28 px-3 rounded-lg border border-slate-200 text-[13px] font-bold tabular-nums outline-none focus:border-blue-500" />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-black text-slate-900">Pagamento</h3>
          <div className="flex flex-wrap gap-1.5">{METHODS.map((m) => <Chip key={m} active={method === m} onClick={() => { setMethod(m); if (m !== "CARTAO_CREDITO" && m !== "BOLETO") setInstallments(1); }}>{METHOD_LABEL[m]}</Chip>)}</div>
          <div className="grid grid-cols-2 gap-3">
            {canInstall && (
              <div className="space-y-2"><label className={labelCls}>Parcelas</label>
                <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className={`${inputCls} appearance-none`}>{Array.from({ length: 12 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{i}x de {brl(total / i)}</option>)}</select></div>
            )}
            {!paid && <div className="space-y-2"><label className={labelCls}>{n > 1 ? "Vencimento da 1ª parcela" : "Vencimento"}</label><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} /></div>}
          </div>
          <button type="button" onClick={() => setPaid((v) => !v)} aria-pressed={paid} className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-left transition-colors">
            <span className="flex-1"><span className="block text-[13px] font-bold text-slate-900">Recebido agora</span><span className="block text-[11px] font-medium text-slate-500">{n > 1 ? "A 1ª parcela entra no caixa hoje; as demais ficam a receber." : "Dá baixa no caixa imediatamente."}</span></span>
            <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${paid ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${paid ? "translate-x-4" : ""}`} /></span>
          </button>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Observações (opcional)" className={areaCls} />
        </section>

        <section className="rounded-2xl bg-[#0B0F19] text-white p-5 space-y-1.5 text-[12px]">
          <p className="flex justify-between"><span className="text-slate-400">Subtotal</span><b className="tabular-nums">{brl(subtotal)}</b></p>
          {discount > 0 && <p className="flex justify-between"><span className="text-slate-400">Desconto</span><b className="tabular-nums text-emerald-400">− {brl(discount)}</b></p>}
          <p className="flex justify-between items-baseline pt-1.5 border-t border-slate-700"><span className="font-bold text-slate-300">Total</span><b className="text-[22px] font-black tabular-nums">{brl(total)}</b></p>
          {n > 1 && <p className="text-slate-400 text-right">{n}x de {brl(total / n)}</p>}
        </section>
      </div>
    </Drawer>
  );
}