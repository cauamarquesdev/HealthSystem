"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, Pencil, Printer, PenLine, Loader2, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import {
  post,
  patch,
  errMsg,
  card,
  labelCls,
  inputCls,
  areaCls,
  btnDark,
  btnLight,
  btnBlue,
  Chip,
  EmptyState,
  StatusBadge,
  Seal,
  formatDate,
  formatDateTime,
  esc,
  printDocument,
  printHeader,
  printPatientBox,
  printSeal,
  type Note,
  type RecordData,
  type TabProps,
} from "../lib/api";

/* ============================================================
 *  MODELO DE DADOS
 * ============================================================ */
export interface AnamneseData {
  complaint: string;
  expectations: string;
  conditions: string[];
  medications: string;
  allergies: string;
  surgeries: string;
  smoking: string;
  alcohol: string;
  activity: string;
  sun: string;
  sunscreen: string;
  skincare: string;
  fototipo: string;
  skinType: string;
  skinTendency: string;
  notes: string;
}

export const CONDITIONS: { label: string; risk?: boolean }[] = [
  { label: "Gestante", risk: true },
  { label: "Lactante", risk: true },
  { label: "Distúrbio de coagulação", risk: true },
  { label: "Uso de anticoagulante", risk: true },
  { label: "Isotretinoína (últimos 6 meses)", risk: true },
  { label: "Queloide / cicatrização alterada", risk: true },
  { label: "Herpes labial recorrente", risk: true },
  { label: "Doença autoimune", risk: true },
  { label: "Marca-passo / implante metálico", risk: true },
  { label: "Câncer em tratamento", risk: true },
  { label: "Hipertensão" },
  { label: "Diabetes" },
  { label: "Cardiopatia" },
  { label: "Doença da tireoide" },
  { label: "Hepatite" },
  { label: "Epilepsia" },
  { label: "Enxaqueca" },
  { label: "Imunossupressão" },
];
const RISK = new Set(CONDITIONS.filter((c) => c.risk).map((c) => c.label));
export const FITZPATRICK = ["I", "II", "III", "IV", "V", "VI"];
const FITZ_DESC: Record<string, string> = {
  I: "Muito clara, sempre queima",
  II: "Clara, queima com facilidade",
  III: "Média, queima moderadamente",
  IV: "Morena clara, queima pouco",
  V: "Morena escura, raramente queima",
  VI: "Negra, nunca queima",
};

const empty = (p?: { allergies: string | null; fototipo: string | null; skinTendency: string | null }): AnamneseData => ({
  complaint: "",
  expectations: "",
  conditions: [],
  medications: "",
  allergies: p?.allergies ?? "",
  surgeries: "",
  smoking: "",
  alcohol: "",
  activity: "",
  sun: "",
  sunscreen: "",
  skincare: "",
  fototipo: p?.fototipo?.replace(/\D*([IV]+)\D*/, "$1") ?? "",
  skinType: "",
  skinTendency: p?.skinTendency ?? "",
  notes: "",
});

/** Alertas clínicos derivados da anamnese mais recente (usados também no cabeçalho do paciente). */
export function riskFlags(record: RecordData): string[] {
  const latest = record.notes.find((n: Note) => n.type === "ANAMNESE");
  const list: string[] = latest?.data?.conditions ?? [];
  return list.filter((c) => RISK.has(c));
}

const toText = (d: AnamneseData) =>
  [
    d.complaint && `Queixa principal: ${d.complaint}`,
    d.expectations && `Expectativas: ${d.expectations}`,
    d.conditions.length && `Condições de saúde: ${d.conditions.join(", ")}`,
    d.medications && `Medicamentos em uso: ${d.medications}`,
    d.allergies && `Alergias: ${d.allergies}`,
    d.surgeries && `Cirurgias e procedimentos prévios: ${d.surgeries}`,
    (d.smoking || d.alcohol || d.activity) && `Hábitos: tabagismo ${d.smoking || "—"}; álcool ${d.alcohol || "—"}; atividade física ${d.activity || "—"}`,
    (d.sun || d.sunscreen) && `Exposição solar ${d.sun || "—"}; protetor solar ${d.sunscreen || "—"}`,
    d.skincare && `Rotina de cuidados: ${d.skincare}`,
    d.fototipo && `Fototipo (Fitzpatrick): ${d.fototipo}`,
    d.skinType && `Tipo de pele: ${d.skinType}`,
    d.skinTendency && `Tendência: ${d.skinTendency}`,
    d.notes && `Observações: ${d.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

/* ============================================================
 *  ABA
 * ============================================================ */
type AnamneseTabProps = TabProps & {
  pendingNew?: boolean;
  consumeNew?: () => void;
};

export default function AnamneseTab({ patient, record, pro, reload, pendingNew, consumeNew }: AnamneseTabProps) {
  const versions: Note[] = useMemo(
  () =>
    (record?.notes ?? [])
      .filter((n: Note) => n.type === "ANAMNESE")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      ),
  [record?.notes]
);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft?: Note } | null>(null);

  const current = versions.find((v: Note) => v.id === viewId) ?? versions[0];

  useEffect(() => {
    if (pendingNew) {
      startEdit();
      consumeNew?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNew]);

  const startEdit = () => {
    const draft = versions[0] && !versions[0].signedAt ? versions[0] : undefined;
    setEditing({ draft });
  };

  if (editing) {
    return (
      <AnamneseForm
        patient={patient}
        base={editing.draft ?? versions[0]}
        draft={editing.draft}
        proId={pro?.id}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          setViewId(null);
          await reload();
        }}
      />
    );
  }

  if (!current) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<ClipboardList className="w-6 h-6" />}
          title="Anamnese ainda não preenchida"
          text="A anamnese reúne histórico de saúde, alergias, hábitos e avaliação da pele. Ela alimenta os alertas clínicos do paciente."
          action={<button onClick={startEdit} className={btnDark}><PenLine className="w-4 h-4" /> Preencher anamnese</button>}
        />
      </div>
    );
  }

  const d = { ...empty(), ...(current.data ?? {}) } as AnamneseData;

  const print = () => {
    const row = (l: string, v?: string) => (v ? `<tr><td style="width:34%;color:#64748b">${l}</td><td>${esc(v)}</td></tr>` : "");
    const html =
      printHeader("Ficha de anamnese") +
      printPatientBox(patient) +
      `<table>${row("Queixa principal", d.complaint)}${row("Expectativas", d.expectations)}${row("Condições de saúde", d.conditions.join(", "))}${row("Medicamentos em uso", d.medications)}${row("Alergias", d.allergies)}${row("Cirurgias / procedimentos prévios", d.surgeries)}${row("Tabagismo", d.smoking)}${row("Álcool", d.alcohol)}${row("Atividade física", d.activity)}${row("Exposição solar", d.sun)}${row("Uso de protetor solar", d.sunscreen)}${row("Rotina de cuidados", d.skincare)}${row("Fototipo (Fitzpatrick)", d.fototipo)}${row("Tipo de pele", d.skinType)}${row("Tendência", d.skinTendency)}${row("Observações", d.notes)}</table>` +
      printSeal(current.signedAt, current.signatureHash, current.authorName);
    printDocument(`Anamnese — ${patient.name}`, html);
  };

  const Block = ({ title, rows }: { title: string; rows: [string, string | undefined][] }) => {
    const filled = rows.filter(([, v]) => v);
    if (!filled.length) return null;
    return (
      <section className={`${card} p-5`}>
        <h3 className="text-[13px] font-black text-slate-900 mb-3">{title}</h3>
        <dl className="space-y-3">
          {filled.map(([k, v]) => (
            <div key={k}>
              <dt className={labelCls}>{k}</dt>
              <dd className="text-[13px] font-medium text-slate-700 mt-0.5 whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  };

  const risks = d.conditions.filter((c) => RISK.has(c));
  const others = d.conditions.filter((c) => !RISK.has(c));

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Anamnese</h2>
            <StatusBadge signed={!!current.signedAt} />
          </div>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5">
            Versão de {formatDateTime(current.createdAt)} • {current.authorName}
            {versions.length > 1 && ` • ${versions.length} versões`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={print} className={btnLight}><Printer className="w-4 h-4 text-slate-400" /> Imprimir</button>
          <button onClick={startEdit} className={btnDark}>
            <Pencil className="w-4 h-4" /> {current.signedAt ? "Atualizar anamnese" : "Continuar rascunho"}
          </button>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-black text-amber-900">Pontos de atenção para procedimentos</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {risks.map((r) => (
                <span key={r} className="text-[11px] font-bold bg-white text-amber-800 border border-amber-200 rounded-lg px-2 py-1">{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <Block title="Motivação" rows={[["Queixa principal", d.complaint], ["Expectativas", d.expectations]]} />
          <Block title="Histórico de saúde" rows={[["Outras condições", others.join(", ")], ["Medicamentos em uso", d.medications], ["Alergias", d.allergies], ["Cirurgias e procedimentos prévios", d.surgeries]]} />
        </div>
        <div className="space-y-5">
          <section className={`${card} p-5`}>
            <h3 className="text-[13px] font-black text-slate-900 mb-3">Avaliação da pele</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tipo</span>
                <span className="text-[20px] font-black leading-none mt-1">{d.fototipo || "—"}</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-900">{d.fototipo ? `Fitzpatrick ${d.fototipo}` : "Fototipo não informado"}</p>
                <p className="text-[12px] font-medium text-slate-500">{d.fototipo ? FITZ_DESC[d.fototipo] : "Preencha na próxima atualização."}</p>
              </div>
            </div>
            <dl className="space-y-3 mt-4">
              {([["Tipo de pele", d.skinType], ["Tendência", d.skinTendency]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className={labelCls}>{k}</dt><dd className="text-[13px] font-medium text-slate-700 mt-0.5">{v}</dd></div>
              ))}
            </dl>
          </section>
          <Block
            title="Estilo de vida e cuidados"
            rows={[["Tabagismo", d.smoking], ["Álcool", d.alcohol], ["Atividade física", d.activity], ["Exposição solar", d.sun], ["Protetor solar", d.sunscreen], ["Rotina de cuidados", d.skincare]]}
          />
          <Block title="Observações" rows={[["Notas do profissional", d.notes]]} />
        </div>
      </div>

      <Seal signedAt={current.signedAt} hash={current.signatureHash} author={current.authorName} />

      {versions.length > 1 && (
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-slate-400" /><h3 className="text-[13px] font-black text-slate-900">Versões anteriores</h3></div>
          <div className="divide-y divide-slate-100">
            {versions.map((v, i) => (
              <button key={v.id} onClick={() => setViewId(v.id)} className={`w-full flex items-center justify-between gap-3 py-2.5 text-left rounded-lg px-2 -mx-2 transition-colors ${current.id === v.id ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                <span className="text-[13px] font-bold text-slate-800">{formatDate(v.createdAt)} {i === 0 && <span className="text-[10px] font-bold text-blue-600 ml-1">ATUAL</span>}</span>
                <span className="flex items-center gap-3 text-[12px] font-medium text-slate-500">{v.authorName}<StatusBadge signed={!!v.signedAt} /></span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ============================================================
 *  FORMULÁRIO
 * ============================================================ */
function AnamneseForm({
  patient,
  base,
  draft,
  proId,
  onCancel,
  onSaved,
}: {
  patient: TabProps["patient"];
  base?: Note;
  draft?: Note;
  proId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<AnamneseData>(() => ({ ...empty(patient), ...(base?.data ?? {}) }));
  const [saving, setSaving] = useState<"draft" | "sign" | null>(null);
  const set = <K extends keyof AnamneseData>(k: K, v: AnamneseData[K]) => setD((s) => ({ ...s, [k]: v }));
  const toggle = (c: string) => set("conditions", d.conditions.includes(c) ? d.conditions.filter((x) => x !== c) : [...d.conditions, c]);

  
  const save = async (sign: boolean) => {
    console.info("[ANAMNESE] Clique de salvamento recebido.", {
      sign,
      patientId: patient?.id,
      draftId: draft?.id,
      proId,
    });

    if (!patient?.id) {
      console.error("[ANAMNESE] Não foi possível salvar: paciente sem ID.", patient);
      toast.error("Não foi possível identificar o paciente. Feche e abra o prontuário novamente.");
      return;
    }

    if (
      !d.complaint.trim() &&
      !d.conditions.length &&
      !d.medications.trim() &&
      !d.fototipo
    ) {
      toast.error(
        "Preencha ao menos a queixa, as condições de saúde, os medicamentos ou o fototipo."
      );
      return;
    }

    setSaving(sign ? "sign" : "draft");

    try {
      const payload = {
        type: "ANAMNESE",
        title: "Ficha de Anamnese",
        content: toText(d),
        data: d,
        userId: proId,
      };

      console.info("[ANAMNESE] Etapa 1: salvando a ficha.");

      if (draft?.id) {
        await patch(`/records/notes/${draft.id}`, payload);

        if (sign) {
          console.info("[ANAMNESE] Etapa 2: assinando a ficha.");
          await post(`/records/notes/${draft.id}/sign`, {
            userId: proId,
          });
        }
      } else {
        await post(`/records/patients/${patient.id}/notes`, {
          ...payload,
          sign,
        });
      }

      console.info("[ANAMNESE] Ficha salva. Atualizando perfil do paciente.");

      await patch(
        `/records/patients/${patient.id}${proId ? `?userId=${encodeURIComponent(proId)}` : ""}`,
        {
          allergies: d.allergies.trim(),
          fototipo: d.fototipo ? `Fitzpatrick ${d.fototipo}` : "",
          skinTendency: d.skinTendency.trim(),
        }
      );

      toast.success(sign ? "Anamnese assinada." : "Rascunho salvo.");

      await onSaved();

      console.info("[ANAMNESE] Salvamento concluído.");
    } catch (error) {
      console.error("[ANAMNESE] Erro durante o salvamento:", error);

      toast.error(
        `Falha ao salvar a anamnese: ${errMsg(error)}`
      );
    } finally {
      setSaving(null);
    }
  };


  const radio = (k: keyof AnamneseData, options: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={o} active={d[k] === o} onClick={() => set(k, d[k] === o ? ("" as never) : (o as never))}>{o}</Chip>
      ))}
    </div>
  );

  return (
    <div className="p-8 space-y-5 max-w-[920px]">
      <div>
        <h2 className="text-[17px] font-black text-slate-900 tracking-tight">{draft ? "Continuar rascunho da anamnese" : base ? "Atualizar anamnese" : "Nova anamnese"}</h2>
        <p className="text-[12px] font-medium text-slate-500 mt-0.5">
          {base && !draft ? "Os dados da versão anterior foram carregados. A atualização gera uma nova versão e preserva o histórico." : "Alergias, fototipo e tendência da pele também atualizam o perfil clínico do paciente."}
        </p>
      </div>

      <Section title="Motivação">
        <div className="space-y-2">
          <label className={labelCls}>Queixa principal</label>
          <textarea value={d.complaint} onChange={(e) => set("complaint", e.target.value)} rows={2} maxLength={2000} placeholder="O que levou o paciente à clínica?" className={areaCls} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Expectativas</label>
          <textarea value={d.expectations} onChange={(e) => set("expectations", e.target.value)} rows={2} maxLength={2000} placeholder="Resultado esperado e prazo." className={areaCls} />
        </div>
      </Section>

      <Section title="Histórico de saúde" hint="Itens em destaque aparecem como pontos de atenção no cabeçalho do paciente.">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <Chip key={c.label} active={d.conditions.includes(c.label)} onClick={() => toggle(c.label)} tone={c.risk ? "rose" : "dark"}>{c.label}</Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelCls}>Medicamentos em uso</label>
            <textarea value={d.medications} onChange={(e) => set("medications", e.target.value)} rows={3} maxLength={1500} placeholder="Nome, dose e frequência." className={areaCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Alergias</label>
            <textarea value={d.allergies} onChange={(e) => set("allergies", e.target.value)} rows={3} maxLength={500} placeholder="Medicamentos, látex, anestésicos, cosméticos…" className={areaCls} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Cirurgias e procedimentos estéticos prévios</label>
          <textarea value={d.surgeries} onChange={(e) => set("surgeries", e.target.value)} rows={2} maxLength={1500} placeholder="O que foi feito, quando e onde." className={areaCls} />
        </div>
      </Section>

      <Section title="Estilo de vida">
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2"><label className={labelCls}>Tabagismo</label>{radio("smoking", ["Não", "Ex-fumante", "Fumante"])}</div>
          <div className="space-y-2"><label className={labelCls}>Álcool</label>{radio("alcohol", ["Não", "Social", "Frequente"])}</div>
          <div className="space-y-2"><label className={labelCls}>Atividade física</label>{radio("activity", ["Sedentário", "1–2x/sem", "3x ou mais"])}</div>
          <div className="space-y-2"><label className={labelCls}>Exposição solar</label>{radio("sun", ["Baixa", "Moderada", "Alta"])}</div>
          <div className="space-y-2"><label className={labelCls}>Protetor solar</label>{radio("sunscreen", ["Diário", "Às vezes", "Não usa"])}</div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Rotina de cuidados com a pele</label>
          <textarea value={d.skincare} onChange={(e) => set("skincare", e.target.value)} rows={2} maxLength={1500} placeholder="Produtos, ácidos, retinoides, frequência." className={areaCls} />
        </div>
      </Section>

      <Section title="Avaliação da pele">
        <div className="space-y-2">
          <label className={labelCls}>Fototipo (Fitzpatrick)</label>
          <div className="grid grid-cols-6 gap-2">
            {FITZPATRICK.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set("fototipo", d.fototipo === f ? "" : f)}
                aria-pressed={d.fototipo === f}
                className={`rounded-xl border px-2 py-3 text-center transition-all ${d.fototipo === f ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <span className="block text-[16px] font-black text-slate-900">{f}</span>
                <span className="block text-[9px] font-medium text-slate-500 leading-tight mt-1">{FITZ_DESC[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><label className={labelCls}>Tipo de pele</label>{radio("skinType", ["Normal", "Seca", "Oleosa", "Mista", "Sensível"])}</div>
          <div className="space-y-2"><label className={labelCls}>Tendência</label><input value={d.skinTendency} onChange={(e) => set("skinTendency", e.target.value)} maxLength={200} placeholder="Ex.: desidratação, manchas, acne" className={inputCls} /></div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Observações do profissional</label>
          <textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={3000} className={areaCls} />
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/90 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3">
        <button
  type="button"
  onClick={onCancel}
  disabled={!!saving}
  className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
>
  Cancelar
</button>

<button
  type="button"
  onClick={() => void save(false)}
  disabled={!!saving}
  className={btnLight}
>
  {saving === "draft" && (
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
  )}
  Salvar rascunho
</button>

<button
  type="button"
  onClick={() => void save(true)}
  disabled={!!saving}
  className={btnBlue}
>
  {saving === "sign" ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <PenLine className="w-4 h-4" />
  )}
  Salvar e assinar
</button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} p-6 space-y-4`}>
      <div>
        <h3 className="text-[14px] font-black text-slate-900">{title}</h3>
        {hint && <p className="text-[12px] font-medium text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}