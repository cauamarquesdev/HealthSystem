"use client";

/**
 * TERMOS & DOCUMENTOS — página única (Next.js App Router + Tailwind + lucide-react).
 * Backend: NestJS /documentos (module/service/controller) + Prisma (ClinicalDocument, DocumentTemplate).
 *
 * Documentos · Modelos · Conformidade.
 * Assinatura presencial (tablet/ttela) ou remota por link, com hash de integridade e trilha de auditoria.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock,
  Columns3,
  Copy,
  ExternalLink,
  FilePlus2,
  FileSignature,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  Link2,
  ListChecks,
  Loader2,
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  PenLine,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Stethoscope,
  Trash2,
  Users,
  X,
} from "lucide-react";
// Ajuste os caminhos conforme onde você salvou os arquivos compartilhados.
import { api, NotificationBell, useNotificacoes } from "../../lib/notificacoes";
import {
  DocumentoRender,
  LISTA_TIPOS,
  SignaturePad,
  TIPOS_DOC,
  VARIAVEIS_SISTEMA,
  contextoTempo,
  cpfValido,
  fmtDataHora,
  formatarCpf,
  rotuloVariavel,
  substituir,
  textoParaHtml,
  variaveisCustom,
} from "../../lib/documentos";
import type { SignaturePadHandle, TipoDoc } from "../../lib/documentos";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CLINICA_NOME = "Ellevare Estética Avançada";
const UNIDADE_NOME = "Unidade Av Saudade (Matriz)";
const BASE = "/documentos";

const USUARIO = {
  nome: "Dra. Joana Oliveira",
  cargo: "Diretora Médica & Sócia",
  avatar: "",
  plano: "Plano Enterprise",
};

const NAV: { section: string; items: { label: string; href: string; icon: React.ReactNode }[] }[] = [
  {
    section: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Central de Notificações", href: "/notificacoes", icon: <Bell size={18} /> },
    ],
  },
  {
    section: "Operação",
    items: [
      { label: "Agenda", href: "/agenda", icon: <CalendarDays size={18} /> },
      { label: "Clientes", href: "/clientes", icon: <Users size={18} /> },
      { label: "CRM Kanban", href: "/crm", icon: <Columns3 size={18} /> },
      { label: "Procedimentos", href: "/procedimentos", icon: <Stethoscope size={18} /> },
      { label: "Recursos", href: "/recursos", icon: <Boxes size={18} /> },
      { label: "Lista de Espera", href: "/lista-de-espera", icon: <ListChecks size={18} /> },
    ],
  },
  {
    section: "Comercial",
    items: [

      { label: "Financeiro", href: "/financeiro", icon: <Landmark size={18} /> },
    ],
  },
  {
    section: "Gestão clínica",
    items: [
      { label: "Prontuários", href: "/prontuarios", icon: <ClipboardList size={18} /> },
      { label: "Avaliações Estéticas", href: "/avaliacoes", icon: <Star size={18} /> },
      { label: "Protocolos", href: "/protocolos", icon: <BookOpen size={18} /> },
      { label: "Fotos Clínicas", href: "/fotos", icon: <ImageIcon size={18} /> },
      { label: "Termos & Documentos", href: "/termos", icon: <FileSignature size={18} /> },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════════════════ */

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
type StatusDoc = "RASCUNHO" | "PENDENTE" | "ASSINADO" | "VENCIDO" | "CANCELADO";

type DocItem = {
  id: string;
  type: TipoDoc;
  title: string;
  status: StatusDoc;
  patient: { id: string; nome: string; telefone?: string | null };
  templateName?: string | null;
  createdAt: string;
  signedAt?: string | null;
  expiresAt?: string | null;
  canceledAt?: string | null;
  signerName?: string | null;
  signerMethod?: string | null;
  temArquivo: boolean;
  linkExpiraEm?: string | null;
  criadoPor?: string | null;
};

type DocDetalhe = DocItem & {
  content: string;
  validityDays?: number | null;
  canceledReason?: string | null;
  signerCpfMascarado?: string | null;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  signatureData?: string | null;
  signatureHash?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
  fileData?: string | null;
  linkToken?: string | null;
};

type Modelo = {
  id: string;
  name: string;
  type: TipoDoc;
  description?: string | null;
  content: string;
  validityDays?: number | null;
  active: boolean;
  isDefault: boolean;
  usos?: number;
};

type Resumo = {
  total: number;
  rascunhos: number;
  pendentes: number;
  assinados: number;
  vencidos: number;
  cancelados: number;
  assinadosMes: number;
  vencendo30: number;
  conformidade: number;
};

type Requisito = {
  tipo: TipoDoc;
  label: string;
  assinados: number;
  faltando: number;
  percentual: number;
  pendentes: { id: string; nome: string; telefone?: string | null; temLink: boolean }[];
};
type Conformidade = { totalPacientes: number; percentualGeral: number; requisitos: Requisito[] };

type PacienteDoc = { id: string; nome: string; telefone?: string | null; cpf?: string | null; nascimento?: string | null; email?: string | null };

const STATUS_META: Record<StatusDoc, { label: string; tone: Tone }> = {
  RASCUNHO: { label: "Rascunho", tone: "neutral" },
  PENDENTE: { label: "Aguardando assinatura", tone: "warning" },
  ASSINADO: { label: "Assinado", tone: "success" },
  VENCIDO: { label: "Vencido", tone: "danger" },
  CANCELADO: { label: "Cancelado", tone: "neutral" },
};

const STATUS_FILTROS: { v: StatusDoc | "TODOS"; label: string }[] = [
  { v: "TODOS", label: "Todos" },
  { v: "RASCUNHO", label: "Rascunhos" },
  { v: "PENDENTE", label: "Aguardando" },
  { v: "ASSINADO", label: "Assinados" },
  { v: "VENCIDO", label: "Vencidos" },
  { v: "CANCELADO", label: "Cancelados" },
];

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
};

const iniciais = (nome = "") =>
  nome
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const linkPublico = (token: string) => `${window.location.origin}/assinar/${token}`;

function linkWhatsapp(d: { patient: { nome: string; telefone?: string | null }; title: string; linkExpiraEm?: string | null }, link: string) {
  const dig = (d.patient.telefone ?? "").replace(/\D/g, "");
  if (dig.length < 10) return null;
  const numero = dig.length <= 11 ? `55${dig}` : dig;
  const primeiro = d.patient.nome.split(" ")[0];
  const ate = d.linkExpiraEm ? ` (disponível até ${fmtDate(d.linkExpiraEm)})` : "";
  const msg = `Olá, ${primeiro}! A ${CLINICA_NOME} enviou o documento "${d.title}" para você assinar digitalmente${ate}: ${link}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = document.createElement("textarea");
    t.value = texto;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

async function abrirDataUrl(dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const lerArquivo = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(f);
  });

const escHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function imprimirDocumento(d: DocDetalhe) {
  const w = window.open("", "_blank", "width=860,height=1000");
  if (!w) return;
  const assinado = !!d.signedAt;
  const evidencias = assinado
    ? `<div class="sign">
        ${d.signatureData ? `<img src="${d.signatureData}" alt="Assinatura">` : ""}
        <div class="line"></div>
        <p><b>${escHtml(d.signerName)}</b>${d.signerCpfMascarado ? ` · CPF ${escHtml(d.signerCpfMascarado)}` : ""}</p>
        <p class="ev">Assinado eletronicamente em ${escHtml(fmtDataHora(d.signedAt))} · Método: ${escHtml(d.signerMethod ?? "—")}${d.signerIp ? ` · IP ${escHtml(d.signerIp)}` : ""}</p>
        <p class="ev">Código de integridade (SHA-256): ${escHtml(d.signatureHash)}</p>
      </div>`
    : `<div class="sign"><div class="line" style="margin-top:70px"></div><p><b>${escHtml(d.patient.nome)}</b></p></div>`;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(d.title)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:40px;max-width:780px;margin:auto;font-size:13.5px;line-height:1.6;position:relative}
    .clinica{text-align:center;color:#2563eb;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px}
    h1{font-size:18px;text-align:center;margin:14px 0}h2{font-size:14px;margin:18px 0 4px}p{margin:5px 0}ul{margin:6px 0 6px 20px;padding:0}li{margin:3px 0}
    .sign{margin-top:46px;text-align:center;break-inside:avoid}.sign img{max-height:90px}.line{border-top:1px solid #0f172a;width:60%;margin:4px auto 6px}
    .ev{font-size:10.5px;color:#64748b;word-break:break-all}
    .cancel{border:2px solid #be123c;color:#be123c;border-radius:10px;padding:8px 12px;margin-bottom:14px;font-weight:700;text-align:center}
    footer{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:10.5px;color:#94a3b8;text-align:center}
  </style></head><body>
  <div class="clinica">${escHtml(CLINICA_NOME)}</div>
  ${d.canceledAt ? `<div class="cancel">DOCUMENTO CANCELADO em ${escHtml(fmtDate(d.canceledAt))}${d.canceledReason ? ` — ${escHtml(d.canceledReason)}` : ""}</div>` : ""}
  ${textoParaHtml(d.content)}
  ${evidencias}
  <footer>Paciente: ${escHtml(d.patient.nome)} · Documento gerado em ${escHtml(fmtDate(d.createdAt))}</footer>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* ═══════════════════════════════════════════════════════════════
   UI BASE
   ═══════════════════════════════════════════════════════════════ */

const toneClass: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass[tone]}`}>{children}</span>;
}

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnBlue =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500";

function IconBtn({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 ${danger ? "hover:text-rose-600" : "hover:text-blue-600"}`}
    >
      {children}
    </button>
  );
}

function Avatar({ nome, size = 36, foto }: { nome: string; size?: number; foto?: string }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-700" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden>
      {iniciais(nome)}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, size = "md" }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; size?: "md" | "lg" | "xl" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const w = size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-3xl" : "max-w-md";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`${card} flex max-h-[94vh] w-full flex-col ${w}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ message, confirmLabel = "Confirmar", danger, onConfirm, onClose }: { message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Confirmar ação" onClose={onClose}>
      <p className="px-6 py-5 text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        <button
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              onClose();
            }
          }}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

type ToastMsg = { id: number; text: string; tone: "ok" | "err" };
type ToastFn = (t: string, tone?: "ok" | "err") => void;

function Toasts({ list }: { list: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[95] flex flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${t.tone === "ok" ? "bg-slate-900" : "bg-rose-600"}`}>
          {t.tone === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function TipoTile({ tipo, size = 40 }: { tipo: TipoDoc; size?: number }) {
  const m = TIPOS_DOC[tipo] ?? TIPOS_DOC.OUTRO;
  const Icon = m.icon;
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${m.tile}`} style={{ width: size, height: size }}>
      <Icon size={size * 0.45} />
    </span>
  );
}

function PacientePicker({ value, onPick, disabled }: { value: PacienteDoc | null; onPick: (p: PacienteDoc | null) => void; disabled?: boolean }) {
  const [q, setQ] = useState(value?.nome ?? "");
  const [open, setOpen] = useState(false);
  const [lista, setLista] = useState<PacienteDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q, 250);

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setLoading(true);
    api<PacienteDoc[]>(`${BASE}/pacientes?search=${encodeURIComponent(dq)}`)
      .then((r) => vivo && setLista(Array.isArray(r) ? r : []))
      .catch(() => vivo && setLista([]))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [dq, open]);

  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className={`${inputCls} pl-9 ${value ? "border-emerald-300" : ""}`}
        placeholder="Buscar paciente pelo nome…"
        value={q}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          if (value) onPick(null);
        }}
        aria-label="Paciente"
      />
      {value && <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
      {open && (
        <ul className={`${card} absolute z-20 mt-1 max-h-56 w-full overflow-y-auto p-1`}>
          {loading && <li className="px-3 py-2 text-xs text-slate-500">Buscando…</li>}
          {!loading && lista.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Nenhum paciente encontrado.</li>}
          {lista.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(p);
                  setQ(p.nome);
                  setOpen(false);
                }}
              >
                <Avatar nome={p.nome} size={24} /> {p.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOVO / EDITAR DOCUMENTO
   ═══════════════════════════════════════════════════════════════ */

type Acao = "rascunho" | "assinar" | "link";

type NovoInicial = { modelo?: Modelo; paciente?: PacienteDoc; base?: { titulo: string; tipo: TipoDoc; conteudo: string } };

function ModalDocumento({ modelos, inicial, editando, onClose, onSalvo }: { modelos: Modelo[]; inicial?: NovoInicial; editando?: DocDetalhe; onClose: () => void; onSalvo: (doc: DocDetalhe, acao: Acao) => void }) {
  const ativos = useMemo(() => modelos.filter((m) => m.active), [modelos]);
  const [paciente, setPaciente] = useState<PacienteDoc | null>(inicial?.paciente ?? null);
  const [modeloId, setModeloId] = useState<string>(inicial?.modelo?.id ?? "");
  const [titulo, setTitulo] = useState(editando?.title ?? inicial?.modelo?.name ?? inicial?.base?.titulo ?? "");
  const [tipo, setTipo] = useState<TipoDoc>(editando?.type ?? inicial?.modelo?.type ?? inicial?.base?.tipo ?? "TERMO_PROCEDIMENTO");
  const [conteudo, setConteudo] = useState(editando?.content ?? inicial?.modelo?.content ?? inicial?.base?.conteudo ?? "");
  const [validade, setValidade] = useState(String(editando?.validityDays ?? inicial?.modelo?.validityDays ?? ""));
  const [vars, setVars] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Acao | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const escolherModelo = (id: string) => {
    setModeloId(id);
    const m = ativos.find((x) => x.id === id);
    if (m) {
      setTitulo(m.name);
      setTipo(m.type);
      setConteudo(m.content);
      setValidade(m.validityDays ? String(m.validityDays) : "");
      setVars({});
    } else {
      setTitulo("");
      setConteudo("");
      setValidade("");
    }
  };

  const customs = useMemo(() => variaveisCustom(conteudo), [conteudo]);

  const ctxPreview = useMemo(() => {
    const c: Record<string, string> = { ...contextoTempo(), "clinica.nome": CLINICA_NOME, "profissional.nome": USUARIO.nome };
    const p = paciente ?? (editando ? { nome: editando.patient.nome } : null);
    if (p) c["paciente.nome"] = p.nome;
    if (paciente) {
      c["paciente.cpf"] = paciente.cpf ?? "—";
      c["paciente.nascimento"] = paciente.nascimento ?? "—";
      c["paciente.telefone"] = paciente.telefone ?? "—";
      c["paciente.email"] = paciente.email ?? "—";
    }
    return { ...c, ...vars };
  }, [paciente, vars, editando]);

  const salvar = async (acao: Acao) => {
    setErr(null);
    if (!editando && !paciente) return setErr("Selecione o paciente.");
    if (!titulo.trim()) return setErr("Informe o título do documento.");
    if (!conteudo.trim()) return setErr("O documento está sem conteúdo.");
    if (acao !== "rascunho") {
      const faltam = customs.filter((c) => !vars[c]?.trim());
      if (!editando && faltam.length) return setErr(`Preencha os campos: ${faltam.map(rotuloVariavel).join(", ")}.`);
    }
    setBusy(acao);
    try {
      const payload = {
        patientId: paciente?.id,
        templateId: modeloId || undefined,
        type: tipo,
        title: titulo.trim(),
        content: conteudo,
        variaveis: vars,
        validityDays: validade.trim() ? Number(validade) : null,
      };
      const doc = editando
        ? await api<DocDetalhe>(`${BASE}/${editando.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<DocDetalhe>(BASE, { method: "POST", body: JSON.stringify(payload) });
      onSalvo(doc, acao);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar o documento.");
    } finally {
      setBusy(null);
    }
  };

  const textoPreview = substituir(conteudo, ctxPreview);

  return (
    <Modal size="xl" title={editando ? "Editar documento" : "Novo documento"} subtitle={editando ? `Paciente: ${editando.patient.nome}` : "Escolha o paciente e o modelo. As variáveis são preenchidas automaticamente."} onClose={onClose}>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[420px_1fr] lg:overflow-hidden">
        <div className="space-y-4 border-b border-slate-100 px-6 py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {!editando && (
            <Field label="Paciente *">
              <PacientePicker value={paciente} onPick={setPaciente} />
            </Field>
          )}
          {!editando && (
            <Field label="Modelo">
              <select className={inputCls} value={modeloId} onChange={(e) => escolherModelo(e.target.value)}>
                <option value="">{inicial?.base ? "Baseado no documento anterior" : "Documento em branco"}</option>
                {ativos.map((m) => <option key={m.id} value={m.id}>{TIPOS_DOC[m.type]?.curto ?? m.type} — {m.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" className="col-span-2 sm:col-span-1">
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc)}>
                {LISTA_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DOC[t].label}</option>)}
              </select>
            </Field>
            <Field label="Validade (dias)" hint="Contada da assinatura" className="col-span-2 sm:col-span-1">
              <input type="number" min={1} className={inputCls} placeholder="Sem validade" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </Field>
          </div>
          <Field label="Título *">
            <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Field>

          {!editando && customs.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <p className={`${eyebrow} !text-amber-700`}>Campos deste documento</p>
              {customs.map((c) => (
                <Field key={c} label={rotuloVariavel(c)}>
                  <input className={inputCls} value={vars[c] ?? ""} onChange={(e) => setVars((v) => ({ ...v, [c]: e.target.value }))} />
                </Field>
              ))}
            </div>
          )}

          <Field label="Texto do documento" hint="# Título · ## Subtítulo · - lista · **negrito** · {{variável}}">
            <textarea rows={editando ? 12 : 8} className={`${inputCls} font-mono text-[12.5px] leading-relaxed`} value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          </Field>

          {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{err}</p>}
        </div>

        <div className="bg-slate-100/70 px-4 py-5 sm:px-8 lg:overflow-y-auto">
          <p className={`${eyebrow} mb-3 text-center`}>Pré-visualização</p>
          <div className="mx-auto min-h-[420px] max-w-[640px] rounded-lg bg-white px-8 py-8 shadow-md">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{CLINICA_NOME}</p>
            {conteudo.trim() ? <DocumentoRender texto={textoPreview} /> : <p className="py-16 text-center text-sm text-slate-400">Escolha um modelo ou escreva o texto do documento.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose} disabled={!!busy}>Cancelar</button>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => void salvar("rascunho")} disabled={!!busy}>
            {busy === "rascunho" && <Loader2 size={15} className="animate-spin" />} {editando ? "Salvar alterações" : "Salvar rascunho"}
          </button>
          <button className={btnGhost} onClick={() => void salvar("link")} disabled={!!busy}>
            {busy === "link" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {editando ? "Salvar e enviar link" : "Criar e enviar link"}
          </button>
          <button className={btnBlue} onClick={() => void salvar("assinar")} disabled={!!busy}>
            {busy === "assinar" ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />} {editando ? "Salvar e assinar agora" : "Criar e assinar agora"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSINATURA PRESENCIAL
   ═══════════════════════════════════════════════════════════════ */

function ModalAssinar({ docId, onClose, onAssinado }: { docId: string; onClose: () => void; onAssinado: (d: DocDetalhe) => void }) {
  const [doc, setDoc] = useState<DocDetalhe | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [aceite, setAceite] = useState(false);
  const [temTraco, setTemTraco] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pad = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    api<DocDetalhe>(`${BASE}/${docId}`)
      .then((d) => {
        setDoc(d);
        setNome(d.patient.nome);
      })
      .catch((e: unknown) => setErroCarga(e instanceof Error ? e.message : "Não foi possível abrir o documento."));
  }, [docId]);

  const assinar = async () => {
    setErr(null);
    if (nome.trim().length < 3) return setErr("Informe o nome completo de quem assina.");
    if (cpf && !cpfValido(cpf)) return setErr("CPF inválido.");
    const sig = pad.current?.dataUrl();
    if (!sig) return setErr("Desenhe a assinatura no quadro.");
    if (!aceite) return setErr("Confirme que o signatário leu e concorda com o documento.");
    setBusy(true);
    try {
      const d = await api<DocDetalhe>(`${BASE}/${docId}/assinar`, { method: "POST", body: JSON.stringify({ signerName: nome.trim(), signerCpf: cpf, signatureData: sig }) });
      onAssinado(d);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível registrar a assinatura.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="xl" title="Coletar assinatura" subtitle={doc ? `${doc.title} · ${doc.patient.nome}` : undefined} onClose={busy ? () => {} : onClose}>
      {!doc ? (
        <div className="grid flex-1 place-items-center p-16 text-sm text-slate-500">{erroCarga ? <span className="text-rose-600">{erroCarga}</span> : <Loader2 className="animate-spin" />}</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_400px] lg:overflow-hidden">
          <div className="bg-slate-100/70 px-4 py-5 sm:px-8 lg:overflow-y-auto">
            <div className="mx-auto max-w-[640px] rounded-lg bg-white px-8 py-8 shadow-md">
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{CLINICA_NOME}</p>
              <DocumentoRender texto={doc.content} />
            </div>
          </div>
          <div className="space-y-4 border-t border-slate-100 px-6 py-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <p className="text-xs text-slate-500">Entregue a tela ao paciente. Após a assinatura, o documento fica bloqueado para edição.</p>
            <Field label="Nome completo de quem assina">
              <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="CPF (opcional)">
              <input className={inputCls} inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} />
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Assinatura</span>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => { pad.current?.limpar(); setTemTraco(false); }}>Limpar</button>
              </div>
              <SignaturePad ref={pad} onChange={setTemTraco} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span className="text-xs text-slate-700">O signatário leu e compreendeu o documento e concorda com o seu conteúdo.</span>
            </label>
            {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{err}</p>}
            <button className={`${btnBlue} w-full !py-3`} onClick={() => void assinar()} disabled={busy || !aceite || !temTraco}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />} Confirmar assinatura
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LINK DE ASSINATURA REMOTA
   ═══════════════════════════════════════════════════════════════ */

function ModalLink({ doc: inicial, onClose, onAtualizado, toast }: { doc: DocDetalhe; onClose: () => void; onAtualizado: (d: DocDetalhe) => void; toast: ToastFn }) {
  const [doc, setDoc] = useState<DocDetalhe>(inicial);
  const [dias, setDias] = useState("7");
  const [busy, setBusy] = useState<"gerar" | "revogar" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const gerar = useCallback(
    async (d: string) => {
      setBusy("gerar");
      setErr(null);
      try {
        const novo = await api<DocDetalhe>(`${BASE}/${inicial.id}/link`, { method: "POST", body: JSON.stringify({ dias: Number(d) }) });
        setDoc(novo);
        onAtualizado(novo);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Não foi possível gerar o link.");
      } finally {
        setBusy(null);
      }
    },
    [inicial.id, onAtualizado],
  );

  useEffect(() => {
    if (!inicial.linkToken) void gerar("7");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revogar = async () => {
    setBusy("revogar");
    try {
      const novo = await api<DocDetalhe>(`${BASE}/${doc.id}/link`, { method: "DELETE" });
      setDoc(novo);
      onAtualizado(novo);
      toast("Link revogado");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível revogar o link.");
    } finally {
      setBusy(null);
    }
  };

  const link = doc.linkToken ? linkPublico(doc.linkToken) : "";
  const wa = link ? linkWhatsapp(doc, link) : null;

  return (
    <Modal title="Enviar para assinatura" subtitle={`${doc.title} · ${doc.patient.nome}`} onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        {busy === "gerar" && !link ? (
          <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : link ? (
          <>
            <p className="text-sm text-slate-600">O paciente abre o link no celular, lê o documento e assina com o dedo. Você é avisado quando ele assinar.</p>
            <div className="flex gap-2">
              <input readOnly className={`${inputCls} font-mono text-xs`} value={link} onFocus={(e) => e.target.select()} aria-label="Link de assinatura" />
              <button className={btnGhost} onClick={() => void copiar(link).then(() => toast("Link copiado"))}><Copy size={14} /> Copiar</button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock size={13} /> Válido até <strong className="text-slate-700">{fmtDataHora(doc.linkExpiraEm)}</strong> · uso único</p>
            <div className="flex flex-wrap gap-2">
              {wa ? (
                <a className={`${btnBlue} !bg-emerald-600 hover:!bg-emerald-700`} href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Enviar por WhatsApp</a>
              ) : (
                <span className="self-center text-xs text-amber-700">Paciente sem telefone válido para WhatsApp.</span>
              )}
              <a className={btnGhost} href={link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Pré-visualizar</a>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
              <Field label="Novo link com validade de" className="w-40">
                <select className={inputCls} value={dias} onChange={(e) => setDias(e.target.value)}>
                  {["1", "3", "7", "15", "30"].map((d) => <option key={d} value={d}>{d} dia{d === "1" ? "" : "s"}</option>)}
                </select>
              </Field>
              <button className={btnGhost} onClick={() => void gerar(dias)} disabled={!!busy}>{busy === "gerar" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Gerar novo link</button>
              <button className={`${btnGhost} hover:!text-rose-600`} onClick={() => void revogar()} disabled={!!busy}><Ban size={14} /> Revogar</button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-600">Não há link ativo para este documento.</p>
            <button className={`${btnBlue} mt-3`} onClick={() => void gerar("7")} disabled={!!busy}><Link2 size={15} /> Gerar link de assinatura</button>
          </div>
        )}
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{err}</p>}
      </div>
      <div className="flex justify-end border-t border-slate-100 px-6 py-4"><button className={btnPrimary} onClick={onClose}>Concluir</button></div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANEXAR DOCUMENTO FÍSICO · CANCELAR
   ═══════════════════════════════════════════════════════════════ */

function ModalAnexar({ onClose, onSalvo }: { onClose: () => void; onSalvo: (d: DocDetalhe) => void }) {
  const [paciente, setPaciente] = useState<PacienteDoc | null>(null);
  const [tipo, setTipo] = useState<TipoDoc>("TERMO_PROCEDIMENTO");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(new Date().toLocaleDateString("en-CA"));
  const [validade, setValidade] = useState("");
  const [arquivo, setArquivo] = useState<{ nome: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const escolher = async (f?: File) => {
    if (!f) return;
    setErr(null);
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) return setErr("Use PDF, JPG, PNG ou WebP.");
    if (f.size > 6 * 1024 * 1024) return setErr("O arquivo passa de 6 MB.");
    setArquivo({ nome: f.name, dataUrl: await lerArquivo(f) });
    if (!titulo.trim()) setTitulo(f.name.replace(/\.[^.]+$/, ""));
  };

  const salvar = async () => {
    setErr(null);
    if (!paciente) return setErr("Selecione o paciente.");
    if (!titulo.trim()) return setErr("Informe o título.");
    if (!arquivo) return setErr("Anexe o arquivo digitalizado.");
    setBusy(true);
    try {
      const d = await api<DocDetalhe>(`${BASE}/anexar`, {
        method: "POST",
        body: JSON.stringify({ patientId: paciente.id, type: tipo, title: titulo.trim(), signedAt: data, validityDays: validade ? Number(validade) : null, fileData: arquivo.dataUrl, fileName: arquivo.nome }),
      });
      onSalvo(d);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível anexar o documento.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title="Anexar documento assinado em papel" subtitle="Registre o termo já assinado fisicamente. Ele passa a valer como assinado no sistema." onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label="Paciente *" className="sm:col-span-2"><PacientePicker value={paciente} onPick={setPaciente} /></Field>
        <Field label="Tipo"><select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc)}>{LISTA_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DOC[t].label}</option>)}</select></Field>
        <Field label="Data da assinatura"><input type="date" className={inputCls} value={data} max={new Date().toLocaleDateString("en-CA")} onChange={(e) => setData(e.target.value)} /></Field>
        <Field label="Título *" className="sm:col-span-2"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
        <Field label="Validade (dias)" hint="Opcional"><input type="number" min={1} className={inputCls} value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Paperclip size={16} /> {arquivo ? arquivo.nome : "Escolher arquivo (PDF, JPG ou PNG até 6 MB)"}
          </button>
          <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{err}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose} disabled={busy}>Cancelar</button>
        <button className={btnBlue} onClick={() => void salvar()} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Registrar documento</button>
      </div>
    </Modal>
  );
}

function ModalCancelar({ doc, onClose, onCancelado }: { doc: DocDetalhe | DocItem; onClose: () => void; onCancelado: (d: DocDetalhe) => void }) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const assinado = !!doc.signedAt;

  const confirmar = async () => {
    if (!motivo.trim()) return setErr("Informe o motivo.");
    setBusy(true);
    try {
      const d = await api<DocDetalhe>(`${BASE}/${doc.id}/cancelar`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) });
      onCancelado(d);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={assinado ? "Revogar documento assinado" : "Cancelar documento"} subtitle={doc.title} onClose={onClose}>
      <div className="space-y-3 px-6 py-5">
        {assinado && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" /> O documento deixa de valer como consentimento. O histórico é mantido, e módulos como Fotos Clínicas passam a tratar o termo como pendente.
          </p>
        )}
        <Field label="Motivo *"><textarea rows={3} className={inputCls} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={assinado ? "Ex.: paciente revogou o consentimento" : "Ex.: criado por engano"} autoFocus /></Field>
        {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose} disabled={busy}>Voltar</button>
        <button className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" onClick={() => void confirmar()} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} {assinado ? "Revogar" : "Cancelar documento"}</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EDITOR DE MODELO
   ═══════════════════════════════════════════════════════════════ */

const SAMPLE_CTX: Record<string, string> = {
  "paciente.nome": "Maria da Silva",
  "paciente.cpf": "123.456.789-09",
  "paciente.nascimento": "14/03/1990",
  "paciente.telefone": "(34) 99999-0000",
  "paciente.email": "maria@email.com",
  "clinica.nome": CLINICA_NOME,
  "profissional.nome": USUARIO.nome,
};

function ModalModelo({ item, onClose, onSalvo }: { item?: Modelo; onClose: () => void; onSalvo: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<TipoDoc>(item?.type ?? "TERMO_PROCEDIMENTO");
  const [description, setDescription] = useState(item?.description ?? "");
  const [validityDays, setValidityDays] = useState(item?.validityDays ? String(item.validityDays) : "");
  const [content, setContent] = useState(item?.content ?? "# TÍTULO DO DOCUMENTO\n\nEu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, declaro que…\n\nData: {{data.extenso}}.");
  const [novoCampo, setNovoCampo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const inserir = (texto: string) => {
    const el = area.current;
    if (!el) return setContent((c) => c + texto);
    const ini = el.selectionStart ?? content.length;
    const fim = el.selectionEnd ?? content.length;
    setContent(content.slice(0, ini) + texto + content.slice(fim));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(ini + texto.length, ini + texto.length);
    }, 0);
  };

  const salvar = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Informe o nome do modelo.");
    if (!content.trim()) return setErr("O modelo está sem conteúdo.");
    setBusy(true);
    try {
      const body = JSON.stringify({ name: name.trim(), type, description: description.trim() || null, content, validityDays: validityDays ? Number(validityDays) : null });
      if (item) await api(`${BASE}/modelos/${item.id}`, { method: "PUT", body });
      else await api(`${BASE}/modelos`, { method: "POST", body });
      onSalvo();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar o modelo.");
    } finally {
      setBusy(false);
    }
  };

  const preview = substituir(content, { ...contextoTempo(), ...SAMPLE_CTX });

  return (
    <Modal size="xl" title={item ? "Editar modelo" : "Novo modelo"} subtitle="Variáveis entre {{ }} são preenchidas automaticamente ao gerar o documento" onClose={onClose}>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[460px_1fr] lg:overflow-hidden">
        <div className="space-y-4 border-b border-slate-100 px-6 py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <Field label="Nome do modelo *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value as TipoDoc)}>{LISTA_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DOC[t].label}</option>)}</select></Field>
            <Field label="Validade (dias)" hint="Da assinatura"><input type="number" min={1} className={inputCls} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} /></Field>
          </div>
          <Field label="Descrição"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve este modelo" /></Field>

          <div>
            <p className={`${eyebrow} mb-2`}>Inserir variável</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS_SISTEMA.map((v) => (
                <button key={v.k} type="button" title={v.l} onClick={() => inserir(`{{${v.k}}}`)} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">{v.k}</button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input className={`${inputCls} !py-1.5 text-xs`} placeholder="Campo para preencher (ex.: procedimento)" value={novoCampo} onChange={(e) => setNovoCampo(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} />
              <button type="button" className={`${btnGhost} !py-1.5 text-xs`} disabled={!novoCampo} onClick={() => { inserir(`{{${novoCampo}}}`); setNovoCampo(""); }}><Plus size={13} /> Campo</button>
            </div>
          </div>

          <Field label="Texto" hint="# Título · ## Subtítulo · - lista · **negrito**">
            <textarea ref={area} rows={14} className={`${inputCls} font-mono text-[12.5px] leading-relaxed`} value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
          {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{err}</p>}
        </div>
        <div className="bg-slate-100/70 px-4 py-5 sm:px-8 lg:overflow-y-auto">
          <p className={`${eyebrow} mb-3 text-center`}>Pré-visualização (dados de exemplo)</p>
          <div className="mx-auto max-w-[640px] rounded-lg bg-white px-8 py-8 shadow-md">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{CLINICA_NOME}</p>
            <DocumentoRender texto={preview} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose} disabled={busy}>Cancelar</button>
        <button className={btnBlue} onClick={() => void salvar()} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Salvar modelo</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GAVETA DE DETALHES DO DOCUMENTO
   ═══════════════════════════════════════════════════════════════ */

function Evidencia({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="shrink-0 text-xs text-slate-500">{rotulo}</dt>
      <dd className="min-w-0 break-words text-right text-xs font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

function DocumentoDrawer({ id, versao, onClose, onEditar, onAssinar, onLink, onCancelar, onExcluir, onRenovar, toast }: { id: string; versao: number; onClose: () => void; onEditar: (d: DocDetalhe) => void; onAssinar: (d: DocDetalhe) => void; onLink: (d: DocDetalhe) => void; onCancelar: (d: DocDetalhe) => void; onExcluir: (d: DocDetalhe) => void; onRenovar: (d: DocDetalhe) => void; toast: ToastFn }) {
  const [d, setD] = useState<DocDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [integridade, setIntegridade] = useState<{ integro: boolean } | null>(null);
  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setD(await api<DocDetalhe>(`${BASE}/${id}`));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o documento");
    }
  }, [id]);

  useEffect(() => {
    setD(null);
    setIntegridade(null);
  }, [id]);
  useEffect(() => {
    void carregar();
  }, [carregar, versao]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const verificar = async () => {
    setVerificando(true);
    try {
      setIntegridade(await api<{ integro: boolean }>(`${BASE}/${id}/verificar`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível verificar", "err");
    } finally {
      setVerificando(false);
    }
  };

  const st = d ? STATUS_META[d.status] : null;
  const podeAssinar = d && (d.status === "RASCUNHO" || d.status === "PENDENTE");
  const assinado = d && (d.status === "ASSINADO" || d.status === "VENCIDO");

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/30 backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-[620px] flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalhes do documento">
        {!d ? (
          <div className="grid flex-1 place-items-center p-10 text-center">
            {erro ? <div><p className="text-sm text-rose-600">{erro}</p><button className={`${btnGhost} mt-3`} onClick={() => void carregar()}>Tentar de novo</button></div> : <Loader2 className="animate-spin text-slate-300" />}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <TipoTile tipo={d.type} size={44} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">{TIPOS_DOC[d.type]?.label}</p>
                    <h2 className="text-lg font-extrabold leading-tight tracking-tight text-slate-900">{d.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{d.patient.nome} · criado em {fmtDate(d.createdAt)}{d.criadoPor ? ` por ${d.criadoPor}` : ""}</p>
                  </div>
                </div>
                <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {st && <Badge tone={st.tone}>{st.label}</Badge>}
                {d.status === "PENDENTE" && d.linkExpiraEm && <Badge tone="warning"><Clock size={11} /> link até {fmtDate(d.linkExpiraEm)}</Badge>}
                {d.expiresAt && d.status !== "CANCELADO" && <Badge tone={d.status === "VENCIDO" ? "danger" : "info"}>validade {fmtDate(d.expiresAt)}</Badge>}
                {d.templateName && <Badge>{d.templateName}</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {podeAssinar && <button className={`${btnBlue} !py-2`} onClick={() => onAssinar(d)}><PenLine size={14} /> Assinar agora</button>}
                {podeAssinar && <button className={btnGhost} onClick={() => onLink(d)}><Send size={14} /> {d.status === "PENDENTE" ? "Ver link" : "Enviar link"}</button>}
                {d.status === "RASCUNHO" && <button className={btnGhost} onClick={() => onEditar(d)}><Pencil size={14} /> Editar</button>}
                {!d.temArquivo && <button className={btnGhost} onClick={() => imprimirDocumento(d)}><Printer size={14} /> Imprimir / PDF</button>}
                {(assinado || d.status === "CANCELADO") && <button className={btnGhost} onClick={() => onRenovar(d)}><FilePlus2 size={14} /> Gerar novo</button>}
                {d.status !== "CANCELADO" && (d.status !== "RASCUNHO" || d.signedAt) && <button className={`${btnGhost} hover:!text-rose-600`} onClick={() => onCancelar(d)}><Ban size={14} /> {d.signedAt ? "Revogar" : "Cancelar"}</button>}
                {!d.signedAt && <IconBtn label="Excluir" danger onClick={() => onExcluir(d)}><Trash2 size={16} /></IconBtn>}
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-slate-100/70 p-5">
              {d.status === "CANCELADO" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-bold">Documento cancelado em {fmtDate(d.canceledAt)}</p>
                  {d.canceledReason && <p className="mt-0.5 text-xs">Motivo: {d.canceledReason}</p>}
                </div>
              )}

              {d.temArquivo ? (
                <div className={`${card} flex items-center gap-3 p-4`}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><Paperclip size={20} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{d.fileName}</p><p className="text-xs text-slate-500">Documento físico digitalizado · {d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : ""}</p></div>
                  {d.fileData && <button className={btnGhost} onClick={() => void abrirDataUrl(d.fileData!)}><ExternalLink size={14} /> Abrir</button>}
                </div>
              ) : (
                <div className="rounded-lg bg-white px-7 py-7 shadow-md">
                  <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{CLINICA_NOME}</p>
                  <DocumentoRender texto={d.content} />
                  {d.signatureData && (
                    <div className="mt-8 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.signatureData} alt="Assinatura" className="mx-auto max-h-24" />
                      <div className="mx-auto mt-1 w-3/5 border-t border-slate-800" />
                      <p className="mt-1 text-xs font-bold text-slate-900">{d.signerName}</p>
                    </div>
                  )}
                </div>
              )}

              {d.signedAt && (
                <section className={`${card} p-4`} aria-label="Evidências da assinatura">
                  <div className="mb-1 flex items-center justify-between">
                    <p className={eyebrow}>Evidências da assinatura</p>
                    <button className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => void verificar()} disabled={verificando}>
                      {verificando ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Verificar integridade
                    </button>
                  </div>
                  {integridade && (
                    <p className={`my-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${integridade.integro ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {integridade.integro ? <><CheckCircle2 size={14} /> Íntegro: o conteúdo não foi alterado desde a assinatura.</> : <><AlertTriangle size={14} /> ATENÇÃO: o conteúdo difere do que foi assinado.</>}
                    </p>
                  )}
                  <dl>
                    <Evidencia rotulo="Assinante">{d.signerName}</Evidencia>
                    {d.signerCpfMascarado && <Evidencia rotulo="CPF">{d.signerCpfMascarado}</Evidencia>}
                    <Evidencia rotulo="Data e hora">{fmtDataHora(d.signedAt)}</Evidencia>
                    <Evidencia rotulo="Método">{d.signerMethod === "REMOTO" ? "Remoto (link)" : d.signerMethod === "PAPEL" ? "Papel digitalizado" : "Presencial"}</Evidencia>
                    {d.signerIp && <Evidencia rotulo="IP">{d.signerIp}</Evidencia>}
                    {d.signerUserAgent && <Evidencia rotulo="Dispositivo"><span className="font-medium text-slate-500">{d.signerUserAgent.slice(0, 90)}</span></Evidencia>}
                    <Evidencia rotulo="Hash SHA-256"><button className="break-all text-left font-mono text-[10px] font-medium text-slate-500 hover:text-blue-600" title="Copiar" onClick={() => void copiar(d.signatureHash ?? "").then(() => toast("Hash copiado"))}>{d.signatureHash}</button></Evidencia>
                  </dl>
                </section>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABAS: MODELOS · CONFORMIDADE
   ═══════════════════════════════════════════════════════════════ */

function AbaModelos({ modelos, loading, onNovo, onEditar, onUsar, onDuplicar, onAlternar, onExcluir }: { modelos: Modelo[]; loading: boolean; onNovo: () => void; onEditar: (m: Modelo) => void; onUsar: (m: Modelo) => void; onDuplicar: (m: Modelo) => void; onAlternar: (m: Modelo, v: boolean) => void; onExcluir: (m: Modelo) => void }) {
  if (loading) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">Modelos com variáveis automáticas (nome, CPF, data…). Os modelos iniciais são pontos de partida: revise com a assessoria jurídica antes de usar.</p>
        <button className={btnPrimary} onClick={onNovo}><Plus size={15} /> Novo modelo</button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modelos.map((m) => (
          <article key={m.id} className={`${card} flex flex-col p-5 ${m.active ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <TipoTile tipo={m.type} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">{TIPOS_DOC[m.type]?.label}</p>
                <h3 className="text-sm font-extrabold leading-snug text-slate-900">{m.name}</h3>
              </div>
              <Switch checked={m.active} onChange={(v) => onAlternar(m, v)} label={m.active ? "Desativar modelo" : "Ativar modelo"} />
            </div>
            <p className="mt-3 line-clamp-2 min-h-[2.25rem] text-xs text-slate-500">{m.description || "Sem descrição."}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.isDefault && <Badge tone="info">Inicial</Badge>}
              {m.validityDays ? <Badge>validade {m.validityDays}d</Badge> : null}
              <Badge>{m.usos ?? 0} uso{m.usos === 1 ? "" : "s"}</Badge>
              {variaveisCustom(m.content).length > 0 && <Badge tone="warning">{variaveisCustom(m.content).length} campo(s)</Badge>}
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
              <button className={`${btnBlue} !px-3 !py-1.5 text-xs`} onClick={() => onUsar(m)} disabled={!m.active}><FilePlus2 size={13} /> Usar</button>
              <button className={`${btnGhost} !px-3 !py-1.5 text-xs`} onClick={() => onEditar(m)}><Pencil size={13} /> Editar</button>
              <div className="ml-auto flex">
                <IconBtn label="Duplicar" onClick={() => onDuplicar(m)}><Copy size={15} /></IconBtn>
                <IconBtn label="Excluir" danger onClick={() => onExcluir(m)}><Trash2 size={15} /></IconBtn>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AbaConformidade({ conf, loading, onSolicitar, onVerLink, solicitando }: { conf: Conformidade | null; loading: boolean; onSolicitar: (tipo: TipoDoc, p: { id: string; nome: string }) => void; onVerLink: (tipo: TipoDoc, p: { id: string; nome: string }) => void; solicitando: string | null }) {
  if (loading && !conf) return <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-slate-300" /></div>;
  if (!conf) return null;
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-slate-500">Cobertura dos documentos obrigatórios entre os <strong className="text-slate-700">{conf.totalPacientes}</strong> pacientes ativos. Termos vencidos ou revogados não contam. Solicite a assinatura em um clique: o sistema cria o documento com o modelo ativo e gera o link.</p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {conf.requisitos.map((r) => {
          const tone = r.percentual >= 90 ? "bg-emerald-500" : r.percentual >= 60 ? "bg-amber-500" : "bg-rose-500";
          return (
            <section key={r.tipo} className={`${card} p-5`} aria-label={r.label}>
              <div className="flex items-start gap-3">
                <TipoTile tipo={r.tipo} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-900">{r.label}</h3>
                  <p className="text-xs text-slate-500">{r.assinados} assinados · {r.faltando} pendentes</p>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">{r.percentual}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${r.percentual}%` }} /></div>

              {r.pendentes.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Todos os pacientes estão em dia.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {r.pendentes.map((p) => {
                    const chave = `${r.tipo}:${p.id}`;
                    return (
                      <li key={p.id} className="flex items-center gap-3 py-2.5">
                        <Avatar nome={p.nome} size={30} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{p.nome}</span>
                        {p.temLink ? (
                          <button className={`${btnGhost} !px-2.5 !py-1.5 text-xs`} onClick={() => onVerLink(r.tipo, p)}><Link2 size={13} /> Link enviado</button>
                        ) : (
                          <button className={`${btnBlue} !px-3 !py-1.5 text-xs`} disabled={solicitando === chave} onClick={() => onSolicitar(r.tipo, p)}>
                            {solicitando === chave ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Solicitar
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {r.faltando > r.pendentes.length && <p className="mt-2 text-[11px] text-slate-400">Mostrando {r.pendentes.length} de {r.faltando} pacientes pendentes.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTEÚDO DA PÁGINA
   ═══════════════════════════════════════════════════════════════ */

function Kpi({ label, value, hint, tone = "default", dark }: { label: string; value: string; hint: string; tone?: "default" | "amber" | "red" | "green"; dark?: boolean }) {
  const base = dark ? "border-slate-900 bg-slate-900 text-white" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "red" ? "border-rose-200 bg-rose-50" : tone === "green" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${base}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className={`mt-1 text-[11px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

const ABAS = ["Documentos", "Modelos", "Conformidade"] as const;
type Aba = (typeof ABAS)[number];

function DocumentosContent({ busca }: { busca: string }) {
  const { version: notifVersion } = useNotificacoes();
  const [aba, setAba] = useState<Aba>("Documentos");

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loadingModelos, setLoadingModelos] = useState(true);
  const [conf, setConf] = useState<Conformidade | null>(null);

  const [statusF, setStatusF] = useState<StatusDoc | "TODOS">("TODOS");
  const [tipoF, setTipoF] = useState<TipoDoc | "">("");
  const [limit, setLimit] = useState(50);
  const dBusca = useDebounced(busca, 300);

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [novo, setNovo] = useState<{ inicial?: NovoInicial; editando?: DocDetalhe } | null>(null);
  const [assinarId, setAssinarId] = useState<string | null>(null);
  const [linkDoc, setLinkDoc] = useState<DocDetalhe | null>(null);
  const [anexar, setAnexar] = useState(false);
  const [cancelar, setCancelar] = useState<DocDetalhe | DocItem | null>(null);
  const [modeloEd, setModeloEd] = useState<{ item?: Modelo } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const reqId = useRef(0);
  const primeira = useRef(true);

  const toast = useCallback<ToastFn>((text, tone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const carregarDocs = useCallback(
    async (silencioso = false) => {
      const my = ++reqId.current;
      if (!silencioso) setLoading(true);
      setErro(null);
      try {
        const p = new URLSearchParams({ limit: String(limit) });
        if (statusF !== "TODOS") p.set("status", statusF);
        if (tipoF) p.set("tipo", tipoF);
        if (dBusca.trim()) p.set("search", dBusca.trim());
        const r = await api<{ data: DocItem[]; total: number }>(`${BASE}?${p}`);
        if (my !== reqId.current) return;
        setDocs(r.data ?? []);
        setTotal(r.total ?? 0);
      } catch (e) {
        if (my === reqId.current) setErro(e instanceof Error ? e.message : "Falha ao carregar documentos");
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [statusF, tipoF, dBusca, limit],
  );

  const carregarResumo = useCallback(async () => {
    try {
      setResumo(await api<Resumo>(`${BASE}/resumo`));
    } catch {
      /* complementar */
    }
  }, []);
  const carregarModelos = useCallback(async () => {
    try {
      setModelos(await api<Modelo[]>(`${BASE}/modelos`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao carregar modelos", "err");
    } finally {
      setLoadingModelos(false);
    }
  }, [toast]);
  const carregarConf = useCallback(async () => {
    try {
      setConf(await api<Conformidade>(`${BASE}/conformidade`));
    } catch {
      /* complementar */
    }
  }, []);

  useEffect(() => {
    primeira.current = false;
    void carregarDocs(false);
  }, [carregarDocs]);
  useEffect(() => setLimit(50), [statusF, tipoF, dBusca]);
  useEffect(() => {
    void carregarResumo();
    void carregarModelos();
    void carregarConf();
  }, [carregarResumo, carregarModelos, carregarConf]);

  const atualizar = useCallback(() => {
    setVersao((v) => v + 1);
    void carregarDocs(true);
    void carregarResumo();
    void carregarConf();
  }, [carregarDocs, carregarResumo, carregarConf]);

  // Chegou notificação (ex.: paciente assinou pelo link) → atualiza em segundo plano
  useEffect(() => {
    if (primeira.current || notifVersion === 0) return;
    atualizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifVersion]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir a ação", "err");
    }
  };

  /* ── Fluxos ── */

  const aoSalvarDocumento = (doc: DocDetalhe, acao: Acao) => {
    atualizar();
    if (acao === "assinar") setAssinarId(doc.id);
    else if (acao === "link") setLinkDoc(doc);
    else {
      setDrawerId(doc.id);
      toast("Documento salvo");
    }
  };

  const aoAssinar = (d: DocDetalhe) => {
    atualizar();
    setDrawerId(d.id);
    toast("Documento assinado");
  };

  const abrirAssinar = (d: { id: string }) => setAssinarId(d.id);

  const solicitar = async (tipo: TipoDoc, p: { id: string; nome: string }) => {
    const chave = `${tipo}:${p.id}`;
    setSolicitando(chave);
    try {
      const d = await api<DocDetalhe>(`${BASE}/solicitar`, { method: "POST", body: JSON.stringify({ patientId: p.id, tipo }) });
      atualizar();
      setLinkDoc(d);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível solicitar a assinatura", "err");
    } finally {
      setSolicitando(null);
    }
  };

  const verLink = (tipo: TipoDoc, p: { id: string; nome: string }) =>
    void run(async () => {
      const r = await api<{ data: DocItem[] }>(`${BASE}?patientId=${p.id}&tipo=${tipo}&status=PENDENTE&limit=1`);
      const it = r.data[0];
      if (!it) throw new Error("Link não encontrado. Solicite novamente.");
      setLinkDoc(await api<DocDetalhe>(`${BASE}/${it.id}`));
    });

  const excluirDoc = (d: DocItem | DocDetalhe) =>
    setConfirm({
      message: `Excluir "${d.title}" de ${d.patient.nome}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: () =>
        run(async () => {
          await api(`${BASE}/${d.id}`, { method: "DELETE" });
          setDrawerId((x) => (x === d.id ? null : x));
          atualizar();
        }, "Documento excluído"),
    });

  const renovar = (d: DocDetalhe) =>
    setNovo({ inicial: { base: { titulo: d.title, tipo: d.type, conteudo: d.content }, paciente: { id: d.patient.id, nome: d.patient.nome, telefone: d.patient.telefone } } });

  const alternarModelo = (m: Modelo, active: boolean) => {
    setModelos((l) => l.map((x) => (x.id === m.id ? { ...x, active } : x)));
    void run(async () => {
      try {
        await api(`${BASE}/modelos/${m.id}`, { method: "PUT", body: JSON.stringify({ active }) });
      } catch (e) {
        setModelos((l) => l.map((x) => (x.id === m.id ? { ...x, active: m.active } : x)));
        throw e;
      }
    });
  };

  const duplicarModelo = (m: Modelo) =>
    void run(async () => {
      await api(`${BASE}/modelos`, { method: "POST", body: JSON.stringify({ name: `${m.name} (cópia)`, type: m.type, description: m.description, content: m.content, validityDays: m.validityDays }) });
      await carregarModelos();
    }, "Cópia criada");

  const excluirModelo = (m: Modelo) =>
    setConfirm({
      message: `Excluir o modelo "${m.name}"? Os documentos já criados com ele continuam existindo.`,
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: () => run(async () => { await api(`${BASE}/modelos/${m.id}`, { method: "DELETE" }); await carregarModelos(); }, "Modelo excluído"),
    });

  const contagem = (v: StatusDoc | "TODOS") =>
    !resumo ? 0 : v === "TODOS" ? resumo.total : v === "RASCUNHO" ? resumo.rascunhos : v === "PENDENTE" ? resumo.pendentes : v === "ASSINADO" ? resumo.assinados : v === "VENCIDO" ? resumo.vencidos : resumo.cancelados;

  const filtrando = statusF !== "TODOS" || !!tipoF || !!dBusca.trim();

  return (
    <main className="h-full overflow-y-auto px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <nav aria-label="Trilha da página" className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-slate-500">Gestão Clínica</span><span className="text-slate-300">›</span><span className="font-semibold text-blue-600">Termos & Documentos</span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><FileSignature size={22} /></span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Termos & Documentos</h1>
              <p className="mt-0.5 text-sm text-slate-500">Consentimentos, atestados e declarações com assinatura digital e trilha de auditoria</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => setAnexar(true)}><Paperclip size={15} /> Anexar assinado em papel</button>
            <button className={btnPrimary} onClick={() => setNovo({})}><Plus size={16} /> Novo documento</button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5" aria-label="Indicadores">
          <Kpi label="Aguardando assinatura" value={String(resumo?.pendentes ?? 0)} hint="Links enviados e não assinados" tone={(resumo?.pendentes ?? 0) > 0 ? "amber" : "default"} />
          <Kpi label="Rascunhos" value={String(resumo?.rascunhos ?? 0)} hint="Ainda sem envio ou assinatura" />
          <Kpi label="Assinados no mês" value={String(resumo?.assinadosMes ?? 0)} hint="Desde o dia 1º" tone="green" />
          <Kpi label="Vencendo em 30 dias" value={String(resumo?.vencendo30 ?? 0)} hint={`${resumo?.vencidos ?? 0} já vencido(s)`} tone={(resumo?.vencendo30 ?? 0) + (resumo?.vencidos ?? 0) > 0 ? "red" : "default"} />
          <Kpi dark label="Conformidade" value={`${resumo?.conformidade ?? 0}%`} hint="Pacientes com LGPD e imagem em dia" />
        </section>

        <nav className={`${card} mb-6 flex gap-1 overflow-x-auto p-1.5`} role="tablist" aria-label="Seções">
          {ABAS.map((a) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${aba === a ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              {a}
              {a === "Documentos" && <span className={`ml-2 rounded-full px-1.5 text-[10px] font-bold ${aba === a ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{resumo?.total ?? 0}</span>}
              {a === "Modelos" && <span className={`ml-2 rounded-full px-1.5 text-[10px] font-bold ${aba === a ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{modelos.length}</span>}
              {a === "Conformidade" && (conf?.requisitos.reduce((s, r) => s + r.faltando, 0) ?? 0) > 0 && <span className={`ml-2 rounded-full px-1.5 text-[10px] font-bold ${aba === a ? "bg-white/25" : "bg-rose-100 text-rose-700"}`}>{conf?.requisitos.reduce((s, r) => s + r.faltando, 0)}</span>}
            </button>
          ))}
        </nav>

        {aba === "Documentos" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              {STATUS_FILTROS.map((f) => (
                <button key={f.v} onClick={() => setStatusF(f.v)} aria-pressed={statusF === f.v} className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${statusF === f.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  {f.label} <span className={statusF === f.v ? "text-slate-300" : "text-slate-400"}>{contagem(f.v)}</span>
                </button>
              ))}
              <div className="relative ml-auto">
                <select className={`${inputCls} appearance-none !py-2 pr-9 font-semibold`} value={tipoF} onChange={(e) => setTipoF(e.target.value as TipoDoc | "")} aria-label="Filtrar por tipo">
                  <option value="">Todos os tipos</option>
                  {LISTA_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DOC[t].label}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Documento</th><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Criado em</th><th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-slate-50"><td colSpan={5} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td></tr>)}
                    {!loading && erro && (
                      <tr><td colSpan={5} className="px-4 py-14 text-center"><p className="text-sm text-rose-600">{erro}</p><button className={`${btnGhost} mt-3`} onClick={() => void carregarDocs()}><RefreshCw size={14} /> Tentar de novo</button></td></tr>
                    )}
                    {!loading && !erro && docs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <FileSignature size={30} className="mx-auto text-slate-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-700">{filtrando ? "Nenhum documento encontrado" : "Nenhum documento ainda"}</p>
                          <p className="mt-1 text-xs text-slate-500">{filtrando ? "Ajuste a busca ou os filtros." : "Crie o primeiro a partir de um modelo e colete a assinatura."}</p>
                          {!filtrando && <button className={`${btnBlue} mt-4`} onClick={() => setNovo({})}><Plus size={15} /> Novo documento</button>}
                        </td>
                      </tr>
                    )}
                    {!loading && !erro && docs.map((d) => {
                      const st = STATUS_META[d.status];
                      const aberto = d.status === "RASCUNHO" || d.status === "PENDENTE";
                      return (
                        <tr key={d.id} onClick={() => setDrawerId(d.id)} className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/70 ${drawerId === d.id ? "bg-blue-50/50" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <TipoTile tipo={d.type} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{d.title}</p>
                                <p className="text-[11px] text-slate-500">{TIPOS_DOC[d.type]?.label}{d.temArquivo ? " · arquivo anexo" : ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar nome={d.patient.nome} size={26} /><span className="truncate text-slate-700">{d.patient.nome}</span></div></td>
                          <td className="px-4 py-3">
                            <Badge tone={st.tone}>{st.label}</Badge>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {d.status === "PENDENTE" && d.linkExpiraEm ? `link até ${fmtDate(d.linkExpiraEm)}` : d.status === "ASSINADO" ? `em ${fmtDate(d.signedAt)}${d.expiresAt ? ` · vence ${fmtDate(d.expiresAt)}` : ""}` : d.status === "VENCIDO" ? `venceu em ${fmtDate(d.expiresAt)}` : d.status === "CANCELADO" ? `em ${fmtDate(d.canceledAt)}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(d.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              {aberto && <IconBtn label="Assinar agora" onClick={() => abrirAssinar(d)}><PenLine size={16} /></IconBtn>}
                              {aberto && <IconBtn label="Enviar link de assinatura" onClick={() => void run(async () => setLinkDoc(await api<DocDetalhe>(`${BASE}/${d.id}`)))}><Send size={15} /></IconBtn>}
                              <IconBtn label="Abrir detalhes" onClick={() => setDrawerId(d.id)}><ExternalLink size={15} /></IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && !erro && docs.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>Mostrando {docs.length} de {total}</span>
                  {docs.length < total && <button className={`${btnGhost} !py-1.5 text-xs`} onClick={() => setLimit((l) => l + 50)}>Carregar mais</button>}
                </div>
              )}
            </div>
          </>
        )}

        {aba === "Modelos" && (
          <AbaModelos
            modelos={modelos}
            loading={loadingModelos}
            onNovo={() => setModeloEd({})}
            onEditar={(m) => setModeloEd({ item: m })}
            onUsar={(m) => setNovo({ inicial: { modelo: m } })}
            onDuplicar={duplicarModelo}
            onAlternar={alternarModelo}
            onExcluir={excluirModelo}
          />
        )}

        {aba === "Conformidade" && <AbaConformidade conf={conf} loading={!conf} onSolicitar={(t, p) => void solicitar(t, p)} onVerLink={verLink} solicitando={solicitando} />}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] text-slate-400">HealthSystem · Termos & Documentos · Documentos assinados são bloqueados para edição e têm hash de integridade</footer>
      </div>

      {drawerId && (
        <DocumentoDrawer
          id={drawerId}
          versao={versao}
          onClose={() => setDrawerId(null)}
          onEditar={(d) => setNovo({ editando: d })}
          onAssinar={abrirAssinar}
          onLink={(d) => setLinkDoc(d)}
          onCancelar={(d) => setCancelar(d)}
          onExcluir={excluirDoc}
          onRenovar={renovar}
          toast={toast}
        />
      )}
      {novo && <ModalDocumento modelos={modelos} inicial={novo.inicial} editando={novo.editando} onClose={() => setNovo(null)} onSalvo={aoSalvarDocumento} />}
      {assinarId && <ModalAssinar docId={assinarId} onClose={() => setAssinarId(null)} onAssinado={aoAssinar} />}
      {linkDoc && <ModalLink doc={linkDoc} onClose={() => setLinkDoc(null)} onAtualizado={() => atualizar()} toast={toast} />}
      {anexar && <ModalAnexar onClose={() => setAnexar(false)} onSalvo={(d) => { atualizar(); setDrawerId(d.id); toast("Documento registrado"); }} />}
      {cancelar && <ModalCancelar doc={cancelar} onClose={() => setCancelar(null)} onCancelado={(d) => { atualizar(); setDrawerId(d.id); toast(d.signedAt ? "Documento revogado" : "Documento cancelado"); }} />}
      {modeloEd && <ModalModelo item={modeloEd.item} onClose={() => setModeloEd(null)} onSalvo={() => { void carregarModelos(); toast("Modelo salvo"); }} />}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      <Toasts list={toasts} />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHELL DO SISTEMA (sidebar + topbar)
   Se o seu layout.tsx já renderiza isso, remova AppShell e exporte só <DocumentosContent />
   ═══════════════════════════════════════════════════════════════ */

function AppShell({ children, busca, onBusca }: { children: React.ReactNode; busca: string; onBusca: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const digitando = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !digitando && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} aria-label="Navegação principal">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Activity size={20} /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-slate-900">HealthSystem</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Clinical Suite</p>
          </div>
        </div>
        <button type="button" className="flex w-full items-center justify-between border-y border-slate-100 px-5 py-3 text-left hover:bg-slate-50" aria-label="Trocar unidade">
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-semibold text-blue-600">{CLINICA_NOME}</span>
            <span className="block truncate text-[13px] font-semibold text-slate-800">{UNIDADE_NOME}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </button>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.section}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                        <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar nome={USUARIO.nome} foto={USUARIO.avatar} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-slate-900">{USUARIO.nome}</p>
              <p className="truncate text-[11px] text-blue-600">{USUARIO.cargo}</p>
            </div>
            <IconBtn label="Configurações" onClick={() => {}}><Settings size={16} /></IconBtn>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <Badge tone="info">{USUARIO.plano}</Badge>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"><CircleHelp size={13} /> Suporte</button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[62px] shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <nav aria-label="Trilha" className="hidden items-center gap-2 text-[13px] sm:flex">
            <span className="text-slate-500">Gestão Clínica</span><span className="text-slate-300">›</span><span className="font-bold text-slate-900">Termos & Documentos</span>
          </nav>
          <div className="relative hidden w-full max-w-[300px] md:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={buscaRef} value={busca} onChange={(e) => onBusca(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-[13px] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Buscar documento ou paciente…" aria-label="Buscar documento ou paciente" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400">/</kbd>
          </div>
          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-blue-600 lg:flex"><MapPin size={15} /> {UNIDADE_NOME}</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-50" aria-label="Ajuda"><CircleHelp size={18} /></button>
            <Avatar nome={USUARIO.nome} foto={USUARIO.avatar} size={36} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">{children}</div>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const [busca, setBusca] = useState("");
  return (
    <AppShell busca={busca} onBusca={setBusca}>
      <DocumentosContent busca={busca} />
    </AppShell>
  );
}