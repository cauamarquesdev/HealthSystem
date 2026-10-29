"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Printer,
  ChevronDown,
  Trash2,
  Syringe,
  ClipboardList,
  MessageSquarePlus,
  PenLine,
  Loader2,
  X,
  Link2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  post,
  patch,
  del,
  errMsg,
  card,
  labelCls,
  inputCls,
  areaCls,
  btnDark,
  btnLight,
  btnBlue,
  Drawer,
  Dialog,
  ConfirmDialog,
  EmptyState,
  Chip,
  StatusBadge,
  Seal,
  formatDate,
  formatDateTime,
  toLocalInput,
  esc,
  printDocument,
  printHeader,
  printPatientBox,
  printSeal,
  type Note,
  type TabProps,
  type PatientSummary,
} from "../lib/api";
import { FaceMap, regionAt, type Application } from "./Facemap";

/* ============================================================
 *  DADOS ESTRUTURADOS DA EVOLUÇÃO
 * ============================================================ */
interface EvoData {
  performedAt: string;
  appointmentId: string | null;
  procedures: string[];
  complaint: string;
  conduct: string;
  complications: string;
  orientations: string;
  returnDays: number | null;
  applications: Application[];
}

const PRODUCT_SUGGESTIONS = [
  "Toxina Botulínica",
  "Ácido Hialurônico",
  "Bioestimulador de Colágeno",
  "Hidroxiapatita de Cálcio",
  "Fios de PDO",
  "Skinbooster",
  "Enzima (hialuronidase)",
  "Anestésico tópico",
];

const emptyEvo = (): EvoData => ({
  performedAt: toLocalInput(),
  appointmentId: null,
  procedures: [],
  complaint: "",
  conduct: "",
  complications: "",
  orientations: "",
  returnDays: null,
  applications: [],
});

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

const totalsOf = (apps: Application[]) => {
  const map = new Map<string, number>();
  apps.forEach((a) => {
    const n = Number(String(a.amount).replace(",", "."));
    if (!a.product.trim() || !Number.isFinite(n) || n <= 0) return;
    const key = `${a.product.trim()}|${a.unit}`;
    map.set(key, (map.get(key) ?? 0) + n);
  });
  return [...map.entries()].map(([k, v]) => {
    const [product, unit] = k.split("|");
    return { product, unit, total: Math.round(v * 100) / 100 };
  });
};

const evoToText = (d: EvoData) =>
  [
    d.procedures.length ? `Procedimentos: ${d.procedures.join(", ")}` : "",
    d.complaint && `Relato: ${d.complaint}`,
    d.conduct && `Conduta: ${d.conduct}`,
    d.applications.length &&
      "Aplicações:\n" +
        d.applications.map((a, i) => `${i + 1}. ${a.region || "—"} — ${a.product || "—"} ${a.amount ? a.amount + " " + a.unit : ""}${a.lot ? ` (lote ${a.lot})` : ""}`).join("\n"),
    d.complications && `Intercorrências: ${d.complications}`,
    d.orientations && `Orientações: ${d.orientations}`,
    d.returnDays ? `Retorno em ${d.returnDays} dias` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

const normalizeEvo = (n: Note): EvoData => ({ ...emptyEvo(), ...(n.data ?? {}), performedAt: n.data?.performedAt ?? toLocalInput(new Date(n.createdAt)) });

type EvolutionsTabProps = TabProps & {
  pendingNew?: boolean;
  consumeNew?: () => void;
};

/* ============================================================
 *  ABA
 * ============================================================ */
export default function EvolutionsTab({ patient, record, pro, reload, pendingNew, consumeNew }: EvolutionsTabProps) {
  const notes = record?.notes ?? [];

  const evolutions = useMemo(
    () => notes.filter((n) => n.type === "EVOLUCAO"),
    [notes]
  );

  const addenda = useMemo(
    () => notes.filter((n) => n.type === "ADENDO"),
    [notes]
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ note?: Note; seed: number } | null>(null);
  const [signTarget, setSignTarget] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [addendumTarget, setAddendumTarget] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pendingNew) {
      setEditor({ seed: Date.now() });
      consumeNew?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNew]);

  useEffect(() => {
    if (!expanded && evolutions[0]) setExpanded(evolutions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evolutions.length]);

  const doSign = async () => {
    if (!signTarget) return;
    setBusy(true);
    try {
      await post(`/records/notes/${signTarget.id}/sign`, { userId: pro?.id });
      toast?.success("Evolução assinada e travada.");
      setSignTarget(null);
      await reload();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await del(`/records/notes/${deleteTarget.id}${pro ? `?userId=${pro.id}` : ""}`);
      toast?.success("Rascunho excluído.");
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const print = (n: Note) => {
    const d = normalizeEvo(n);
    const totals = totalsOf(d.applications);
    const html =
      printHeader("Evolução clínica") +
      printPatientBox(patient) +
      `<div class="box row"><div class="kv">Data do atendimento<b>${formatDateTime(d.performedAt)}</b></div><div class="kv">Profissional<b>${esc(n.authorName)}</b></div></div>` +
      (d.procedures.length ? `<h2>Procedimentos</h2><p>${esc(d.procedures.join(", "))}</p>` : "") +
      (d.complaint ? `<h2>Relato do paciente</h2><p>${esc(d.complaint)}</p>` : "") +
      (d.conduct ? `<h2>Conduta e descrição</h2><p>${esc(d.conduct)}</p>` : "") +
      (d.applications.length
        ? `<h2>Aplicações</h2><table><tr><th>#</th><th>Região</th><th>Produto</th><th>Quantidade</th><th>Lote</th><th>Validade</th></tr>${d.applications
            .map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.region)}</td><td>${esc(a.product)}</td><td>${esc(a.amount)} ${a.amount ? a.unit : ""}</td><td>${esc(a.lot)}</td><td>${esc(a.expiry)}</td></tr>`)
            .join("")}</table>` +
          (totals.length ? `<p style="margin-top:8px"><b>Totais:</b> ${totals.map((t) => `${esc(t.product)} ${t.total} ${t.unit}`).join(" • ")}</p>` : "")
        : "") +
      (d.complications ? `<h2>Intercorrências</h2><p>${esc(d.complications)}</p>` : "") +
      (d.orientations ? `<h2>Orientações pós-procedimento</h2><p>${esc(d.orientations)}</p>` : "") +
      (d.returnDays ? `<p><b>Retorno recomendado:</b> ${d.returnDays} dias</p>` : "") +
      addenda
        .filter((a) => a.parentId === n.id)
        .map((a) => `<h2>Adendo — ${formatDateTime(a.signedAt ?? a.createdAt)}</h2><p>${esc(a.content)}</p><p class="kv">${esc(a.authorName)}</p>`)
        .join("") +
      printSeal(n.signedAt, n.signatureHash, n.authorName) +
      `<div class="foot">Documento gerado pelo HealthSystem. Registro assinado eletronicamente com selo de integridade SHA-256; não substitui assinatura digital ICP-Brasil quando exigida.</div>`;
    printDocument(`Evolução — ${patient.name}`, html);
  };

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Evoluções clínicas</h2>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5">Registros assinados ficam travados; correções são feitas por adendo.</p>
        </div>
        <button onClick={() => setEditor({ seed: Date.now() })} className={btnDark}>
          <Plus className="w-4 h-4" /> Nova evolução
        </button>
      </div>

      {evolutions.length === 0 ? (
        <EmptyState
          icon={<Syringe className="w-6 h-6" />}
          title="Nenhuma evolução registrada"
          text="Registre o atendimento com procedimentos, pontos de aplicação no mapa facial, produtos e lotes."
          action={
            <button onClick={() => setEditor({ seed: Date.now() })} className={btnDark}>
              <Plus className="w-4 h-4" /> Registrar primeira evolução
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {evolutions.map((n) => {
            const d = normalizeEvo(n);
            const open = expanded === n.id;
            const totals = totalsOf(d.applications);
            const placed = d.applications.filter((a) => a.x !== null);
            const children = addenda.filter((a) => a.parentId === n.id);
            return (
              <article key={n.id} className={`${card} overflow-hidden ${n.signedAt ? "" : "border-amber-200"}`}>
                <button onClick={() => setExpanded(open ? null : n.id)} aria-expanded={open} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[20px] font-black text-slate-900 leading-none tabular-nums">{new Date(d.performedAt).getDate()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {new Date(d.performedAt).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")} {new Date(d.performedAt).getFullYear()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-black text-slate-900 truncate">{d.procedures.length ? d.procedures.join(" • ") : "Atendimento"}</h3>
                      <StatusBadge signed={!!n.signedAt} />
                      {children.length > 0 && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{children.length} adendo{children.length > 1 ? "s" : ""}</span>}
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 mt-1 truncate">
                      {n.authorName}
                      {d.applications.length > 0 && ` • ${d.applications.length} aplicaç${d.applications.length > 1 ? "ões" : "ão"}`}
                      {totals.length > 0 && ` • ${totals.map((t) => `${t.total} ${t.unit}`).join(" + ")}`}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-5 space-y-5">
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                      <div className="space-y-4 min-w-0">
                        {d.complaint && <Field label="Relato do paciente">{d.complaint}</Field>}
                        {d.conduct && <Field label="Conduta e descrição">{d.conduct}</Field>}
                        {d.complications && <Field label="Intercorrências" tone="amber">{d.complications}</Field>}
                        {d.orientations && <Field label="Orientações pós-procedimento">{d.orientations}</Field>}
                        {d.returnDays && <Field label="Retorno recomendado">{d.returnDays} dias</Field>}

                        {d.applications.length > 0 && (
                          <div>
                            <p className={`${labelCls} mb-2`}>Aplicações</p>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    {["#", "Região", "Produto", "Qtd.", "Lote"].map((h) => (
                                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {d.applications.map((a, i) => (
                                    <tr key={a.id}>
                                      <td className="px-3 py-2 text-[12px] font-black text-blue-600">{i + 1}</td>
                                      <td className="px-3 py-2 text-[12px] font-medium text-slate-700">{a.region || "—"}</td>
                                      <td className="px-3 py-2 text-[12px] font-bold text-slate-900">{a.product || "—"}</td>
                                      <td className="px-3 py-2 text-[12px] font-bold text-slate-700 tabular-nums">{a.amount ? `${a.amount} ${a.unit}` : "—"}</td>
                                      <td className="px-3 py-2 text-[11px] font-mono text-slate-500">{a.lot || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                      {placed.length > 0 && (
                        <div className="shrink-0 rounded-2xl border border-slate-200 p-2 bg-white">
                          <FaceMap points={d.applications} readOnly width={190} />
                        </div>
                      )}
                    </div>

                    {children.map((a) => (
                      <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adendo • {formatDateTime(a.signedAt ?? a.createdAt)} • {a.authorName}</p>
                        <p className="text-[13px] font-medium text-slate-700 mt-1 whitespace-pre-wrap">{a.content}</p>
                      </div>
                    ))}

                    <Seal signedAt={n.signedAt} hash={n.signatureHash} author={n.authorName} />

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button onClick={() => print(n)} className={btnLight}><Printer className="w-4 h-4 text-slate-400" /> Imprimir</button>
                      {n.signedAt ? (
                        <button onClick={() => setAddendumTarget(n)} className={btnLight}><MessageSquarePlus className="w-4 h-4 text-slate-400" /> Adicionar adendo</button>
                      ) : (
                        <>
                          <button onClick={() => setEditor({ note: n, seed: Date.now() })} className={btnLight}><Pencil className="w-4 h-4 text-slate-400" /> Editar rascunho</button>
                          <button onClick={() => setSignTarget(n)} className={btnBlue}><PenLine className="w-4 h-4" /> Assinar</button>
                          <button onClick={() => setDeleteTarget(n)} className="h-10 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 ml-auto">
                            <Trash2 className="w-4 h-4" /> Excluir rascunho
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <EvolutionEditor
        key={editor?.seed ?? 0}
        open={!!editor}
        note={editor?.note}
        patient={patient}
        record={record}
        proId={pro?.id}
        onClose={() => setEditor(null)}
        onSaved={async () => {
          setEditor(null);
          await reload();
        }}
      />

      <ConfirmDialog
        open={!!signTarget}
        title="Assinar evolução?"
        text="Após assinada, a evolução será travada e receberá um selo de integridade. Correções só poderão ser feitas por adendo."
        confirmLabel="Assinar e travar"
        busy={busy}
        onConfirm={doSign}
        onClose={() => setSignTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir rascunho?"
        text="Somente rascunhos podem ser excluídos. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        busy={busy}
        onConfirm={doDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <AddendumDialog target={addendumTarget} proId={pro?.id} onClose={() => setAddendumTarget(null)} onSaved={async () => { setAddendumTarget(null); await reload(); }} />
    </div>
  );
}

function Field({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "amber" }) {
  return (
    <div className={tone === "amber" ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" : ""}>
      <p className={labelCls}>{label}</p>
      <p className="text-[13px] font-medium text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}

/* ============================================================
 *  ADENDO
 * ============================================================ */
function AddendumDialog({ target, proId, onClose, onSaved }: { target: Note | null; proId?: string; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(""), [target?.id]);

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await post(`/records/notes/${target.id}/addendum`, { content: text, userId: proId });
      toast?.success("Adendo registrado e assinado.");
      onSaved();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!target}
      onClose={() => !busy && onClose()}
      title="Adendo ao registro"
      icon={<MessageSquarePlus className="w-5 h-5 text-slate-500" />}
      maxWidth={520}
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button disabled={busy || !text.trim()} onClick={save} className={btnDark}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />} Registrar adendo
          </button>
        </>
      }
    >
      <p className="text-[13px] font-medium text-slate-500 mb-3">O adendo complementa ou corrige o registro original, sem alterá-lo. Ele é assinado automaticamente.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={5000} autoFocus placeholder="Descreva a correção ou informação adicional." className={areaCls} />
    </Dialog>
  );
}

/* ============================================================
 *  EDITOR
 * ============================================================ */
function EvolutionEditor({
  open,
  note,
  patient,
  record,
  proId,
  onClose,
  onSaved,
}: {
  open: boolean;
  note?: Note;
  patient: PatientSummary;
  record: TabProps["record"];
  proId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<EvoData>(() => (note ? normalizeEvo(note) : emptyEvo()));
  const [catalog, setCatalog] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "sign" | null>(null);

  useEffect(() => {
    if (!open) return;
    api<any[]>("/procedures")
      .then((l) => setCatalog(l.filter((p) => p.active !== false).map((p) => p.name)))
      .catch(() => setCatalog([]));
  }, [open]);

  const set = <K extends keyof EvoData>(k: K, v: EvoData[K]) => setD((s) => ({ ...s, [k]: v }));
  const toggleProc = (name: string) => set("procedures", d.procedures.includes(name) ? d.procedures.filter((p) => p !== name) : [...d.procedures, name]);
  const updateApp = (id: string, patch: Partial<Application>) => set("applications", d.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeApp = (id: string) => set("applications", d.applications.filter((a) => a.id !== id));

  const addApp = (x: number | null, y: number | null) => {
    const last = d.applications[d.applications.length - 1];
    const app: Application = {
      id: uid(),
      x,
      y,
      region: x !== null && y !== null ? regionAt(x, y) : "",
      product: last?.product ?? "",
      amount: "",
      unit: last?.unit ?? "U",
      lot: last?.lot ?? "",
      expiry: last?.expiry ?? "",
      note: "",
    };
    set("applications", [...d.applications, app]);
    setActiveId(app.id);
  };

  const totals = totalsOf(d.applications);
  const recentAppts = (record?.appointments ?? [])
  .filter(
    (a) => new Date(a.date).getTime() <= Date.now() + 86400000
  )
  .slice(0, 15);
  const procOptions = [...new Set([...catalog, ...d.procedures])];
  const canSave = d.procedures.length > 0 || d.conduct.trim().length > 0;

  const save = async (sign: boolean) => {
    if (!canSave) {
      toast?.error("Informe ao menos o procedimento realizado ou a conduta.");
      return;
    }
    setSaving(sign ? "sign" : "draft");
    try {
      const payload = {
        type: "EVOLUCAO",
        title: d.procedures.length ? d.procedures.join(" + ").slice(0, 120) : "Evolução",
        content: evoToText(d) || "Evolução",
        data: d,
        appointmentId: d.appointmentId,
        userId: proId,
      };
      if (note) {
        await patch(`/records/notes/${note.id}`, payload);
        if (sign) await post(`/records/notes/${note.id}/sign`, { userId: proId });
      } else {
        await post(`/records/patients/${patient.id}/notes`, { ...payload, sign });
      }
      toast?.success(sign ? "Evolução assinada e travada." : "Rascunho salvo.");
      onSaved();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={820}
      eyebrow={
  note
    ? "Editando rascunho"
    : `Paciente: ${patient?.name ?? "Não selecionado"}`
}
      title={note ? "Editar evolução" : "Nova evolução"}
      footer={
        <>
          <p className="text-[11px] font-medium text-slate-400 hidden lg:flex items-center gap-1.5"><Lock className="w-3 h-3" /> Depois de assinada, só por adendo.</p>
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} disabled={!!saving} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => save(false)} disabled={!!saving} className={btnLight}>
              {saving === "draft" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar rascunho
            </button>
            <button onClick={() => save(true)} disabled={!!saving} className={btnBlue}>
              {saving === "sign" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />} Salvar e assinar
            </button>
          </div>
        </>
      }
    >
      <div className="px-7 py-6 space-y-8">
        {/* Atendimento */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelCls}>Data e hora do atendimento</label>
            <input type="datetime-local" value={d.performedAt} max={toLocalInput(new Date(Date.now() + 3600000))} onChange={(e) => set("performedAt", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Vincular ao agendamento</label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={d.appointmentId ?? ""} onChange={(e) => set("appointmentId", e.target.value || null)} className={`${inputCls} pl-10 appearance-none`}>
                <option value="">Sem vínculo</option>
                {recentAppts.map((a) => (
                  <option key={a.id} value={a.id}>{formatDate(a.date)} • {a.procedure || "Atendimento"}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Procedimentos */}
        <section className="space-y-3">
          <h3 className="text-sm font-black text-slate-900">Procedimentos realizados</h3>
          <div className="flex flex-wrap gap-1.5">
            {procOptions.map((p) => (
              <Chip key={p} active={d.procedures.includes(p)} onClick={() => toggleProc(p)} tone="blue">{p}</Chip>
            ))}
            {procOptions.length === 0 && <span className="text-[12px] font-medium text-slate-400">Cadastre procedimentos no catálogo ou adicione abaixo.</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  e.preventDefault();
                  if (!d.procedures.includes(custom.trim())) set("procedures", [...d.procedures, custom.trim()]);
                  setCustom("");
                }
              }}
              placeholder="Outro procedimento (Enter para adicionar)"
              className={inputCls}
            />
          </div>
        </section>

        {/* Relato e conduta */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-slate-900">Relato e conduta</h3>
          <div className="space-y-2">
            <label className={labelCls}>Relato do paciente / queixa da sessão</label>
            <textarea value={d.complaint} onChange={(e) => set("complaint", e.target.value)} rows={3} maxLength={3000} placeholder="O que o paciente relata, expectativas e observações do exame." className={areaCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Conduta e descrição do procedimento</label>
            <textarea value={d.conduct} onChange={(e) => set("conduct", e.target.value)} rows={4} maxLength={5000} placeholder="Técnica, anestesia, assepsia, áreas tratadas e resposta imediata." className={areaCls} />
          </div>
        </section>

        {/* Mapa */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Mapa de aplicações</h3>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Clique no rosto para marcar cada ponto e registrar produto, dose e lote.</p>
            </div>
            <button type="button" onClick={() => addApp(null, null)} className={btnLight}><Plus className="w-4 h-4 text-slate-400" /> Sem posição</button>
          </div>

          <div className="grid grid-cols-[300px_1fr] gap-5 items-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sticky top-0">
              <FaceMap points={d.applications} onAdd={addApp} onSelect={setActiveId} activeId={activeId} />
            </div>
            <div className="space-y-3 min-w-0">
              <datalist id="evo-products">{PRODUCT_SUGGESTIONS.map((p) => <option key={p} value={p} />)}</datalist>
              {d.applications.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <ClipboardList className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-slate-600">Nenhuma aplicação registrada</p>
                  <p className="text-[12px] font-medium text-slate-400 mt-0.5">Marque os pontos no mapa para começar.</p>
                </div>
              )}
              {d.applications.map((a, i) => (
                <div
                  key={a.id}
                  onClick={() => setActiveId(a.id)}
                  className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-all ${activeId === a.id ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <input value={a.region} onChange={(e) => updateApp(a.id, { region: e.target.value })} placeholder="Região" className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 text-[13px] font-bold text-slate-900 outline-none bg-transparent" />
                    {a.x === null && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">sem posição</span>}
                    <button type="button" aria-label="Remover aplicação" onClick={(e) => { e.stopPropagation(); removeApp(a.id); if (activeId === a.id) setActiveId(null); }} className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_88px_74px] gap-2">
                    <input list="evo-products" value={a.product} onChange={(e) => updateApp(a.id, { product: e.target.value })} placeholder="Produto" className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] font-medium outline-none focus:border-blue-500" />
                    <input inputMode="decimal" value={a.amount} onChange={(e) => updateApp(a.id, { amount: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="Qtd." className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] font-bold tabular-nums outline-none focus:border-blue-500" />
                    <select value={a.unit} onChange={(e) => updateApp(a.id, { unit: e.target.value as "U" | "mL" })} className="h-9 px-2 rounded-lg border border-slate-200 text-[12px] font-bold outline-none focus:border-blue-500 bg-white">
                      <option value="U">U</option>
                      <option value="mL">mL</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input value={a.lot} onChange={(e) => updateApp(a.id, { lot: e.target.value })} placeholder="Lote" className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] font-mono outline-none focus:border-blue-500" />
                    <input value={a.expiry} onChange={(e) => updateApp(a.id, { expiry: e.target.value })} placeholder="Validade (mm/aaaa)" className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] font-medium outline-none focus:border-blue-500" />
                  </div>
                </div>
              ))}
              {totals.length > 0 && (
                <div className="rounded-2xl bg-[#0B0F19] text-white px-4 py-3.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total utilizado</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {totals.map((t) => (
                      <p key={t.product + t.unit} className="text-[13px] font-bold"><span className="text-slate-400 font-medium">{t.product}</span> {t.total} {t.unit}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pós */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-slate-900">Pós-atendimento</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelCls}>Intercorrências</label>
              <textarea value={d.complications} onChange={(e) => set("complications", e.target.value)} rows={3} maxLength={2000} placeholder="Nenhuma, ou descreva." className={areaCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Orientações ao paciente</label>
              <textarea value={d.orientations} onChange={(e) => set("orientations", e.target.value)} rows={3} maxLength={2000} placeholder="Cuidados e sinais de alerta." className={areaCls} />
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Retorno recomendado</label>
            <div className="flex flex-wrap gap-1.5">
              {([null, 7, 15, 30, 60, 90, 180] as (number | null)[]).map((v) => (
                <Chip key={String(v)} active={d.returnDays === v} onClick={() => set("returnDays", v)}>{v === null ? "Sem retorno" : `${v} dias`}</Chip>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Drawer>
  );
}