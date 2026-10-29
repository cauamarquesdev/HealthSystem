"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Lock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/* ============================================================
 *  API
 * ============================================================ */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const API = `${API_BASE_URL.replace(/\/+$/, "")}/api`;
export const CLINIC_NAME = "Ellevare Estética Avançada";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}


export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API}${path}`;
  const method = init?.method ?? "GET";

  console.info("[API] Requisição iniciada:", method, url);

  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    console.error("[API] Falha de conexão:", {
      url,
      method,
      error,
    });

    throw new ApiError(
      "Não foi possível conectar ao servidor.",
      0
    );
  }

  if (!res.ok) {
    let msg = `Erro ${res.status}`;

    try {
      const body = await res.json();
      const message = body?.message;

      msg = Array.isArray(message)
        ? message.join(", ")
        : message ?? msg;
    } catch {
      // A resposta de erro não veio em JSON.
    }

    console.error("[API] Resposta de erro:", {
      url,
      method,
      status: res.status,
      message: msg,
    });

    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}


export const post = <T,>(path: string, body: unknown = {}) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T,>(path: string, body: unknown = {}) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T,>(path: string) => api<T>(path, { method: "DELETE" });
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");

/* ============================================================
 *  TIPOS
 * ============================================================ */
export interface PatientSummary {
  id: string;
  name: string;
  cpf: string | null;
  phone: string;
  email?: string | null;
  avatar: string | null;
  birthDate: string | null;
  active: boolean;
  tags: string[];
  fototipo: string | null;
  skinTendency: string | null;
  allergies: string | null;
  lastVisit: string | null;
  nextVisit: string | null;
  hasLgpd: boolean;
  counts: { notes: number; media: number; documents: number; prescriptions: number; appointments: number };
}

export interface Note {
  id: string;
  type: "ANAMNESE" | "EVOLUCAO" | "ADENDO";
  title: string;
  content: string;
  data: any;
  appointmentId: string | null;
  parentId: string | null;
  signedAt: string | null;
  signatureHash: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
}
export interface RxItem {
  name: string;
  dosage: string;
  instructions: string;
}
export interface Rx {
  id: string;
  title: string;
  content: string;
  items: RxItem[] | null;
  signedAt: string | null;
  signatureHash: string | null;
  createdAt: string;
  authorName: string;
}
export interface ClinicalDoc {
  id: string;
  type: string;
  title: string;
  content: string;
  signerName: string | null;
  signatureData: string | null;
  signedAt: string | null;
  signatureHash: string | null;
  createdAt: string;
  authorName: string;
}
export interface Media {
  id: string;
  category: "ANTES" | "DEPOIS" | "EXAME" | "REFERENCIA" | "OUTRO";
  region: string | null;
  description: string | null;
  takenAt: string;
  createdAt: string;
  appointmentId: string | null;
}
export interface Appt {
  id: string;
  date: string;
  endTime: string | null;
  status: string;
  type: string;
  procedure: string;
  professional: string;
}
export interface RecordData {
  notes: Note[];
  prescriptions: Rx[];
  documents: ClinicalDoc[];
  media: Media[];
  appointments: Appt[];
}
export interface Professional {
  id: string;
  name: string;
}
export type TabId = "overview" | "timeline" | "anamnese" | "evolucoes" | "fotos" | "prescricoes" | "documentos";

export interface TabProps {
  patient: PatientSummary;
  record: RecordData;
  pro: Professional | null;
  reload: () => Promise<void>;
  go: (tab: TabId, action?: "new") => void;
  signal: { tab: TabId; n: number };
}

/* ============================================================
 *  FORMATAÇÃO
 * ============================================================ */
const pad = (n: number) => String(n).padStart(2, "0");
export const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const formatDateTime = (iso?: string | null) => (iso ? `${formatDate(iso)} às ${formatTime(iso)}` : "—");
export const ageFrom = (iso?: string | null) => {
  if (!iso) return null;
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};
export const relativeDays = (iso?: string | null) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 0) return `em ${-days} dia${days === -1 ? "" : "s"}`;
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 60) return `há ${days} dias`;
  if (days < 730) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} anos`;
};
export const maskCpf = (cpf?: string | null) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "CPF não informado";
};
export const formatCpf = (cpf?: string | null) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : "______________";
};
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
export const toLocalInput = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/* ============================================================
 *  ESTILOS COMPARTILHADOS (mesmos tokens das outras páginas)
 * ============================================================ */
export const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";
export const inputCls =
  "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400";
export const areaCls =
  "w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all resize-none placeholder:text-slate-400";
export const btnDark =
  "h-10 px-5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
export const btnLight =
  "h-10 px-4 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
export const btnBlue =
  "h-10 px-5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
export const card = "bg-white border border-slate-200 rounded-2xl shadow-sm";

/* ============================================================
 *  HOOK: profissional logado (mesma regra do modal de agendamento)
 * ============================================================ */
export function useProfessional() {
  const [pro, setPro] = useState<Professional | null>(null);
  useEffect(() => {
    api<any[]>("/appointments/professionals")
      .then((list) => {
        const p = list.find((x) => /joana/i.test(x.name)) ?? list[0];
        if (p) setPro({ id: p.id, name: p.name });
      })
      .catch(() => {});
  }, []);
  return pro;
}

/* ============================================================
 *  COMPONENTES BASE
 * ============================================================ */
export function Avatar({ src, name, size = 44 }: { src?: string | null; name: string; size?: number }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover border border-slate-100 shrink-0" />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32) }}
      className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-100"
    >
      {initials(name)}
    </div>
  );
}

export function StatusBadge({ signed }: { signed: boolean }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
      <Lock className="w-2.5 h-2.5" /> Assinado
    </span>
  ) : (
    <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
      Rascunho
    </span>
  );
}

export function Seal({ signedAt, hash, author, label = "Assinado eletronicamente" }: { signedAt: string | null; hash: string | null; author?: string; label?: string }) {
  if (!signedAt) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-emerald-900">
          {label}
          {author ? ` por ${author}` : ""} em {formatDateTime(signedAt)}
        </p>
        {hash && (
          <p className="font-mono text-[10px] text-emerald-700/80 mt-0.5 truncate" title={hash}>
            SHA-256 {hash.slice(0, 20)}…{hash.slice(-8)}
          </p>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 text-blue-600">{icon}</div>
      <h3 className="text-[16px] font-black text-slate-900">{title}</h3>
      <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-md">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Chip({ active, onClick, children, tone = "dark" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: "dark" | "blue" | "rose" }) {
  const on = tone === "rose" ? "bg-rose-600 text-white border-rose-600" : tone === "blue" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-900 text-white border-slate-900";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 px-3 rounded-lg text-[12px] font-bold border transition-colors shrink-0 ${active ? on : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  width = 560,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: width }}
            className="absolute right-0 top-0 bottom-0 w-full bg-white shadow-2xl flex flex-col"
          >
            <div className="px-7 pt-6 pb-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
              <div>
                {eyebrow && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-bold text-blue-600">{eyebrow}</span>
                  </div>
                )}
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-colors">
                Esc <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/50">{children}</div>
            {footer && <div className="px-7 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  icon,
  maxWidth = 460,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  maxWidth?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18 }}
            style={{ maxWidth }}
            className="relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="px-6 pt-6 pb-4 flex items-start gap-3.5 shrink-0">
              {icon && <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">{icon}</div>}
              <h3 className="text-xl font-black text-slate-900 tracking-tight pt-2">{title}</h3>
            </div>
            <div className="px-6 pb-5 overflow-y-auto custom-scrollbar">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3 shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      icon={<AlertTriangle className={`w-5 h-5 ${danger ? "text-rose-500" : "text-amber-500"}`} />}
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={`h-10 px-5 rounded-xl text-[12px] font-bold text-white shadow-sm flex items-center gap-2 disabled:opacity-60 transition-colors ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13px] font-medium text-slate-500">{text}</p>
    </Dialog>
  );
}

/* ============================================================
 *  IMAGENS E IMPRESSÃO
 * ============================================================ */
export async function fileToDataUrl(file: File, max = 1600, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

const PRINT_CSS = `
  *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:0;padding:40px 48px;font-size:13px;line-height:1.6}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:22px}
  .brand{font-size:20px;font-weight:900;letter-spacing:-.02em} .sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;font-weight:700}
  h1{font-size:18px;margin:0 0 4px;font-weight:900} h2{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin:22px 0 8px}
  .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:8px 0} .row{display:flex;gap:24px;flex-wrap:wrap}
  .kv{font-size:11px;color:#64748b} .kv b{display:block;color:#0f172a;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:6px} th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;text-align:left;padding:6px 8px;border-bottom:1px solid #cbd5e1}
  td{padding:8px;border-bottom:1px solid #f1f5f9;vertical-align:top} p{margin:0 0 8px;white-space:pre-wrap}
  .sig{margin-top:48px;display:flex;gap:48px} .sig div{flex:1;text-align:center;font-size:11px;color:#475569} .sig .line{border-top:1px solid #0f172a;margin-bottom:6px;min-height:56px;display:flex;align-items:flex-end;justify-content:center}
  .sig img{max-height:56px} .seal{margin-top:28px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:10px 12px;font-size:10px;color:#166534} .seal code{font-size:9px;word-break:break-all}
  .foot{margin-top:36px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{body{padding:0}}
`;

export function printDocument(title: string, body: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    toast?.error("O navegador bloqueou a janela de impressão. Libere pop-ups para este site.");
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export const printHeader = (subtitle: string) =>
  `<div class="head"><div><div class="brand">${esc(CLINIC_NAME)}</div><div class="sub">Prontuário eletrônico</div></div><div class="sub">${esc(subtitle)}</div></div>`;

export const printPatientBox = (p: PatientSummary) =>
  `<div class="box row"><div class="kv">Paciente<b>${esc(p.name)}</b></div><div class="kv">CPF<b>${esc(maskCpf(p.cpf))}</b></div><div class="kv">Nascimento<b>${formatDate(p.birthDate)}</b></div><div class="kv">Telefone<b>${esc(p.phone)}</b></div></div>`;

export const printSeal = (signedAt: string | null, hash: string | null, author?: string) =>
  signedAt
    ? `<div class="seal"><b>Assinado eletronicamente${author ? ` por ${esc(author)}` : ""} em ${formatDateTime(signedAt)}</b><br/>Selo de integridade SHA-256: <code>${esc(hash ?? "")}</code></div>`
    : "";

/* ============================================================
 *  MODELOS DE DOCUMENTO (apoio — revisar com assessoria jurídica)
 * ============================================================ */
export const DOC_TYPES: Record<string, { label: string; tone: string }> = {
  TERMO_PROCEDIMENTO: { label: "Termo de procedimento", tone: "bg-blue-50 text-blue-700 border-blue-100" },
  TERMO_IMAGEM: { label: "Uso de imagem", tone: "bg-violet-50 text-violet-700 border-violet-100" },
  TERMO_LGPD: { label: "LGPD", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  ATESTADO: { label: "Atestado", tone: "bg-amber-50 text-amber-700 border-amber-100" },
  DECLARACAO: { label: "Declaração", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  OUTRO: { label: "Documento", tone: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const DOC_TEMPLATES: { id: string; type: string; title: string; body: string }[] = [
  {
    id: "toxina",
    type: "TERMO_PROCEDIMENTO",
    title: "Termo de Consentimento — Toxina Botulínica",
    body: `Eu, {{paciente}}, CPF {{cpf}}, declaro que fui informado(a) de forma clara pelo(a) profissional {{profissional}} sobre o procedimento de aplicação de toxina botulínica, suas indicações, objetivos e limitações.

Estou ciente de que podem ocorrer efeitos como dor ou hematoma no local, edema, assimetria transitória, cefaleia, queda palpebral ou de sobrancelha e, mais raramente, reações alérgicas. O resultado não é imediato e varia de pessoa para pessoa, podendo ser necessário retoque.

Informei corretamente meu histórico de saúde, alergias e medicamentos em uso, inclusive gestação ou amamentação. Comprometo-me a seguir as orientações pós-procedimento e a comparecer ao retorno agendado.

Tive a oportunidade de esclarecer minhas dúvidas e autorizo a realização do procedimento.

{{clinica}}, {{data}}.`,
  },
  {
    id: "preenchimento",
    type: "TERMO_PROCEDIMENTO",
    title: "Termo de Consentimento — Preenchimento com Ácido Hialurônico",
    body: `Eu, {{paciente}}, CPF {{cpf}}, declaro ter sido informado(a) por {{profissional}} sobre o preenchimento com ácido hialurônico, incluindo finalidade, técnica, produto utilizado e expectativas realistas de resultado.

Estou ciente dos possíveis riscos: edema, hematomas, dor, assimetrias, nódulos, infecção, reações alérgicas e, raramente, complicações vasculares graves que exigem atendimento imediato. Fui orientado(a) a procurar a clínica ou um serviço de emergência diante de dor intensa, palidez ou alteração da cor da pele na região tratada.

Declaro que prestei informações verdadeiras sobre minha saúde e que as orientações pós-procedimento foram explicadas. O resultado pode variar e ajustes podem ser necessários.

Autorizo a realização do procedimento.

{{clinica}}, {{data}}.`,
  },
  {
    id: "bioestimulador",
    type: "TERMO_PROCEDIMENTO",
    title: "Termo de Consentimento — Bioestimulador de Colágeno",
    body: `Eu, {{paciente}}, CPF {{cpf}}, declaro ter sido esclarecido(a) por {{profissional}} sobre o tratamento com bioestimulador de colágeno: o resultado é gradual, geralmente exige mais de uma sessão e depende da resposta individual do meu organismo.

Fui informado(a) sobre possíveis efeitos, como edema, hematomas, dor, nódulos, assimetrias e reações inflamatórias, além do cuidado de realizar as massagens e demais orientações recebidas.

Informei meu histórico de saúde, alergias e uso de medicamentos. Autorizo o procedimento e comprometo-me a comparecer às avaliações de acompanhamento.

{{clinica}}, {{data}}.`,
  },
  {
    id: "imagem",
    type: "TERMO_IMAGEM",
    title: "Termo de Autorização de Uso de Imagem",
    body: `Eu, {{paciente}}, CPF {{cpf}}, autorizo {{clinica}} a registrar fotografias e vídeos da região tratada, para fins de documentação clínica e acompanhamento da evolução do tratamento, que integrarão meu prontuário.

( ) Autorizo também o uso das imagens, sem identificação do meu rosto ou de dados pessoais, em materiais educativos e científicos.
( ) Autorizo o uso das imagens, com identificação, em divulgação e redes sociais da clínica.
( ) Não autorizo o uso das imagens para divulgação.

Estou ciente de que posso revogar esta autorização a qualquer momento, por solicitação por escrito, sem prejuízo ao meu atendimento.

{{clinica}}, {{data}}.`,
  },
  {
    id: "lgpd",
    type: "TERMO_LGPD",
    title: "Termo de Consentimento para Tratamento de Dados (LGPD)",
    body: `Eu, {{paciente}}, CPF {{cpf}}, declaro estar ciente de que {{clinica}} tratará meus dados pessoais e dados pessoais sensíveis de saúde para as finalidades de prestação de assistência à saúde, elaboração e guarda do prontuário, agendamento, cobrança e cumprimento de obrigações legais e regulatórias.

Fui informado(a) de que o prontuário será mantido pelo prazo mínimo exigido pela legislação (20 anos a partir do último registro), de que meus dados serão protegidos por medidas de segurança e acesso restrito, e de que posso solicitar acesso, correção e demais direitos previstos na Lei nº 13.709/2018 (LGPD) pelos canais da clínica.

{{clinica}}, {{data}}.`,
  },
  {
    id: "atestado",
    type: "ATESTADO",
    title: "Atestado",
    body: `Atesto, para os devidos fins, que {{paciente}}, CPF {{cpf}}, esteve sob atendimento nesta clínica em {{data}}, necessitando de ______ dia(s) de afastamento de suas atividades.

{{profissional}}
{{clinica}}`,
  },
  {
    id: "declaracao",
    type: "DECLARACAO",
    title: "Declaração de Comparecimento",
    body: `Declaro, para os devidos fins, que {{paciente}}, CPF {{cpf}}, compareceu a {{clinica}} em {{data}}, no período das ____:____ às ____:____, para atendimento.

{{profissional}}`,
  },
  { id: "branco", type: "OUTRO", title: "Documento", body: "" },
];

export function fillTemplate(body: string, p: PatientSummary, proName?: string) {
  const map: Record<string, string> = {
    paciente: p.name,
    cpf: formatCpf(p.cpf),
    data: new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    clinica: CLINIC_NAME,
    profissional: proName ?? "______________",
  };
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? "");
}