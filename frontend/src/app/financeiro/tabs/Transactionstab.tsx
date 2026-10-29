"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, HandCoins, Pencil, Trash2, Undo2, Loader2, Check, Download, ArrowUpRight, ArrowDownRight, Repeat } from "lucide-react";
import { toast } from "sonner";
import { api, post, patch, del, errMsg, card, labelCls, inputCls, btnDark, btnLight, btnBlue, Drawer, Dialog, ConfirmDialog, EmptyState, Chip } from "../../prontuarios/lib/api";
import { brl, dmy, iso, todayIso, METHODS, METHOD_LABEL, useDebounced, downloadCsv, Th, StatusPill, type Tx } from "./fin";

const CATEGORIES = ["Aluguel", "Insumos", "Salários", "Comissões", "Marketing", "Impostos", "Equipamentos", "Software", "Contas fixas", "Outros"];

/* ============================================================
 *  BAIXA (compartilhada com a aba de vendas)
 * ============================================================ */
export function PayDialog({ tx, onClose, onDone }: { tx: Tx | null; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState("PIX");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (tx) { setDate(todayIso()); setMethod(tx.paymentMethod ?? "PIX"); }
  }, [tx]);

  const save = async () => {
    if (!tx) return;
    setBusy(true);
    try {
      await post(`/finance/transactions/${tx.id}/pay`, { paymentDate: date, paymentMethod: method });
      toast?.success(tx.type === "RECEITA" ? "Recebimento registrado." : "Pagamento registrado.");
      onDone();
    } catch (e) { toast?.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!tx} onClose={() => !busy && onClose()} title={tx?.type === "RECEITA" ? "Registrar recebimento" : "Registrar pagamento"} icon={<HandCoins className="w-5 h-5 text-slate-500" />} maxWidth={440}
      footer={<><button disabled={busy} onClick={onClose} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button><button disabled={busy} onClick={save} className={btnBlue}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar {tx ? brl(tx.amount) : ""}</button></>}>
      {tx && (
        <div className="space-y-4">
          <p className="text-[13px] font-medium text-slate-500">{tx.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className={labelCls}>Data</label><input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
            <div className="space-y-2"><label className={labelCls}>Forma</label><select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} appearance-none`}>{METHODS.map((m: string) => <option key={m} value={m}>{METHOD_LABEL[m as keyof typeof METHOD_LABEL]}</option>)}</select></div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/* ============================================================
 *  ABA
 * ============================================================ */
export default function TransactionsTab({ from, to, version, onNew, onChanged, editSignal }: {
  from: string;
  to: string;
  version: number;
  onNew: (type?: "RECEITA" | "DESPESA") => void;
  onChanged: () => void;
  editSignal: { tx: Tx | null; n: number };
}) {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [payTarget, setPayTarget] = useState<Tx | null>(null);
  const [editTarget, setEditTarget] = useState<Tx | null>(null);
  const [delTarget, setDelTarget] = useState<Tx | null>(null);
  const [busy, setBusy] = useState(false);
  const dq = useDebounced(q);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ from, to, ...(type && { type }), ...(status && { status }), ...(dq.trim() && { q: dq.trim() }) });
      setRows(await api<Tx[]>(`/finance/transactions?${qs}`));
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [from, to, type, status, dq]);
  useEffect(() => { load(); }, [load, version]);
  useEffect(() => { if (editSignal.n) setEditTarget(editSignal.tx); }, [editSignal.n]);

  const sums = useMemo(() => {
    const s = (f: (t: Tx) => boolean) => rows.filter(f).reduce((a, t) => a + t.amount, 0);
    return {
      receivable: s((t) => t.type === "RECEITA" && t.status === "PENDENTE"),
      payable: s((t) => t.type === "DESPESA" && t.status === "PENDENTE"),
      overdue: s((t) => t.overdue),
      overdueCount: rows.filter((t) => t.overdue).length,
    };
  }, [rows]);

  const refresh = () => { load(); onChanged(); };
  const reopen = async (t: Tx) => { try { await post(`/finance/transactions/${t.id}/reopen`); toast?.success("Baixa estornada."); refresh(); } catch (e) { toast?.error(errMsg(e)); } };
  const remove = async () => {
    if (!delTarget) return;
    setBusy(true);
    try { await del(`/finance/transactions/${delTarget.id}`); toast?.success("Lançamento excluído."); setDelTarget(null); refresh(); } catch (e) { toast?.error(errMsg(e)); setDelTarget(null); } finally { setBusy(false); }
  };

  const exportCsv = () =>
    downloadCsv("lancamentos.csv", [
      ["Vencimento", "Descrição", "Categoria", "Tipo", "Valor", "Status", "Pagamento", "Forma"],
      ...rows.map((t) => [dmy(t.dueDate), t.description, t.category, t.type === "RECEITA" ? "Receita" : "Despesa", t.amount.toFixed(2), t.overdue ? "Atrasado" : t.status, t.paymentDate ? dmy(t.paymentDate) : "", METHOD_LABEL[t.paymentMethod ?? ""] ?? ""]),
    ]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "A receber no período", v: sums.receivable, c: "text-emerald-600" },
          { l: "A pagar no período", v: sums.payable, c: "text-rose-600" },
          { l: `Em atraso${sums.overdueCount ? ` (${sums.overdueCount})` : ""}`, v: sums.overdue, c: sums.overdue > 0 ? "text-rose-600" : "text-slate-900" },
        ].map((k) => (
          <div key={k.l} className={`${card} px-5 py-4`}><p className={labelCls}>{k.l}</p><p className={`text-[22px] font-black tabular-nums mt-1 ${k.c}`}>{brl(k.v)}</p></div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {[["", "Tudo"], ["RECEITA", "Receitas"], ["DESPESA", "Despesas"]].map(([v, l]) => <Chip key={v} active={type === v} onClick={() => setType(v)}>{l}</Chip>)}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          {[["", "Todos"], ["PENDENTE", "Pendentes"], ["ATRASADO", "Atrasados"], ["PAGO", "Pagos"]].map(([v, l]) => <Chip key={v} active={status === v} onClick={() => setStatus(v)} tone={v === "ATRASADO" ? "rose" : "dark"}>{l}</Chip>)}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-[240px]"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lançamento" className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-blue-500 shadow-sm" /></div>
          <button onClick={exportCsv} disabled={!rows.length} className={btnLight}><Download className="w-4 h-4 text-slate-400" /> CSV</button>
          <button onClick={() => onNew()} className={btnDark}><Plus className="w-4 h-4" /> Novo lançamento</button>
        </div>
      </div>

      {error ? (
        <div className={`${card} p-10 text-center`}><p className="text-[13px] font-bold text-rose-600">{error}</p><button onClick={load} className={`${btnDark} mx-auto mt-4`}>Tentar novamente</button></div>
      ) : !loading && rows.length === 0 ? (
        <EmptyState icon={<HandCoins className="w-6 h-6" />} title="Nenhum lançamento encontrado" text="Cadastre despesas e receitas avulsas ou registre vendas parceladas para acompanhar contas a pagar e a receber." action={<button onClick={() => onNew("DESPESA")} className={btnDark}><Plus className="w-4 h-4" /> Novo lançamento</button>} />
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className="border-b border-slate-200 bg-slate-50/60"><Th>Vencimento</Th><Th>Descrição</Th><Th>Categoria</Th><Th right>Valor</Th><Th>Status</Th><Th right>Ações</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>)}
                {!loading && rows.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">{dmy(t.dueDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.type === "RECEITA" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{t.type === "RECEITA" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}</span>
                        <div className="min-w-0"><p className="text-[13px] font-bold text-slate-900 truncate max-w-[300px]">{t.description}</p>{(t.counterparty || t.patientName) && <p className="text-[11px] font-medium text-slate-400 truncate">{t.counterparty ?? t.patientName}</p>}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded-md px-2 py-1">{t.category}</span>{t.origin === "VENDA" && <span className="ml-1.5 text-[10px] font-bold text-blue-600">Venda</span>}</td>
                    <td className={`px-4 py-3 text-right text-[13px] font-black tabular-nums whitespace-nowrap ${t.type === "RECEITA" ? "text-emerald-600" : "text-rose-600"}`}>{t.type === "RECEITA" ? "+" : "−"}{brl(t.amount)}</td>
                    <td className="px-4 py-3"><StatusPill t={t} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "PENDENTE" && <button onClick={() => setPayTarget(t)} className="h-8 px-3 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 transition-colors"><HandCoins className="w-3.5 h-3.5" /> {t.type === "RECEITA" ? "Receber" : "Pagar"}</button>}
                        <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {t.status === "PAGO" && <button onClick={() => reopen(t)} aria-label="Estornar baixa" title="Estornar baixa" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"><Undo2 className="w-4 h-4" /></button>}
                          <button onClick={() => setEditTarget(t)} aria-label="Editar" title="Editar" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                          {t.origin === "MANUAL" && <button onClick={() => setDelTarget(t)} aria-label="Excluir" title="Excluir" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PayDialog tx={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); refresh(); }} />
      <TransactionDrawer open={!!editTarget} edit={editTarget ?? undefined} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); refresh(); }} />
      <ConfirmDialog open={!!delTarget} title="Excluir lançamento?" text="Essa ação não pode ser desfeita." confirmLabel="Excluir" danger busy={busy} onConfirm={remove} onClose={() => setDelTarget(null)} />
    </div>
  );
}

/* ============================================================
 *  NOVO / EDITAR LANÇAMENTO
 * ============================================================ */
export function TransactionDrawer({ open, edit, initialType, onClose, onSaved }: { open: boolean; edit?: Tx; initialType?: "RECEITA" | "DESPESA"; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [paid, setPaid] = useState(false);
  const [payDate, setPayDate] = useState(todayIso());
  const [method, setMethod] = useState("PIX");
  const [repeat, setRepeat] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(edit?.type ?? initialType ?? "DESPESA");
    setDescription(edit?.description ?? "");
    setCategory(edit?.category ?? "");
    setCounterparty(edit?.counterparty ?? "");
    setAmount(edit ? edit.amount.toFixed(2).replace(".", ",") : "");
    setDueDate(edit ? iso(new Date(edit.dueDate)) : todayIso());
    setPaid(false); setPayDate(todayIso()); setMethod("PIX"); setRepeat(0);
  }, [open, edit, initialType]);

  const value = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;
  const locked = !!edit && (edit.status !== "PENDENTE" || edit.origin === "VENDA"); // valor/vencimento travados

  const save = async () => {
    if (!description.trim()) return toast?.error("Informe a descrição.");
    if (!edit && value <= 0) return toast?.error("Informe um valor maior que zero.");
    setSaving(true);
    try {
      if (edit) {
        await patch(`/finance/transactions/${edit.id}`, {
          description, category, counterparty,
          ...(!locked && { amount: value, dueDate }),
        });
        toast?.success("Lançamento atualizado.");
      } else {
        await post("/finance/transactions", { type, description, category, counterparty, amount: value, dueDate, paid, paymentDate: payDate, paymentMethod: method, repeat });
        toast?.success(repeat > 0 ? `${repeat + 1} lançamentos criados.` : "Lançamento criado.");
      }
      onSaved();
    } catch (e) { toast?.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} width={520} eyebrow={edit ? "Editando lançamento" : "Contas a pagar e a receber"} title={edit ? "Editar lançamento" : "Novo lançamento"}
      footer={<><button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={save} disabled={saving} className={btnBlue}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {edit ? "Salvar alterações" : "Criar lançamento"}</button></>}>
      <div className="px-7 py-6 space-y-6">
        {!edit && (
          <div className="grid grid-cols-2 gap-2">
            {(["DESPESA", "RECEITA"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={`h-14 rounded-2xl border flex items-center justify-center gap-2 text-[13px] font-black transition-all ${type === t ? (t === "RECEITA" ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10" : "border-rose-500 bg-rose-50 text-rose-700 ring-4 ring-rose-500/10") : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                {t === "RECEITA" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />} {t === "RECEITA" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2"><label className={labelCls}>Descrição</label><input autoFocus value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} placeholder={type === "DESPESA" ? "Ex.: Aluguel da sala" : "Ex.: Aluguel de sala para parceiro"} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><label className={labelCls}>Valor</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">R$</span><input inputMode="decimal" disabled={locked} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0,00" className={`${inputCls} pl-10 tabular-nums disabled:bg-slate-50 disabled:text-slate-400`} /></div></div>
          <div className="space-y-2"><label className={labelCls}>Vencimento</label><input type="date" disabled={locked} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`} /></div>
        </div>
        {locked && <p className="text-[12px] font-medium text-slate-500 -mt-3">{edit?.origin === "VENDA" ? "Parcelas de venda têm valor fixo." : "Valor e vencimento só mudam em lançamentos pendentes. Estorne a baixa para editar."}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><label className={labelCls}>Categoria</label><input list="fin-cats" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="Selecione ou digite" className={inputCls} /><datalist id="fin-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></div>
          <div className="space-y-2"><label className={labelCls}>{type === "DESPESA" ? "Fornecedor" : "Origem"}</label><input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={120} placeholder="Opcional" className={inputCls} /></div>
        </div>

        {!edit && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Repeat className="w-4 h-4 text-slate-400" /><label className={labelCls}>Repetir mensalmente</label></div>
              <div className="flex flex-wrap gap-1.5">{[0, 2, 3, 6, 12].map((n) => <Chip key={n} active={repeat === (n === 0 ? 0 : n - 1)} onClick={() => setRepeat(n === 0 ? 0 : n - 1)}>{n === 0 ? "Não repetir" : `${n} meses`}</Chip>)}</div>
              {repeat > 0 && <p className="text-[12px] font-medium text-slate-500">Serão criados {repeat + 1} lançamentos de {brl(value)}, um por mês.</p>}
            </div>
            <button type="button" onClick={() => setPaid((v) => !v)} aria-pressed={paid} className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-left transition-colors">
              <span className="flex-1"><span className="block text-[13px] font-bold text-slate-900">{type === "RECEITA" ? "Já recebido" : "Já pago"}</span><span className="block text-[11px] font-medium text-slate-500">Dá baixa no primeiro lançamento agora.</span></span>
              <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${paid ? (type === "RECEITA" ? "bg-emerald-500" : "bg-rose-500") : "bg-slate-300"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${paid ? "translate-x-4" : ""}`} /></span>
            </button>
            {paid && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className={labelCls}>Data</label><input type="date" value={payDate} max={todayIso()} onChange={(e) => setPayDate(e.target.value)} className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Forma</label><select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} appearance-none`}>{METHODS.map((m: string) => <option key={m} value={m}>{METHOD_LABEL[m as keyof typeof METHOD_LABEL]}</option>)}</select></div>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}