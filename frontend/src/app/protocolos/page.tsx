"use client";

/**
 * PROTOCOLOS DE TRATAMENTO — página única (Next.js App Router + Tailwind + lucide-react).
 * Backend: NestJS /protocolos (module/service/controller) + Prisma.
 *
 * Um protocolo é uma sequência de etapas (sessões/fases): o que será feito, tempo, intervalo,
 * procedimento do catálogo, preço e orientações. Dá para aplicar a pacientes e acompanhar o progresso.
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
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock,
  ClipboardList,
  Columns3,
  Copy,
  Download,
  FileSignature,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  List,
  ListChecks,
  Loader2,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  Star,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
// Ajuste o caminho conforme onde você salvou o arquivo compartilhado de notificações.
import { api, NotificationBell } from "../../lib/notificacoes";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CLINICA_NOME = "Ellevare Estética Avançada";
const UNIDADE_NOME = "Unidade Av Saudade (Matriz)";
const BASE = "/protocolos";

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
      { label: "Agenda da Dra. Joana", href: "/agenda", icon: <CalendarDays size={18} /> },
      { label: "Clientes", href: "/clientes", icon: <Users size={18} /> },
      { label: "CRM Kanban", href: "/crm", icon: <Columns3 size={18} /> },
      { label: "Procedimentos", href: "/procedimentos", icon: <Stethoscope size={18} /> },
      { label: "Recursos", href: "/recursos", icon: <Boxes size={18} /> },
      { label: "Lista de Espera", href: "/lista-de-espera", icon: <ListChecks size={18} /> },
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
  {
    section: "Comercial",
    items: [
      { label: "Orçamentos", href: "/orcamentos", icon: <Receipt size={18} /> },
      { label: "Financeiro", href: "/financeiro", icon: <Landmark size={18} /> },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════════════════ */

type Etapa = {
  id?: string;
  ordem?: number;
  titulo: string;
  descricao?: string | null;
  duracao: number;
  intervaloDias: number;
  procedureId?: string | null;
  procedureNome?: string | null;
  preco: number;
  orientacoes?: string | null;
};

type Totais = { etapas: number; duracaoMin: number; prazoDias: number; precoBase: number; precoFinal: number };

type Protocolo = {
  id: string;
  name: string;
  category: string;
  objetivo?: string | null;
  resultadoEsperado?: string | null;
  indicacoes?: string | null;
  contraindicacoes?: string | null;
  cuidadosPre?: string | null;
  cuidadosPos?: string | null;
  observacoes?: string | null;
  desconto: number;
  precoManual?: number | null;
  manutencaoDias?: number | null;
  active: boolean;
  createdAt: string;
  etapas: Etapa[];
  totais: Totais;
  usos: number;
  emAndamento: number;
};

type AplicStatus = "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

type Aplicacao = {
  id: string;
  protocoloId: string;
  patientId: string;
  status: AplicStatus;
  etapasConcluidas: number;
  iniciadoEm: string;
  proximaEtapaEm?: string | null;
  concluidoEm?: string | null;
  observacoes?: string | null;
  paciente: { id: string; nome: string; telefone?: string | null };
};

type ProtocoloDetalhe = Protocolo & { aplicacoes: Aplicacao[] };
type Procedimento = { id: string; name: string; category: string; duration: number; price: number };
type PacienteLite = { id: string; nome: string; telefone?: string | null };

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

const brl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDur = (m: number) => {
  if (!m) return "0 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
};

const fmtPrazo = (d: number) => {
  if (d <= 0) return "Em uma sessão";
  if (d < 14) return `${d} dia${d === 1 ? "" : "s"}`;
  if (d < 60) return `${Math.round(d / 7)} semanas`;
  return `${Math.round(d / 30)} meses`;
};

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
};

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const hojeISO = () => new Date().toISOString().slice(0, 10);

function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const n = new Date();
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
}

const iniciais = (nome = "") =>
  nome
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Mesma regra do backend, usada também na prévia do formulário. */
function calcularTotais(etapas: { duracao: number; intervaloDias: number; preco: number }[], desconto: number, precoManual: number | null): Totais {
  const duracaoMin = etapas.reduce((s, e) => s + e.duracao, 0);
  const prazoDias = etapas.slice(0, -1).reduce((s, e) => s + e.intervaloDias, 0);
  const precoBase = etapas.reduce((s, e) => s + e.preco, 0);
  const precoFinal = precoManual ?? Math.round(precoBase * (1 - desconto / 100) * 100) / 100;
  return { etapas: etapas.length, duracaoMin, prazoDias, precoBase, precoFinal };
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const escHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function imprimir(p: Protocolo) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  const bloco = (titulo: string, v?: string | null) =>
    v ? `<h2>${escHtml(titulo)}</h2><p>${escHtml(v).replace(/\n/g, "<br>")}</p>` : "";
  const etapas = p.etapas
    .map(
      (e, i) => `<div class="et"><b>${i + 1}. ${escHtml(e.titulo)}</b>
      <div class="meta">${fmtDur(e.duracao)}${e.procedureNome ? ` · ${escHtml(e.procedureNome)}` : ""}${e.preco ? ` · ${brl(e.preco)}` : ""}${i < p.etapas.length - 1 && e.intervaloDias ? ` · próxima etapa em ${e.intervaloDias} dia(s)` : ""}</div>
      ${e.descricao ? `<p>${escHtml(e.descricao).replace(/\n/g, "<br>")}</p>` : ""}
      ${e.orientacoes ? `<p class="or"><i>Orientações:</i> ${escHtml(e.orientacoes).replace(/\n/g, "<br>")}</p>` : ""}</div>`,
    )
    .join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Protocolo — ${escHtml(p.name)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px;max-width:760px;margin:auto;font-size:13px;line-height:1.5}
    h1{font-size:22px;margin:0}.sub{color:#64748b;font-size:12px;margin:4px 0 16px;text-transform:uppercase;letter-spacing:.08em}
    h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;margin:20px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    .resumo{display:flex;gap:12px;margin:14px 0}.resumo div{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px}
    .resumo small{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.resumo b{font-size:15px}
    .et{border-left:3px solid #2563eb;padding:2px 0 2px 12px;margin:10px 0}.meta{color:#64748b;font-size:12px}.or{color:#334155}
    p{margin:4px 0}
  </style></head><body>
  <h1>${escHtml(p.name)}</h1>
  <p class="sub">${escHtml(CLINICA_NOME)} · ${escHtml(p.category)}</p>
  <div class="resumo">
    <div><small>Etapas</small><b>${p.totais.etapas}</b></div>
    <div><small>Tempo total</small><b>${fmtDur(p.totais.duracaoMin)}</b></div>
    <div><small>Duração do tratamento</small><b>${fmtPrazo(p.totais.prazoDias)}</b></div>
    <div><small>Valor</small><b>${brl(p.totais.precoFinal)}</b></div>
  </div>
  ${bloco("Objetivo", p.objetivo)}${bloco("Resultado esperado", p.resultadoEsperado)}
  <h2>Etapas</h2>${etapas}
  ${bloco("Indicações", p.indicacoes)}${bloco("Contraindicações", p.contraindicacoes)}${bloco("Cuidados pré-procedimento", p.cuidadosPre)}${bloco("Cuidados pós-procedimento", p.cuidadosPos)}
  ${p.manutencaoDias ? `<h2>Manutenção</h2><p>Retorno de manutenção após ${p.manutencaoDias} dias da conclusão.</p>` : ""}
  ${bloco("Observações", p.observacoes)}
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

/* ═══════════════════════════════════════════════════════════════
   UI BASE
   ═══════════════════════════════════════════════════════════════ */

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

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
      onClick={onClick}
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
    <img src={foto} alt={nome} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-700" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden>
      {iniciais(nome)}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`${card} flex max-h-[92vh] w-full flex-col ${wide ? "max-w-4xl" : "max-w-md"}`}>
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

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORMULÁRIO DE PROTOCOLO (Geral · Etapas · Orientações · Valores)
   ═══════════════════════════════════════════════════════════════ */

type EtapaForm = {
  key: string;
  titulo: string;
  descricao: string;
  duracao: string;
  intervaloDias: string;
  procedureId: string;
  procedureNome: string;
  preco: string;
  orientacoes: string;
};

type FormState = {
  name: string;
  category: string;
  active: boolean;
  objetivo: string;
  resultadoEsperado: string;
  etapas: EtapaForm[];
  indicacoes: string;
  contraindicacoes: string;
  cuidadosPre: string;
  cuidadosPos: string;
  observacoes: string;
  desconto: string;
  precoManual: string;
  manutencaoDias: string;
};

let keySeq = 0;
const novaKey = () => `e${++keySeq}`;
const s = (v: unknown) => (v == null ? "" : String(v));

const etapaVazia = (n: number): EtapaForm => ({
  key: novaKey(),
  titulo: `Sessão ${n}`,
  descricao: "",
  duracao: "30",
  intervaloDias: "15",
  procedureId: "",
  procedureNome: "",
  preco: "0",
  orientacoes: "",
});

function toForm(p?: Protocolo): FormState {
  return {
    name: p?.name ?? "",
    category: p?.category ?? "Geral",
    active: p?.active ?? true,
    objetivo: s(p?.objetivo),
    resultadoEsperado: s(p?.resultadoEsperado),
    etapas: p
      ? p.etapas.map((e) => ({
          key: novaKey(),
          titulo: e.titulo,
          descricao: s(e.descricao),
          duracao: s(e.duracao),
          intervaloDias: s(e.intervaloDias),
          procedureId: s(e.procedureId),
          procedureNome: s(e.procedureNome),
          preco: s(e.preco),
          orientacoes: s(e.orientacoes),
        }))
      : [etapaVazia(1)],
    indicacoes: s(p?.indicacoes),
    contraindicacoes: s(p?.contraindicacoes),
    cuidadosPre: s(p?.cuidadosPre),
    cuidadosPos: s(p?.cuidadosPos),
    observacoes: s(p?.observacoes),
    desconto: p ? s(p.desconto) : "0",
    precoManual: s(p?.precoManual),
    manutencaoDias: s(p?.manutencaoDias),
  };
}

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")) || 0);

function toPayload(f: FormState) {
  const str = (v: string) => v.trim() || null;
  return {
    name: f.name.trim(),
    category: f.category.trim() || "Geral",
    active: f.active,
    objetivo: str(f.objetivo),
    resultadoEsperado: str(f.resultadoEsperado),
    indicacoes: str(f.indicacoes),
    contraindicacoes: str(f.contraindicacoes),
    cuidadosPre: str(f.cuidadosPre),
    cuidadosPos: str(f.cuidadosPos),
    observacoes: str(f.observacoes),
    desconto: num(f.desconto),
    precoManual: f.precoManual.trim() === "" ? null : num(f.precoManual),
    manutencaoDias: f.manutencaoDias.trim() === "" ? null : Math.round(num(f.manutencaoDias)),
    etapas: f.etapas.map((e) => ({
      titulo: e.titulo.trim(),
      descricao: str(e.descricao),
      duracao: Math.round(num(e.duracao)),
      intervaloDias: Math.round(num(e.intervaloDias)),
      procedureId: e.procedureId || null,
      procedureNome: e.procedureNome || null,
      preco: num(e.preco),
      orientacoes: str(e.orientacoes),
    })),
  };
}

type Payload = ReturnType<typeof toPayload>;

function EtapaEditor({ e, idx, total, catalogo, onChange, onMove, onRemove }: { e: EtapaForm; idx: number; total: number; catalogo: Procedimento[]; onChange: (patch: Partial<EtapaForm>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const ultima = idx === total - 1;

  const vincular = (id: string) => {
    if (!id) return onChange({ procedureId: "", procedureNome: "" });
    const p = catalogo.find((x) => x.id === id);
    if (!p) return;
    onChange({
      procedureId: p.id,
      procedureNome: p.name,
      titulo: e.titulo.trim() && !/^Sessão \d+$/.test(e.titulo.trim()) ? e.titulo : p.name,
      duracao: String(p.duration),
      preco: String(p.price),
    });
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{idx + 1}</span>
        <input
          className={`${inputCls} !py-2 font-semibold`}
          placeholder="Título da etapa (ex.: Sessão 1 — Preparo da pele)"
          value={e.titulo}
          onChange={(ev) => onChange({ titulo: ev.target.value })}
          aria-label={`Título da etapa ${idx + 1}`}
        />
        <div className="flex shrink-0">
          <IconBtn label="Mover para cima" onClick={() => onMove(-1)} disabled={idx === 0}><ChevronUp size={16} /></IconBtn>
          <IconBtn label="Mover para baixo" onClick={() => onMove(1)} disabled={ultima}><ChevronDown size={16} /></IconBtn>
          <IconBtn label="Remover etapa" danger onClick={onRemove} disabled={total === 1}><Trash2 size={15} /></IconBtn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Procedimento do catálogo" className="sm:col-span-2">
          <select className={inputCls} value={e.procedureId} onChange={(ev) => vincular(ev.target.value)}>
            <option value="">Nenhum (etapa livre)</option>
            {catalogo.map((p) => <option key={p.id} value={p.id}>{p.name} — {brl(p.price)}</option>)}
          </select>
        </Field>
        <Field label="Duração (min)">
          <input type="number" min={0} className={inputCls} value={e.duracao} onChange={(ev) => onChange({ duracao: ev.target.value })} />
        </Field>
        <Field label="Preço (R$)">
          <input type="number" min={0} step="0.01" className={inputCls} value={e.preco} onChange={(ev) => onChange({ preco: ev.target.value })} />
        </Field>
        <Field label="O que será feito" className="sm:col-span-4">
          <textarea rows={2} className={inputCls} placeholder="Passo a passo, produtos, parâmetros do equipamento…" value={e.descricao} onChange={(ev) => onChange({ descricao: ev.target.value })} />
        </Field>
        <Field label="Orientações desta etapa" className="sm:col-span-3">
          <input className={inputCls} placeholder="Ex.: não expor ao sol por 48h" value={e.orientacoes} onChange={(ev) => onChange({ orientacoes: ev.target.value })} />
        </Field>
        <Field label="Próxima etapa em (dias)" hint={ultima ? "Ignorado na última etapa" : undefined}>
          <input type="number" min={0} className={inputCls} value={e.intervaloDias} disabled={ultima} onChange={(ev) => onChange({ intervaloDias: ev.target.value })} />
        </Field>
      </div>
    </li>
  );
}

const ABAS = ["Geral", "Etapas", "Orientações", "Valores"] as const;

function ProtocoloForm({ inicial, catalogo, categorias, onSave, onClose }: { inicial?: Protocolo; catalogo: Procedimento[]; categorias: string[]; onSave: (p: Payload, id?: string) => Promise<void>; onClose: () => void }) {
  const [f, setF] = useState<FormState>(() => toForm(inicial));
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Geral");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const setEtapa = (i: number, patch: Partial<EtapaForm>) => setF((p) => ({ ...p, etapas: p.etapas.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const moverEtapa = (i: number, dir: -1 | 1) =>
    setF((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.etapas.length) return p;
      const arr = [...p.etapas];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, etapas: arr };
    });

  const totais = useMemo(
    () =>
      calcularTotais(
        f.etapas.map((e) => ({ duracao: Math.round(num(e.duracao)), intervaloDias: Math.round(num(e.intervaloDias)), preco: num(e.preco) })),
        num(f.desconto),
        f.precoManual.trim() === "" ? null : num(f.precoManual),
      ),
    [f.etapas, f.desconto, f.precoManual],
  );

  const salvar = async () => {
    if (!f.name.trim()) {
      setAba("Geral");
      setErr("Informe o nome do protocolo.");
      return;
    }
    const semTitulo = f.etapas.findIndex((e) => !e.titulo.trim());
    if (semTitulo >= 0) {
      setAba("Etapas");
      setErr(`Informe o título da etapa ${semTitulo + 1}.`);
      return;
    }
    if (num(f.desconto) < 0 || num(f.desconto) > 100) {
      setAba("Valores");
      setErr("O desconto deve estar entre 0 e 100%.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(toPayload(f), inicial?.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal wide title={inicial ? "Editar protocolo" : "Novo protocolo"} subtitle="Defina o que será feito em cada etapa, o tempo e as orientações" onClose={onClose}>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`shrink-0 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${aba === a ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {a}
            {a === "Etapas" && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{f.etapas.length}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {aba === "Geral" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do protocolo *" className="sm:col-span-2">
              <input className={inputCls} placeholder="Ex.: Rejuvenescimento facial — 4 sessões" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </Field>
            <Field label="Categoria" hint="Escolha uma existente ou digite uma nova">
              <input className={inputCls} list="categorias-protocolo" value={f.category} onChange={(e) => set("category", e.target.value)} />
              <datalist id="categorias-protocolo">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Protocolo ativo</p>
                  <p className="text-[11px] text-slate-500">Inativos não podem ser aplicados</p>
                </div>
                <Switch checked={f.active} onChange={(v) => set("active", v)} label="Protocolo ativo" />
              </div>
            </div>
            <Field label="Objetivo do protocolo" className="sm:col-span-2">
              <textarea rows={3} className={inputCls} placeholder="O que este protocolo trata e como funciona" value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} />
            </Field>
            <Field label="Resultado esperado" className="sm:col-span-2">
              <textarea rows={2} className={inputCls} placeholder="O que o paciente pode esperar ao final" value={f.resultadoEsperado} onChange={(e) => set("resultadoEsperado", e.target.value)} />
            </Field>
          </div>
        )}

        {aba === "Etapas" && (
          <div className="space-y-4">
            <ol className="space-y-3">
              {f.etapas.map((e, i) => (
                <EtapaEditor
                  key={e.key}
                  e={e}
                  idx={i}
                  total={f.etapas.length}
                  catalogo={catalogo}
                  onChange={(patch) => setEtapa(i, patch)}
                  onMove={(dir) => moverEtapa(i, dir)}
                  onRemove={() => setF((p) => ({ ...p, etapas: p.etapas.filter((_, j) => j !== i) }))}
                />
              ))}
            </ol>
            <button type="button" className={btnGhost} onClick={() => setF((p) => ({ ...p, etapas: [...p.etapas, etapaVazia(p.etapas.length + 1)] }))}>
              <Plus size={15} /> Adicionar etapa
            </button>
            {catalogo.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                Nenhum procedimento no catálogo. Cadastre em “Procedimentos” para vincular preço e duração automaticamente, ou preencha as etapas manualmente.
              </p>
            )}
          </div>
        )}

        {aba === "Orientações" && (
          <div className="grid grid-cols-1 gap-4">
            <Field label="Indicações">
              <textarea rows={3} className={inputCls} placeholder="Para quem este protocolo é indicado" value={f.indicacoes} onChange={(e) => set("indicacoes", e.target.value)} />
            </Field>
            <Field label="Contraindicações">
              <textarea rows={3} className={`${inputCls} border-rose-200 focus:border-rose-400 focus:ring-rose-100`} placeholder="Gestantes, uso de isotretinoína, alergias, infecções ativas…" value={f.contraindicacoes} onChange={(e) => set("contraindicacoes", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cuidados pré-procedimento">
                <textarea rows={4} className={inputCls} value={f.cuidadosPre} onChange={(e) => set("cuidadosPre", e.target.value)} />
              </Field>
              <Field label="Cuidados pós-procedimento">
                <textarea rows={4} className={inputCls} value={f.cuidadosPos} onChange={(e) => set("cuidadosPos", e.target.value)} />
              </Field>
            </div>
            <Field label="Observações internas">
              <textarea rows={2} className={inputCls} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </Field>
          </div>
        )}

        {aba === "Valores" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Desconto do pacote (%)" hint="Aplicado sobre a soma das etapas">
                <input type="number" min={0} max={100} step="0.5" className={inputCls} value={f.desconto} onChange={(e) => set("desconto", e.target.value)} />
              </Field>
              <Field label="Preço fixo do pacote (R$)" hint="Se preenchido, ignora a soma e o desconto">
                <input type="number" min={0} step="0.01" className={inputCls} value={f.precoManual} onChange={(e) => set("precoManual", e.target.value)} />
              </Field>
              <Field label="Manutenção após concluir (dias)" hint="Gera o próximo retorno do paciente">
                <input type="number" min={0} className={inputCls} value={f.manutencaoDias} onChange={(e) => set("manutencaoDias", e.target.value)} />
              </Field>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className={`${eyebrow} mb-3 !text-blue-700`}>Resumo calculado</p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><dt className="text-[11px] text-slate-500">Soma das etapas</dt><dd className="text-sm font-bold text-slate-900">{brl(totais.precoBase)}</dd></div>
                <div><dt className="text-[11px] text-slate-500">Tempo em cadeira</dt><dd className="text-sm font-bold text-slate-900">{fmtDur(totais.duracaoMin)}</dd></div>
                <div><dt className="text-[11px] text-slate-500">Duração do tratamento</dt><dd className="text-sm font-bold text-slate-900">{fmtPrazo(totais.prazoDias)}</dd></div>
                <div><dt className="text-[11px] text-slate-500">Valor final</dt><dd className="text-lg font-extrabold text-blue-700">{brl(totais.precoFinal)}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-800">{totais.etapas}</strong> etapa(s) · <strong className="text-slate-800">{fmtDur(totais.duracaoMin)}</strong> · <strong className="text-slate-800">{brl(totais.precoFinal)}</strong>
        </p>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnBlue} onClick={() => void salvar()} disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />}
            Salvar protocolo
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APLICAR A PACIENTE
   ═══════════════════════════════════════════════════════════════ */

function AplicarModal({ protocolo, onSave, onClose }: { protocolo: Protocolo; onSave: (body: { patientId: string; iniciadoEm: string; observacoes: string }) => Promise<void>; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [lista, setLista] = useState<PacienteLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState<PacienteLite | null>(null);
  const [inicio, setInicio] = useState(hojeISO());
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dq = useDebounced(q, 250);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    api<PacienteLite[]>(`${BASE}/pacientes?search=${encodeURIComponent(dq)}`)
      .then((r) => alive && setLista(Array.isArray(r) ? r : []))
      .catch(() => alive && setLista([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq, open]);

  const confirmar = async () => {
    if (!paciente) return setErr("Selecione um paciente da lista.");
    setBusy(true);
    setErr(null);
    try {
      await onSave({ patientId: paciente.id, iniciadoEm: inicio, observacoes: obs });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível aplicar o protocolo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Aplicar a paciente" subtitle={protocolo.name} onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <Field label="Paciente *">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9 ${paciente ? "border-emerald-300" : ""}`}
              placeholder="Buscar paciente pelo nome…"
              value={q}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
                setPaciente(null);
              }}
            />
            {paciente && <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
            {open && (
              <ul className={`${card} absolute z-10 mt-1 max-h-52 w-full overflow-y-auto p-1`}>
                {loading && <li className="px-3 py-2 text-xs text-slate-500">Buscando…</li>}
                {!loading && lista.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Nenhum paciente encontrado.</li>}
                {lista.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPaciente(p);
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
        </Field>
        <Field label="Data da primeira etapa">
          <input type="date" className={inputCls} value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>
        <Field label="Observações">
          <textarea rows={2} className={inputCls} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          O protocolo tem <strong>{protocolo.totais.etapas} etapa(s)</strong> em <strong>{fmtPrazo(protocolo.totais.prazoDias)}</strong>. Você acompanha e conclui cada etapa no painel do protocolo.
        </p>
        {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        <button className={btnBlue} onClick={() => void confirmar()} disabled={busy}>
          {busy && <Loader2 size={15} className="animate-spin" />}
          <UserPlus size={15} /> Aplicar protocolo
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAINEL DE DETALHES (gaveta lateral)
   ═══════════════════════════════════════════════════════════════ */

const APLIC_META: Record<AplicStatus, { label: string; tone: Tone }> = {
  EM_ANDAMENTO: { label: "Em andamento", tone: "info" },
  CONCLUIDO: { label: "Concluído", tone: "success" },
  CANCELADO: { label: "Cancelado", tone: "neutral" },
};

function Texto({ titulo, v, tone }: { titulo: string; v?: string | null; tone?: "danger" }) {
  if (!v) return null;
  return (
    <div className={tone === "danger" ? "rounded-xl border border-rose-200 bg-rose-50 p-3" : ""}>
      <p className={`${eyebrow} ${tone === "danger" ? "!text-rose-700" : ""}`}>{titulo}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{v}</p>
    </div>
  );
}

function DetalheDrawer({ id, onClose, onEdit, onAplicar, onDuplicar, onDelete, onChanged, toast, versao }: { id: string; onClose: () => void; onEdit: (p: Protocolo) => void; onAplicar: (p: Protocolo) => void; onDuplicar: (p: Protocolo) => void; onDelete: (p: Protocolo) => void; onChanged: () => void; toast: (t: string, tone?: "ok" | "err") => void; versao: number }) {
  const [p, setP] = useState<ProtocoloDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setP(await api<ProtocoloDetalhe>(`${BASE}/${id}`));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o protocolo");
    }
  }, [id]);

  useEffect(() => {
    setP(null); // só limpa ao trocar de protocolo
  }, [id]);

  useEffect(() => {
    void carregar(); // recarrega em segundo plano quando algo muda
  }, [carregar, versao]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const acao = async (a: Aplicacao, qual: "avancar" | "desfazer" | "cancelar" | "retomar") => {
    setAgindo(a.id + qual);
    try {
      await api(`${BASE}/aplicacoes/${a.id}`, { method: "PATCH", body: JSON.stringify({ acao: qual }) });
      await carregar();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir a ação", "err");
    } finally {
      setAgindo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/30 backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalhes do protocolo">
        {!p ? (
          <div className="grid flex-1 place-items-center p-10 text-center">
            {erro ? (
              <div>
                <p className="text-sm text-rose-600">{erro}</p>
                <button className={`${btnGhost} mt-3`} onClick={() => void carregar()}>Tentar de novo</button>
              </div>
            ) : (
              <Loader2 className="animate-spin text-slate-300" />
            )}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">{p.category}</p>
                  <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">{p.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                    <Badge tone="info">{p.emAndamento} em andamento</Badge>
                    <Badge>{p.usos} uso(s)</Badge>
                  </div>
                </div>
                <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btnBlue + " !py-2"} onClick={() => onAplicar(p)} disabled={!p.active}><UserPlus size={14} /> Aplicar a paciente</button>
                <button className={btnGhost} onClick={() => onEdit(p)}><Pencil size={14} /> Editar</button>
                <button className={btnGhost} onClick={() => onDuplicar(p)}><Copy size={14} /> Duplicar</button>
                <button className={btnGhost} onClick={() => imprimir(p)}><Printer size={14} /> Imprimir</button>
                <IconBtn label="Excluir" danger onClick={() => onDelete(p)}><Trash2 size={16} /></IconBtn>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: "Etapas", v: String(p.totais.etapas) },
                  { l: "Tempo total", v: fmtDur(p.totais.duracaoMin) },
                  { l: "Tratamento", v: fmtPrazo(p.totais.prazoDias) },
                  { l: "Valor", v: brl(p.totais.precoFinal) },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{x.l}</p>
                    <p className="mt-0.5 text-sm font-extrabold text-slate-900">{x.v}</p>
                  </div>
                ))}
              </div>
              {p.precoManual == null && p.desconto > 0 && (
                <p className="-mt-3 text-[11px] text-slate-500">Soma das etapas {brl(p.totais.precoBase)} com {p.desconto}% de desconto no pacote.</p>
              )}

              <Texto titulo="Objetivo" v={p.objetivo} />
              <Texto titulo="Resultado esperado" v={p.resultadoEsperado} />

              <div>
                <p className={`${eyebrow} mb-3`}>Etapas do protocolo</p>
                <ol className="relative ml-3.5 border-l-2 border-slate-100 pl-6">
                  {p.etapas.map((e, i) => (
                    <li key={e.id ?? i} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[39px] top-0 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white ring-4 ring-white">{i + 1}</span>
                      <p className="text-sm font-bold text-slate-900">{e.titulo}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge><Clock size={11} /> {fmtDur(e.duracao)}</Badge>
                        {e.procedureNome && <Badge tone="info">{e.procedureNome}</Badge>}
                        {e.preco > 0 && <Badge tone="success">{brl(e.preco)}</Badge>}
                      </div>
                      {e.descricao && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{e.descricao}</p>}
                      {e.orientacoes && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"><strong>Orientações:</strong> {e.orientacoes}</p>}
                      {i < p.etapas.length - 1 && e.intervaloDias > 0 && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><CalendarClock size={12} /> Próxima etapa em {e.intervaloDias} dia(s)</p>
                      )}
                    </li>
                  ))}
                </ol>
                {p.manutencaoDias ? (
                  <p className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
                    <CalendarClock size={14} /> Manutenção: retorno {p.manutencaoDias} dia(s) após concluir.
                  </p>
                ) : null}
              </div>

              <Texto titulo="Indicações" v={p.indicacoes} />
              <Texto titulo="Contraindicações" v={p.contraindicacoes} tone="danger" />
              <Texto titulo="Cuidados pré-procedimento" v={p.cuidadosPre} />
              <Texto titulo="Cuidados pós-procedimento" v={p.cuidadosPos} />
              <Texto titulo="Observações internas" v={p.observacoes} />

              <div>
                <p className={`${eyebrow} mb-3`}>Pacientes neste protocolo</p>
                {p.aplicacoes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-500">
                    Nenhum paciente ainda. Use “Aplicar a paciente” para começar o acompanhamento.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {p.aplicacoes.map((a) => {
                      const total = p.etapas.length;
                      const pct = total ? Math.round((a.etapasConcluidas / total) * 100) : 0;
                      const meta = APLIC_META[a.status];
                      const dias = daysUntil(a.proximaEtapaEm);
                      return (
                        <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center gap-3">
                            <Avatar nome={a.paciente.nome} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{a.paciente.nome}</p>
                              <p className="text-[11px] text-slate-500">Início {fmtDate(a.iniciadoEm)}</p>
                            </div>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
                              <span>Etapa {Math.min(a.etapasConcluidas + (a.status === "EM_ANDAMENTO" ? 1 : 0), total)} de {total}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {a.status === "EM_ANDAMENTO" && a.proximaEtapaEm && (
                            <p className={`mt-2 text-[11px] font-semibold ${dias !== null && dias < 0 ? "text-rose-600" : "text-slate-500"}`}>
                              Próxima etapa: {fmtDate(a.proximaEtapaEm)}{dias !== null && dias < 0 ? ` (atrasada ${Math.abs(dias)}d)` : dias === 0 ? " (hoje)" : ""}
                            </p>
                          )}
                          {a.status === "CONCLUIDO" && a.proximaEtapaEm && <p className="mt-2 text-[11px] font-semibold text-slate-500">Manutenção prevista: {fmtDate(a.proximaEtapaEm)}</p>}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {a.status === "EM_ANDAMENTO" && (
                              <button className={`${btnBlue} !px-3 !py-1.5 text-xs`} disabled={agindo !== null} onClick={() => void acao(a, "avancar")}>
                                {agindo === a.id + "avancar" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Concluir etapa
                              </button>
                            )}
                            {a.etapasConcluidas > 0 && a.status !== "CANCELADO" && (
                              <button className={`${btnGhost} !px-3 !py-1.5 text-xs`} disabled={agindo !== null} onClick={() => void acao(a, "desfazer")}><RotateCcw size={13} /> Desfazer</button>
                            )}
                            {a.status === "EM_ANDAMENTO" && (
                              <button className={`${btnGhost} !px-3 !py-1.5 text-xs hover:!text-rose-600`} disabled={agindo !== null} onClick={() => void acao(a, "cancelar")}><Ban size={13} /> Cancelar</button>
                            )}
                            {a.status === "CANCELADO" && (
                              <button className={`${btnGhost} !px-3 !py-1.5 text-xs`} disabled={agindo !== null} onClick={() => void acao(a, "retomar")}><RotateCcw size={13} /> Retomar</button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARTÃO / LINHA DE PROTOCOLO
   ═══════════════════════════════════════════════════════════════ */

function CardMenu({ items }: { items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <ul role="menu" className={`${card} absolute right-0 z-20 mt-1 w-48 p-1`}>
          {items.map((it) => (
            <li key={it.label} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold hover:bg-slate-50 ${it.danger ? "text-rose-600" : "text-slate-700"}`}
              >
                {it.icon} {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Acoes = {
  abrir: (p: Protocolo) => void;
  editar: (p: Protocolo) => void;
  duplicar: (p: Protocolo) => void;
  aplicar: (p: Protocolo) => void;
  excluir: (p: Protocolo) => void;
  alternar: (p: Protocolo, v: boolean) => void;
};

const menuItens = (p: Protocolo, a: Acoes) => [
  { label: "Ver detalhes", icon: <ClipboardList size={14} />, onClick: () => a.abrir(p) },
  { label: "Editar", icon: <Pencil size={14} />, onClick: () => a.editar(p) },
  { label: "Aplicar a paciente", icon: <UserPlus size={14} />, onClick: () => a.aplicar(p) },
  { label: "Duplicar", icon: <Copy size={14} />, onClick: () => a.duplicar(p) },
  { label: "Excluir", icon: <Trash2 size={14} />, onClick: () => a.excluir(p), danger: true },
];

function ProtocoloCard({ p, a }: { p: Protocolo; a: Acoes }) {
  return (
    <article
      className={`${card} group flex cursor-pointer flex-col overflow-hidden transition hover:shadow-md focus-within:ring-2 focus-within:ring-blue-200 ${p.active ? "" : "opacity-70"}`}
      onClick={() => a.abrir(p)}
    >
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">{p.category}</p>
          <CardMenu items={menuItens(p, a)} />
        </div>
        <button type="button" className="mt-1 text-left" onClick={() => a.abrir(p)}>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">{p.name}</h3>
        </button>
        <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-xs text-slate-500">{p.objetivo || "Sem descrição cadastrada."}</p>

        <div className="mt-4 flex gap-1" aria-label={`${p.totais.etapas} etapas`}>
          {p.etapas.slice(0, 12).map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full bg-blue-200" />)}
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className={eyebrow}>Valor</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{brl(p.totais.precoFinal)}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
            <Clock size={13} /> {fmtDur(p.totais.duracaoMin)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className={eyebrow}>Tratamento</p>
          <p className="text-xs font-bold text-slate-800">{p.totais.etapas} etapa{p.totais.etapas === 1 ? "" : "s"} · {fmtPrazo(p.totais.prazoDias)}</p>
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <p className="text-[11px] font-semibold text-slate-500">
          {p.emAndamento > 0 ? `${p.emAndamento} em andamento • ` : ""}{p.usos} uso{p.usos === 1 ? "" : "s"}
        </p>
        <Switch checked={p.active} onChange={(v) => a.alternar(p, v)} label={p.active ? "Desativar protocolo" : "Ativar protocolo"} />
      </footer>
    </article>
  );
}

function ProtocoloTabela({ lista, a }: { lista: Protocolo[]; a: Acoes }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Etapas</th>
              <th className="px-4 py-3">Tempo total</th>
              <th className="px-4 py-3">Tratamento</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/70 ${p.active ? "" : "opacity-60"}`} onClick={() => a.abrir(p)}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{p.category}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{p.totais.etapas}</td>
                <td className="px-4 py-3 text-slate-700">{fmtDur(p.totais.duracaoMin)}</td>
                <td className="px-4 py-3 text-slate-700">{fmtPrazo(p.totais.prazoDias)}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{brl(p.totais.precoFinal)}</td>
                <td className="px-4 py-3 text-slate-700">{p.usos}{p.emAndamento > 0 && <span className="ml-1 text-[11px] font-semibold text-blue-600">({p.emAndamento} ativo)</span>}</td>
                <td className="px-4 py-3"><Switch checked={p.active} onChange={(v) => a.alternar(p, v)} label={p.active ? "Desativar protocolo" : "Ativar protocolo"} /></td>
                <td className="px-4 py-3 text-right"><div className="flex justify-end"><CardMenu items={menuItens(p, a)} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTEÚDO DA PÁGINA
   ═══════════════════════════════════════════════════════════════ */

function Kpi({ label, value, sub, hint, icon, dark }: { label: string; value: string; sub?: string; hint: string; icon: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${dark ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
        <span className={dark ? "text-blue-300" : "text-slate-400"}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">
        {value}
        {sub && <span className={`ml-1.5 text-[11px] font-medium ${dark ? "text-slate-400" : "text-slate-400"}`}>{sub}</span>}
      </p>
      <p className={`mt-1 truncate text-[11px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

type StatusF = "ativos" | "inativos" | "todos";
type Ordem = "nome" | "preco" | "duracao" | "usos" | "recentes";

const ORDENS: { value: Ordem; label: string }[] = [
  { value: "nome", label: "Nome (A–Z)" },
  { value: "preco", label: "Maior valor" },
  { value: "duracao", label: "Maior duração" },
  { value: "usos", label: "Mais utilizados" },
  { value: "recentes", label: "Mais recentes" },
];

function ProtocolosContent({ busca }: { busca: string }) {
  const [lista, setLista] = useState<Protocolo[]>([]);
  const [catalogo, setCatalogo] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoria, setCategoria] = useState("Todos");
  const [statusF, setStatusF] = useState<StatusF>("ativos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [view, setView] = useState<"grade" | "lista">("grade");
  const dBusca = useDebounced(busca, 200);

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [form, setForm] = useState<{ item?: Protocolo } | null>(null);
  const [aplicar, setAplicar] = useState<Protocolo | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const r = await api<{ data: Protocolo[] }>(BASE);
      setLista(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar protocolos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api<Procedimento[]>(`${BASE}/procedimentos`)
      .then((r) => setCatalogo(Array.isArray(r) ? r : []))
      .catch(() => setCatalogo([]));
  }, [load]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir a ação", "err");
    }
  };

  const mudou = async () => {
    setVersao((v) => v + 1);
    await load(true);
  };

  /* ── Filtros, ordenação e indicadores (tudo sobre a lista completa) ── */

  const porStatus = useMemo(
    () => lista.filter((p) => (statusF === "todos" ? true : statusF === "ativos" ? p.active : !p.active)),
    [lista, statusF],
  );

  const categorias = useMemo(() => {
    const m = new Map<string, number>();
    porStatus.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [porStatus]);

  const todasCategorias = useMemo(() => [...new Set(lista.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "pt-BR")), [lista]);

  const visiveis = useMemo(() => {
    const q = dBusca.trim().toLowerCase();
    const filtrado = porStatus.filter(
      (p) =>
        (categoria === "Todos" || p.category === categoria) &&
        (!q || `${p.name} ${p.category} ${p.objetivo ?? ""} ${p.etapas.map((e) => e.titulo).join(" ")}`.toLowerCase().includes(q)),
    );
    const cmp: Record<Ordem, (a: Protocolo, b: Protocolo) => number> = {
      nome: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
      preco: (a, b) => b.totais.precoFinal - a.totais.precoFinal,
      duracao: (a, b) => b.totais.duracaoMin - a.totais.duracaoMin,
      usos: (a, b) => b.usos - a.usos,
      recentes: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    };
    return [...filtrado].sort(cmp[ordem]);
  }, [porStatus, categoria, dBusca, ordem]);

  // Se a categoria escolhida sumiu (ex.: mudou o status), volta para "Todos"
  useEffect(() => {
    if (categoria !== "Todos" && !categorias.some(([c]) => c === categoria)) setCategoria("Todos");
  }, [categorias, categoria]);

  const kpi = useMemo(() => {
    const ativos = lista.filter((p) => p.active);
    const media = (f: (p: Protocolo) => number) => (ativos.length ? ativos.reduce((s, p) => s + f(p), 0) / ativos.length : 0);
    const top = [...lista].sort((a, b) => b.usos - a.usos)[0];
    return {
      ativos: ativos.length,
      total: lista.length,
      categorias: new Set(ativos.map((p) => p.category)).size,
      ticket: media((p) => p.totais.precoFinal),
      tempo: Math.round(media((p) => p.totais.duracaoMin)),
      prazo: Math.round(media((p) => p.totais.prazoDias)),
      andamento: lista.reduce((s, p) => s + p.emAndamento, 0),
      top: top && top.usos > 0 ? top : null,
    };
  }, [lista]);

  /* ── Ações ── */

  const salvar = async (payload: Payload, id?: string) => {
    if (id) await api(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await api(BASE, { method: "POST", body: JSON.stringify(payload) });
    await mudou();
    toast(id ? "Protocolo atualizado" : "Protocolo criado");
  };

  const alternar = (p: Protocolo, active: boolean) => {
    setLista((l) => l.map((x) => (x.id === p.id ? { ...x, active } : x)));
    void run(async () => {
      try {
        await api(`${BASE}/${p.id}/ativo`, { method: "PATCH", body: JSON.stringify({ active }) });
        setVersao((v) => v + 1);
      } catch (e) {
        setLista((l) => l.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)));
        throw e;
      }
    }, active ? "Protocolo ativado" : "Protocolo desativado");
  };

  const duplicar = (p: Protocolo) =>
    void run(async () => {
      await api(`${BASE}/${p.id}/duplicar`, { method: "POST" });
      await mudou();
    }, "Cópia criada");

  const excluir = (p: Protocolo) =>
    setConfirm({
      message: `Excluir o protocolo "${p.name}"? Essa ação não pode ser desfeita.${p.usos > 0 ? " Ele já foi aplicado a pacientes: nesse caso, prefira desativá-lo." : ""}`,
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: () =>
        run(async () => {
          await api(`${BASE}/${p.id}`, { method: "DELETE" });
          setDetalheId((d) => (d === p.id ? null : d));
          await mudou();
        }, "Protocolo excluído"),
    });

  const aplicarProtocolo = async (p: Protocolo, body: { patientId: string; iniciadoEm: string; observacoes: string }) => {
    await api(`${BASE}/${p.id}/aplicar`, { method: "POST", body: JSON.stringify(body) });
    await mudou();
    setDetalheId(p.id);
    toast("Protocolo aplicado ao paciente");
  };

  const acoes: Acoes = {
    abrir: (p) => setDetalheId(p.id),
    editar: (p) => setForm({ item: p }),
    duplicar,
    aplicar: (p) => setAplicar(p),
    excluir,
    alternar,
  };

  const exportar = () =>
    downloadCsv(
      "protocolos.csv",
      visiveis.map((p) => ({
        Protocolo: p.name,
        Categoria: p.category,
        Ativo: p.active ? "Sim" : "Não",
        Etapas: p.totais.etapas,
        TempoTotalMin: p.totais.duracaoMin,
        DuracaoTratamentoDias: p.totais.prazoDias,
        SomaEtapas: p.totais.precoBase,
        Desconto: p.desconto,
        ValorFinal: p.totais.precoFinal,
        Usos: p.usos,
        EmAndamento: p.emAndamento,
      })),
    );

  return (
    <main className="px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Protocolos de Tratamento</h1>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Etapas, tempos e valores · {CLINICA_NOME}
            </p>
          </div>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={exportar} disabled={visiveis.length === 0}><Download size={15} /> Exportar CSV</button>
            <button className={btnPrimary} onClick={() => setForm({})}><Plus size={16} /> Novo Protocolo</button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores">
          <Kpi label="Protocolos ativos" value={String(kpi.ativos).padStart(2, "0")} sub={`de ${kpi.total}`} hint={`${kpi.categorias} categoria${kpi.categorias === 1 ? "" : "s"}`} icon={<Layers size={16} />} />
          <Kpi label="Ticket médio" value={kpi.ativos ? brl(kpi.ticket) : "—"} hint="Valor médio por protocolo" icon={<Wallet size={16} />} />
          <Kpi label="Tratamento médio" value={kpi.ativos ? fmtPrazo(kpi.prazo) : "—"} hint={kpi.ativos ? `${fmtDur(kpi.tempo)} em cadeira no total` : "Cadastre um protocolo"} icon={<Clock size={16} />} />
          <Kpi label="Pacientes em andamento" value={String(kpi.andamento).padStart(2, "0")} hint="Em tratamento agora" icon={<Users size={16} />} />
          <Kpi dark label="Mais utilizado" value={kpi.top ? `${kpi.top.usos} uso${kpi.top.usos === 1 ? "" : "s"}` : "—"} hint={kpi.top ? kpi.top.name : "Aplique um protocolo para ver"} icon={<Star size={16} />} />
        </section>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias">
            {[["Todos", porStatus.length] as const, ...categorias].map(([c, n]) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                aria-pressed={categoria === c}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${categoria === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {c} <span className={categoria === c ? "text-slate-300" : "text-slate-400"}>{n}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Status">
              {(["ativos", "inativos", "todos"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setStatusF(v)}
                  aria-pressed={statusF === v}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition ${statusF === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="relative">
              <select className={`${inputCls} appearance-none !py-2 pr-9 font-semibold`} value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar por">
                {ORDENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Visualização">
              <button onClick={() => setView("grade")} aria-pressed={view === "grade"} aria-label="Grade" className={`grid h-8 w-8 place-items-center rounded-lg ${view === "grade" ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-700"}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setView("lista")} aria-pressed={view === "lista"} aria-label="Lista" className={`grid h-8 w-8 place-items-center rounded-lg ${view === "lista" ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-700"}`}><List size={16} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : error ? (
          <div className={`${card} p-14 text-center`}>
            <p className="text-sm text-rose-600">{error}</p>
            <button className={`${btnGhost} mt-3`} onClick={() => void load()}>Tentar de novo</button>
          </div>
        ) : visiveis.length === 0 ? (
          <div className={`${card} p-16 text-center`}>
            <BookOpen size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{lista.length === 0 ? "Nenhum protocolo cadastrado ainda" : "Nenhum protocolo encontrado"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {lista.length === 0 ? "Monte seu primeiro protocolo com etapas, tempos e valores." : "Ajuste a busca, a categoria ou o status."}
            </p>
            {lista.length === 0 && <button className={`${btnBlue} mt-4`} onClick={() => setForm({})}><Plus size={15} /> Novo Protocolo</button>}
          </div>
        ) : view === "grade" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((p) => <ProtocoloCard key={p.id} p={p} a={acoes} />)}
          </div>
        ) : (
          <ProtocoloTabela lista={visiveis} a={acoes} />
        )}

        {!loading && !error && lista.length > 0 && (
          <p className="mt-4 text-xs text-slate-400">Exibindo {visiveis.length} de {lista.length} protocolo{lista.length === 1 ? "" : "s"}</p>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] text-slate-400">HealthSystem · Protocolos de tratamento</footer>
      </div>

      {detalheId && (
        <DetalheDrawer
          id={detalheId}
          versao={versao}
          onClose={() => setDetalheId(null)}
          onEdit={(p) => setForm({ item: p })}
          onAplicar={(p) => setAplicar(p)}
          onDuplicar={duplicar}
          onDelete={excluir}
          onChanged={() => void load(true)}
          toast={toast}
        />
      )}
      {form && <ProtocoloForm inicial={form.item} catalogo={catalogo} categorias={todasCategorias} onSave={salvar} onClose={() => setForm(null)} />}
      {aplicar && <AplicarModal protocolo={aplicar} onSave={(b) => aplicarProtocolo(aplicar, b)} onClose={() => setAplicar(null)} />}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      <Toasts list={toasts} />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHELL DO SISTEMA (sidebar + topbar com busca)
   Se o seu layout.tsx já renderiza isso, remova AppShell e exporte só <ProtocolosContent />
   ═══════════════════════════════════════════════════════════════ */

function AppShell({ children, busca, onBusca }: { children: React.ReactNode; busca: string; onBusca: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const buscaRef = useRef<HTMLInputElement>(null);

  // Atalho "/" foca a busca
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navegação principal"
      >
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
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
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
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <nav aria-label="Trilha" className="hidden items-center gap-2 text-[13px] sm:flex">
            <span className="text-slate-500">Gestão Clínica</span>
            <span className="text-slate-300">›</span>
            <span className="font-bold text-slate-900">Protocolos</span>
          </nav>
          <div className="relative hidden w-full max-w-[300px] md:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscaRef}
              value={busca}
              onChange={(e) => onBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-[13px] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Buscar protocolo…"
              aria-label="Buscar protocolo"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400">/</kbd>
          </div>
          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-blue-600 lg:flex"><MapPin size={15} /> {UNIDADE_NOME}</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-50" aria-label="Ajuda"><CircleHelp size={18} /></button>
            <Avatar nome={USUARIO.nome} foto={USUARIO.avatar} size={36} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50">{children}</div>
      </div>
    </div>
  );
}

export default function ProtocolosPage() {
  const [busca, setBusca] = useState("");
  return (
    <AppShell busca={busca} onBusca={setBusca}>
      <ProtocolosContent busca={busca} />
    </AppShell>
  );
}