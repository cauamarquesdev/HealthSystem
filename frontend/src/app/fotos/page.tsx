"use client";

/**
 * FOTOS CLÍNICAS & DOSSIÊ — página única (Next.js App Router + Tailwind + lucide-react).
 * Backend: NestJS /fotos (module/service/controller) + Prisma (PatientMedia).
 *
 * Esquerda: pacientes (em acompanhamento, com fotos, sem fotos).
 * Centro: visão geral da clínica OU o espaço de trabalho do paciente:
 *   Galeria · Linha do tempo · Comparar (antes/depois) · Dossiê
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FileSignature,
  Grid3x3,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  Layers,
  ListChecks,
  Loader2,
  MapPin,
  Menu,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Stethoscope,
  Trash2,
  Upload,
  UploadCloud,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
// Ajuste o caminho conforme onde você salvou o arquivo compartilhado de notificações.
import { api, NotificationBell } from "../../lib/notificacoes";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CLINICA_NOME = "Ellevare Estética Avançada";
const UNIDADE_NOME = "Unidade Av Saudade (Matriz)";
const BASE = "/fotos";

const USUARIO = {
  nome: "Dra. Joana Oliveira",
  cargo: "Diretora Médica & Sócia",
  avatar: "",
  plano: "Plano Enterprise",
};

/** Marcos de acompanhamento fotográfico (dias após o procedimento). Edite conforme o seu protocolo. */
const MARCOS: { d: number; label: string }[] = [
  { d: 0, label: "Aplicação" },
  { d: 2, label: "Pico de edema" },
  { d: 5, label: "Estabilização" },
  { d: 15, label: "Retoque" },
  { d: 30, label: "Resultado" },
];

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
   TIPOS E CONSTANTES
   ═══════════════════════════════════════════════════════════════ */

type Cat = "ANTES" | "EVOLUCAO" | "DEPOIS" | "EXAME" | "REFERENCIA" | "OUTRO";
type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type Foto = {
  id: string;
  patientId: string;
  category: Cat;
  region?: string | null;
  angle?: string | null;
  description?: string | null;
  procedimento?: string | null;
  tags: string[];
  favorite: boolean;
  takenAt: string;
  createdAt: string;
  thumb?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  appointmentId?: string | null;
};
type FotoCompleta = Foto & { url: string };

type Acomp = { procedimento: string | null; ancora: string; dias: number };

type PacienteItem = {
  id: string;
  nome: string;
  tags: string[];
  totalFotos: number;
  ultimaFotoEm?: string | null;
  ultimaThumb?: string | null;
  acompanhamento?: Acomp | null;
};

type ProcGrupo = { nome: string | null; ancora: string; ultima: string; total: number };

type PacienteDetalhe = {
  id: string;
  nome: string;
  telefone?: string | null;
  avatar?: string | null;
  tags: string[];
  fototipo?: string | null;
  tendenciaPele?: string | null;
  alergias?: string | null;
  codigo: string;
  termoImagem: boolean;
  responsavel?: string | null;
  total: number;
  porCategoria: Record<string, number>;
  procedimentos: ProcGrupo[];
};

type Resumo = {
  totalFotos: number;
  pacientesComFotos: number;
  emAcompanhamento: number;
  semTermo: number;
  mes: number;
  armazenamentoMb: number;
  acompanhamentos: PacienteItem[];
  pendenciasTermo: { id: string; nome: string; total: number }[];
};

type Atendimento = { id: string; date: string; status: string; procedimentos: string[]; profissional?: string | null };
type Filtro = "ativos" | "com-fotos" | "sem-fotos" | "todos";

const CAT: Record<Cat, { label: string; cls: string }> = {
  ANTES: { label: "Antes", cls: "bg-blue-600 text-white" },
  EVOLUCAO: { label: "Evolução", cls: "bg-amber-500 text-white" },
  DEPOIS: { label: "Depois", cls: "bg-emerald-600 text-white" },
  EXAME: { label: "Exame", cls: "bg-violet-600 text-white" },
  REFERENCIA: { label: "Referência", cls: "bg-slate-700 text-white" },
  OUTRO: { label: "Outro", cls: "bg-slate-500 text-white" },
};
const CATS = Object.keys(CAT) as Cat[];

const ANGULOS = ["Frontal", "Perfil direito", "Perfil esquerdo", "45° direito", "45° esquerdo", "Superior", "Inferior", "Detalhe (macro)", "Posterior", "Outro"];
const ANGULOS_PADRAO = ["Frontal", "Perfil direito", "Perfil esquerdo", "45° direito", "45° esquerdo"];
const REGIOES = [
  "Face completa", "Terço superior", "Terço médio", "Terço inferior", "Testa", "Glabela", "Região periorbital", "Nariz",
  "Malar", "Sulco nasogeniano", "Lábios", "Mento", "Mandíbula", "Pescoço e colo", "Abdômen", "Flancos", "Glúteos",
  "Coxas", "Braços", "Costas", "Couro cabeludo", "Mãos", "Outra",
];

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

const diaNum = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
const diasEntre = (aIso: string, bIso: string) => diaNum(bIso) - diaNum(aIso);
const hojeISO = () => new Date().toLocaleDateString("en-CA");
const addDiasISO = (iso: string, n: number) => new Date((diaNum(iso) + n) * 86400000).toISOString().slice(0, 10);
const rotuloDia = (n: number) => (n === 0 ? "D+0" : n > 0 ? `D+${n}` : `D−${Math.abs(n)}`);

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
};
const fmtDateLong = (v: string) => {
  const d = new Date(`${v.slice(0, 10)}T12:00:00`);
  return isNaN(+d) ? "—" : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
};
const fmtBytes = (n?: number | null) => (!n ? "—" : n < 1_048_576 ? `${Math.round(n / 1024)} KB` : `${(n / 1_048_576).toFixed(1)} MB`);

const iniciais = (nome = "") =>
  nome
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const keyProc = (nome: string | null | undefined) => nome ?? "__sem__";

function faseDia(dias: number) {
  const m = MARCOS.find((x) => x.d === dias);
  return m ? `D+${dias} (${m.label})` : `D+${dias}`;
}

function proximoMarco(dias: number) {
  const m = MARCOS.find((x) => x.d >= dias);
  if (!m) return null;
  return { ...m, em: m.d - dias };
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ── Imagens: compressão no navegador + cache das originais ───── */

function carregarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Não foi possível ler a imagem."));
    img.src = src;
  });
}

function reduzir(img: HTMLImageElement, max: number, qualidade: number) {
  const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * r));
  const h = Math.max(1, Math.round(img.naturalHeight * r));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("Seu navegador não suporta o processamento de imagens.");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  return { dataUrl: c.toDataURL("image/jpeg", qualidade), w, h };
}

type Preparada = { url: string; thumb: string; width: number; height: number; mimeType: string; sizeBytes: number };

async function prepararArquivo(file: File): Promise<Preparada> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error(/hei[cf]/i.test(file.type + file.name) ? "HEIC não suportado. Converta para JPG." : "Formato não suportado (use JPG, PNG ou WebP).");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo maior que 25 MB.");
  const obj = URL.createObjectURL(file);
  try {
    const img = await carregarImg(obj);
    const full = reduzir(img, 1600, 0.85);
    const thumb = reduzir(img, 360, 0.7);
    return { url: full.dataUrl, thumb: thumb.dataUrl, width: full.w, height: full.h, mimeType: "image/jpeg", sizeBytes: Math.round(full.dataUrl.length * 0.75) };
  } finally {
    URL.revokeObjectURL(obj);
  }
}

const cacheFull = new Map<string, FotoCompleta>();
async function carregarFull(id: string): Promise<FotoCompleta> {
  const c = cacheFull.get(id);
  if (c) return c;
  const f = await api<FotoCompleta>(`${BASE}/${id}`);
  cacheFull.set(id, f);
  if (cacheFull.size > 14) cacheFull.delete(cacheFull.keys().next().value as string);
  return f;
}

function baixarUrl(url: string, nome: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
}

function arredondar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

async function exportarComparacao(a: FotoCompleta, b: FotoCompleta, rotA: string, rotB: string) {
  const [ia, ib] = await Promise.all([carregarImg(a.url), carregarImg(b.url)]);
  const H = 1100;
  const pad = 40;
  const topo = 110;
  const rodape = 76;
  const wA = Math.round(ia.naturalWidth * (H / ia.naturalHeight));
  const wB = Math.round(ib.naturalWidth * (H / ib.naturalHeight));
  const c = document.createElement("canvas");
  c.width = wA + wB + pad * 3;
  c.height = H + topo + rodape;
  const g = c.getContext("2d");
  if (!g) throw new Error("Não foi possível gerar a imagem.");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#0f172a";
  g.font = "700 36px Inter, Arial, sans-serif";
  g.fillText("Evolução do tratamento", pad, 60);
  g.fillStyle = "#64748b";
  g.font = "500 22px Inter, Arial, sans-serif";
  g.fillText(CLINICA_NOME, pad, 94);
  g.drawImage(ia, pad, topo, wA, H);
  g.drawImage(ib, pad * 2 + wA, topo, wB, H);
  const pill = (txt: string, x: number, cor: string) => {
    g.font = "700 24px Inter, Arial, sans-serif";
    const w = g.measureText(txt).width + 36;
    g.fillStyle = cor;
    arredondar(g, x + 18, topo + 18, w, 44, 22);
    g.fill();
    g.fillStyle = "#fff";
    g.fillText(txt, x + 36, topo + 49);
  };
  pill(rotA, pad, "#2563eb");
  pill(rotB, pad * 2 + wA, "#059669");
  g.fillStyle = "#475569";
  g.font = "500 22px Inter, Arial, sans-serif";
  g.fillText(`${fmtDate(a.takenAt)}  →  ${fmtDate(b.takenAt)}`, pad, H + topo + 46);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  const url = URL.createObjectURL(blob);
  baixarUrl(url, `comparacao_${fmtDate(a.takenAt).replace(/\//g, "-")}_${fmtDate(b.takenAt).replace(/\//g, "-")}.png`);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const escHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

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

function IconBtn({ label, onClick, children, danger, disabled, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 ${danger ? "hover:text-rose-600" : "hover:text-blue-600"} ${className}`}
    >
      {children}
    </button>
  );
}

function Avatar({ nome, size = 36, foto }: { nome: string; size?: number; foto?: string | null }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function CatPill({ cat }: { cat: Cat }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CAT[cat]?.cls ?? CAT.OUTRO.cls}`}>{CAT[cat]?.label ?? cat}</span>;
}

/** Miniatura com suporte a modo privacidade e seleção. */
function Miniatura({ foto, privacidade, selecionada, modoSelecao, ancora, onAbrir, onSelecionar, onFavoritar }: { foto: Foto; privacidade: boolean; selecionada: boolean; modoSelecao: boolean; ancora?: string | null; onAbrir: () => void; onSelecionar: () => void; onFavoritar: () => void }) {
  return (
    <div className={`group relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 ring-2 transition ${selecionada ? "ring-blue-500" : "ring-transparent hover:ring-slate-300"}`}>
      <button type="button" onClick={modoSelecao ? onSelecionar : onAbrir} className="absolute inset-0 block h-full w-full" aria-label={`Abrir foto ${CAT[foto.category]?.label ?? ""} de ${fmtDate(foto.takenAt)}`}>
        {foto.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.thumb} alt="" loading="lazy" draggable={false} className={`h-full w-full object-cover transition ${privacidade ? "scale-110 blur-xl" : ""}`} />
        ) : (
          <span className="grid h-full w-full place-items-center text-slate-300"><ImageIcon size={28} /></span>
        )}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2 pt-8">
        <div className="flex items-center gap-1.5">
          <CatPill cat={foto.category} />
          {ancora && <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">{rotuloDia(diasEntre(ancora, foto.takenAt))}</span>}
        </div>
        {(foto.angle || foto.region) && <p className="mt-1 truncate text-[11px] font-medium text-white/90">{[foto.angle, foto.region].filter(Boolean).join(" · ")}</p>}
      </div>
      <button
        type="button"
        onClick={onSelecionar}
        aria-label={selecionada ? "Desmarcar foto" : "Selecionar foto"}
        aria-pressed={selecionada}
        className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 transition ${selecionada ? "border-blue-500 bg-blue-500 text-white" : modoSelecao ? "border-white bg-black/20 text-transparent" : "border-white bg-black/20 text-transparent opacity-0 group-hover:opacity-100"}`}
      >
        <Check size={13} />
      </button>
      <button
        type="button"
        onClick={onFavoritar}
        aria-label={foto.favorite ? "Remover dos favoritos" : "Favoritar"}
        aria-pressed={foto.favorite}
        className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/30 transition hover:bg-black/50 ${foto.favorite ? "text-amber-300" : "text-white opacity-0 group-hover:opacity-100"}`}
      >
        <Star size={14} fill={foto.favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LIGHTBOX (visualizador com zoom, edição de metadados e ações)
   ═══════════════════════════════════════════════════════════════ */

type Draft = { category: Cat; region: string; angle: string; procedimento: string; description: string; takenAt: string; tags: string };

const toDraft = (f: Foto): Draft => ({
  category: f.category,
  region: f.region ?? "",
  angle: f.angle ?? "",
  procedimento: f.procedimento ?? "",
  description: f.description ?? "",
  takenAt: f.takenAt.slice(0, 10),
  tags: f.tags.join(", "),
});

function Lightbox({ fotos, inicio, ancora, paciente, privacidade, procedimentos, onClose, onUpdate, onDelete, onComparar }: { fotos: Foto[]; inicio: number; ancora: string | null; paciente: string; privacidade: boolean; procedimentos: string[]; onClose: () => void; onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>; onDelete: (id: string) => Promise<void>; onComparar: (slot: "A" | "B", id: string) => void }) {
  const [idx, setIdx] = useState(Math.min(inicio, Math.max(0, fotos.length - 1)));
  const foto = fotos[idx];
  const [full, setFull] = useState<FotoCompleta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroImg, setErroImg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [revelar, setRevelar] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (fotos.length === 0) onClose();
    else if (idx > fotos.length - 1) setIdx(fotos.length - 1);
  }, [fotos.length, idx, onClose]);

  useEffect(() => {
    if (!foto) return;
    let vivo = true;
    setFull(null);
    setErroImg(null);
    setCarregando(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRevelar(false);
    setConfirmando(false);
    setDraft(toDraft(foto));
    carregarFull(foto.id)
      .then((f) => vivo && setFull(f))
      .catch((e: unknown) => vivo && setErroImg(e instanceof Error ? e.message : "Não foi possível carregar a imagem."))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto?.id]);

  const ir = useCallback((d: number) => setIdx((i) => Math.min(fotos.length - 1, Math.max(0, i + d))), [fotos.length]);
  const ajustarZoom = useCallback((v: number) => {
    const z = Math.min(5, Math.max(1, v));
    setZoom(z);
    if (z === 1) setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") ir(-1);
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "+" || e.key === "=") ajustarZoom(zoom + 0.5);
      else if (e.key === "-") ajustarZoom(zoom - 0.5);
      else if (e.key === "0") ajustarZoom(1);
      else if (e.key.toLowerCase() === "f" && foto) void onUpdate(foto.id, { favorita: !foto.favorite });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, ajustarZoom, zoom, foto, onClose, onUpdate]);

  if (!foto || !draft) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(foto));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const oculta = privacidade && !revelar;

  const salvar = async () => {
    setSalvando(true);
    try {
      await onUpdate(foto.id, {
        categoria: draft.category,
        regiao: draft.region,
        angulo: draft.angle,
        procedimento: draft.procedimento,
        descricao: draft.description,
        takenAt: draft.takenAt,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      cacheFull.delete(foto.id);
    } finally {
      setSalvando(false);
    }
  };

  const baixar = () => {
    if (!full) return;
    baixarUrl(full.url, `${slug(paciente)}_${foto.category.toLowerCase()}_${foto.takenAt.slice(0, 10)}${foto.angle ? `_${slug(foto.angle)}` : ""}.jpg`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/95 lg:flex-row" role="dialog" aria-modal="true" aria-label="Visualizador de foto">
      {/* Área da imagem */}
      <div className="relative flex min-h-[50vh] flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="text-sm font-semibold">
            {idx + 1} / {fotos.length}
            <span className="ml-3 font-medium text-white/60">{fmtDate(foto.takenAt)}{ancora ? ` · ${rotuloDia(diasEntre(ancora, foto.takenAt))}` : ""}</span>
          </p>
          <button onClick={onClose} aria-label="Fechar visualizador" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={18} /></button>
        </div>

        <div
          className="relative flex-1 select-none overflow-hidden"
          onWheel={(e) => ajustarZoom(zoom - e.deltaY * 0.002)}
          onPointerDown={(e) => {
            if (zoom > 1) {
              arrasto.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={(e) => arrasto.current && setPan({ x: e.clientX - arrasto.current.x, y: e.clientY - arrasto.current.y })}
          onPointerUp={() => (arrasto.current = null)}
          onDoubleClick={() => ajustarZoom(zoom > 1 ? 1 : 2.5)}
          style={{ cursor: zoom > 1 ? "grab" : "zoom-in", touchAction: "none" }}
        >
          {carregando && <div className="absolute inset-0 grid place-items-center text-white/70"><Loader2 className="animate-spin" /></div>}
          {erroImg && <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-300">{erroImg}</div>}
          {full && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={full.url}
              alt={`Foto de ${paciente}`}
              draggable={false}
              className={`absolute inset-0 h-full w-full object-contain transition-[filter] ${oculta ? "blur-2xl" : ""}`}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            />
          )}
          {oculta && full && (
            <div className="absolute inset-0 grid place-items-center">
              <button onClick={() => setRevelar(true)} className={`${btnGhost} !bg-white`}><Eye size={15} /> Revelar imagem</button>
            </div>
          )}
        </div>

        <button onClick={() => ir(-1)} disabled={idx === 0} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"><ChevronLeft size={22} /></button>
        <button onClick={() => ir(1)} disabled={idx === fotos.length - 1} aria-label="Próxima foto" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"><ChevronRight size={22} /></button>

        <div className="flex items-center justify-center gap-2 px-4 py-3 text-white">
          <button onClick={() => ajustarZoom(zoom - 0.5)} aria-label="Diminuir zoom" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ZoomOut size={16} /></button>
          <span className="w-12 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
          <button onClick={() => ajustarZoom(zoom + 0.5)} aria-label="Aumentar zoom" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ZoomIn size={16} /></button>
          <button onClick={() => ajustarZoom(1)} aria-label="Restaurar zoom" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><RotateCcw size={15} /></button>
          <span className="ml-3 hidden text-[11px] text-white/50 sm:inline">← → navegar · + − zoom · F favoritar · duplo clique amplia</span>
        </div>
      </div>

      {/* Painel de informações */}
      <aside className="max-h-[50vh] w-full shrink-0 overflow-y-auto bg-white lg:max-h-none lg:w-[360px]">
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><CatPill cat={foto.category} />{foto.favorite && <Star size={14} className="text-amber-500" fill="currentColor" />}</div>
            <p className="text-[11px] text-slate-400">{fmtBytes(foto.sizeBytes)}{foto.width && foto.height ? ` · ${foto.width}×${foto.height}` : ""}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select className={inputCls} value={draft.category} onChange={(e) => set("category", e.target.value as Cat)}>
                {CATS.map((c) => <option key={c} value={c}>{CAT[c].label}</option>)}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" className={inputCls} value={draft.takenAt} max={hojeISO()} onChange={(e) => set("takenAt", e.target.value)} />
            </Field>
            <Field label="Ângulo">
              <select className={inputCls} value={draft.angle} onChange={(e) => set("angle", e.target.value)}>
                <option value="">—</option>
                {ANGULOS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Região">
              <select className={inputCls} value={draft.region} onChange={(e) => set("region", e.target.value)}>
                <option value="">—</option>
                {REGIOES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Procedimento">
            <input className={inputCls} list="procs-lightbox" value={draft.procedimento} onChange={(e) => set("procedimento", e.target.value)} placeholder="Ex.: Harmonização Full Face" />
            <datalist id="procs-lightbox">{procedimentos.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label="Observações">
            <textarea rows={3} className={inputCls} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Achados clínicos, intercorrências, parâmetros…" />
          </Field>
          <Field label="Tags (separe por vírgula)">
            <input className={inputCls} value={draft.tags} onChange={(e) => set("tags", e.target.value)} placeholder="edema, hematoma, simetria" />
          </Field>

          {dirty && (
            <div className="flex gap-2">
              <button className={`${btnBlue} flex-1`} onClick={() => void salvar()} disabled={salvando}>{salvando && <Loader2 size={15} className="animate-spin" />} Salvar alterações</button>
              <button className={btnGhost} onClick={() => setDraft(toDraft(foto))}>Desfazer</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            <button className={btnGhost} onClick={() => void onUpdate(foto.id, { favorita: !foto.favorite })}><Star size={14} fill={foto.favorite ? "currentColor" : "none"} className={foto.favorite ? "text-amber-500" : ""} /> {foto.favorite ? "Favorita" : "Favoritar"}</button>
            <button className={btnGhost} onClick={baixar} disabled={!full}><Download size={14} /> Baixar</button>
            <button className={btnGhost} onClick={() => { onComparar("A", foto.id); onClose(); }}><ArrowLeftRight size={14} /> Usar como “Antes”</button>
            <button className={btnGhost} onClick={() => { onComparar("B", foto.id); onClose(); }}><ArrowLeftRight size={14} /> Usar como “Depois”</button>
          </div>

          {!confirmando ? (
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={() => setConfirmando(true)}><Trash2 size={14} /> Excluir foto</button>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-700">Excluir esta foto definitivamente?</p>
              <div className="mt-2 flex gap-2">
                <button className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700" onClick={() => void onDelete(foto.id)}>Sim, excluir</button>
                <button className={`${btnGhost} !py-2 text-xs`} onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400">Acessos e alterações nesta foto ficam registrados na trilha de auditoria (LGPD).</p>
        </div>
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENVIO DE FOTOS
   ═══════════════════════════════════════════════════════════════ */

type ItemUp = {
  id: string;
  nome: string;
  dados?: Preparada;
  categoria: Cat;
  angulo: string;
  regiao: string;
  descricao: string;
  status: "preparando" | "pronto" | "enviando" | "ok" | "erro";
  erro?: string;
};

type UploadInicial = { files?: File[]; categoria?: Cat; data?: string; procedimento?: string };

let seqUp = 0;

function UploadModal({ paciente, procedimentos, inicial, onClose, onDone }: { paciente: PacienteDetalhe; procedimentos: string[]; inicial?: UploadInicial; onClose: () => void; onDone: (n: number) => void }) {
  const [itens, setItens] = useState<ItemUp[]>([]);
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [procedimento, setProcedimento] = useState(inicial?.procedimento ?? "");
  const [categoriaPadrao, setCategoriaPadrao] = useState<Cat>(inicial?.categoria ?? "ANTES");
  const [regiaoPadrao, setRegiaoPadrao] = useState("");
  const [atendimentoId, setAtendimentoId] = useState("");
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const padroes = useRef({ categoria: categoriaPadrao, regiao: regiaoPadrao });
  padroes.current = { categoria: categoriaPadrao, regiao: regiaoPadrao };

  useEffect(() => {
    api<Atendimento[]>(`${BASE}/pacientes/${paciente.id}/atendimentos`).then((r) => setAtendimentos(Array.isArray(r) ? r : [])).catch(() => setAtendimentos([]));
  }, [paciente.id]);

  const adicionar = useCallback(async (files: File[]) => {
    const novos: ItemUp[] = files.map((f) => ({
      id: `u${++seqUp}`,
      nome: f.name,
      categoria: padroes.current.categoria,
      angulo: "",
      regiao: padroes.current.regiao,
      descricao: "",
      status: "preparando",
    }));
    setItens((l) => [...l, ...novos]);
    for (let i = 0; i < files.length; i++) {
      const id = novos[i].id;
      try {
        const dados = await prepararArquivo(files[i]);
        setItens((l) => l.map((x) => (x.id === id ? { ...x, dados, status: "pronto" } : x)));
      } catch (e) {
        setItens((l) => l.map((x) => (x.id === id ? { ...x, status: "erro", erro: e instanceof Error ? e.message : "Falha ao processar" } : x)));
      }
    }
  }, []);

  useEffect(() => {
    if (inicial?.files?.length) void adicionar(inicial.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id: string, p: Partial<ItemUp>) => setItens((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const escolherAtendimento = (id: string) => {
    setAtendimentoId(id);
    const a = atendimentos.find((x) => x.id === id);
    if (!a) return;
    if (!procedimento.trim() && a.procedimentos.length) setProcedimento(a.procedimentos.join(" + "));
    const dia = a.date.slice(0, 10);
    if (dia <= hojeISO()) setData(dia);
  };

  const prontos = itens.filter((i) => i.status === "pronto" || i.status === "erro" && i.dados);
  const aEnviar = itens.filter((i) => i.dados && (i.status === "pronto" || (i.status === "erro" && i.dados)));
  const preparando = itens.some((i) => i.status === "preparando");

  const enviar = async () => {
    setEnviando(true);
    let ok = 0;
    for (const it of aEnviar) {
      if (!it.dados) continue;
      patch(it.id, { status: "enviando", erro: undefined });
      try {
        await api(BASE, {
          method: "POST",
          body: JSON.stringify({
            patientId: paciente.id,
            url: it.dados.url,
            thumb: it.dados.thumb,
            categoria: it.categoria,
            regiao: it.regiao || null,
            angulo: it.angulo || null,
            descricao: it.descricao || null,
            procedimento: procedimento.trim() || null,
            takenAt: data,
            appointmentId: atendimentoId || null,
            mimeType: it.dados.mimeType,
            sizeBytes: it.dados.sizeBytes,
            width: it.dados.width,
            height: it.dados.height,
          }),
        });
        patch(it.id, { status: "ok" });
        ok++;
      } catch (e) {
        patch(it.id, { status: "erro", erro: e instanceof Error ? e.message : "Falha ao enviar" });
      }
    }
    setEnviando(false);
    if (ok > 0) onDone(ok);
    setItens((l) => {
      if (l.every((x) => x.status === "ok")) setTimeout(onClose, 400);
      return l;
    });
  };

  const pendentes = aEnviar.length;
  void prontos;

  return (
    <Modal wide title="Enviar fotos" subtitle={`Paciente: ${paciente.nome}`} onClose={enviando ? () => {} : onClose}>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {!paciente.termoImagem && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800" role="alert">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              Este paciente ainda não tem o <strong>termo de uso de imagem</strong> assinado. Você pode enviar as fotos, mas colete o termo em{" "}
              <Link href="/termos" className="font-bold underline">Termos & Documentos</Link> antes de usá-las em comparativos ou divulgação.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Data das fotos">
            <input type="date" className={inputCls} value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Categoria padrão">
            <select className={inputCls} value={categoriaPadrao} onChange={(e) => setCategoriaPadrao(e.target.value as Cat)}>
              {CATS.map((c) => <option key={c} value={c}>{CAT[c].label}</option>)}
            </select>
          </Field>
          <Field label="Região padrão">
            <select className={inputCls} value={regiaoPadrao} onChange={(e) => setRegiaoPadrao(e.target.value)}>
              <option value="">—</option>
              {REGIOES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Atendimento relacionado" className="sm:col-span-1">
            <select className={inputCls} value={atendimentoId} onChange={(e) => escolherAtendimento(e.target.value)}>
              <option value="">Nenhum</option>
              {atendimentos.map((a) => <option key={a.id} value={a.id}>{fmtDate(a.date)} — {a.procedimentos.join(", ") || "Atendimento"}</option>)}
            </select>
          </Field>
          <Field label="Procedimento acompanhado" className="sm:col-span-2">
            <input className={inputCls} list="procs-upload" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} placeholder="Ex.: Harmonização Full Face (agrupa as fotos na linha do tempo)" />
            <datalist id="procs-upload">{procedimentos.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); void adicionar([...e.dataTransfer.files]); }}
          className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${arrastando ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50/60"}`}
        >
          <UploadCloud size={28} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Arraste as fotos aqui</p>
          <p className="mt-0.5 text-xs text-slate-500">JPG, PNG ou WebP · reduzidas automaticamente antes do envio</p>
          <div className="mt-4 flex justify-center gap-2">
            <button className={btnGhost} onClick={() => inputRef.current?.click()}><Upload size={14} /> Escolher arquivos</button>
            <button className={btnGhost} onClick={() => cameraRef.current?.click()}><Camera size={14} /> Tirar foto</button>
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { void adicionar([...(e.target.files ?? [])]); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void adicionar([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </div>

        {itens.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className={eyebrow}>{itens.length} foto(s)</p>
              <div className="flex gap-2">
                <button className={`${btnGhost} !px-2.5 !py-1.5 text-xs`} onClick={() => setItens((l) => l.map((x) => ({ ...x, categoria: categoriaPadrao, regiao: regiaoPadrao })))}>Aplicar padrões a todas</button>
                <button className={`${btnGhost} !px-2.5 !py-1.5 text-xs`} onClick={() => setItens((l) => l.map((x, i) => ({ ...x, angulo: ANGULOS_PADRAO[i] ?? x.angulo })))}>Sugerir ângulos padrão</button>
              </div>
            </div>
            <ul className="space-y-2.5">
              {itens.map((it) => (
                <li key={it.id} className={`flex gap-3 rounded-xl border p-3 ${it.status === "erro" ? "border-rose-200 bg-rose-50/40" : it.status === "ok" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {it.dados ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.dados.thumb} alt="" className="h-full w-full object-cover" />
                    ) : it.status === "preparando" ? (
                      <span className="grid h-full place-items-center"><Loader2 size={16} className="animate-spin text-slate-400" /></span>
                    ) : (
                      <span className="grid h-full place-items-center text-rose-400"><AlertTriangle size={18} /></span>
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                    <p className="col-span-2 truncate text-xs font-semibold text-slate-700 sm:col-span-4">
                      {it.nome}
                      {it.dados && <span className="ml-2 font-medium text-slate-400">{fmtBytes(it.dados.sizeBytes)}</span>}
                      {it.status === "enviando" && <Loader2 size={12} className="ml-2 inline animate-spin text-blue-600" />}
                      {it.status === "ok" && <CheckCircle2 size={13} className="ml-2 inline text-emerald-600" />}
                    </p>
                    {it.status === "erro" && !it.dados ? (
                      <p className="col-span-2 text-xs text-rose-600 sm:col-span-4">{it.erro}</p>
                    ) : (
                      <>
                        <select aria-label="Categoria" className={`${inputCls} !py-1.5 text-xs`} value={it.categoria} onChange={(e) => patch(it.id, { categoria: e.target.value as Cat })} disabled={enviando}>
                          {CATS.map((c) => <option key={c} value={c}>{CAT[c].label}</option>)}
                        </select>
                        <select aria-label="Ângulo" className={`${inputCls} !py-1.5 text-xs`} value={it.angulo} onChange={(e) => patch(it.id, { angulo: e.target.value })} disabled={enviando}>
                          <option value="">Ângulo…</option>
                          {ANGULOS.map((a) => <option key={a}>{a}</option>)}
                        </select>
                        <select aria-label="Região" className={`${inputCls} !py-1.5 text-xs`} value={it.regiao} onChange={(e) => patch(it.id, { regiao: e.target.value })} disabled={enviando}>
                          <option value="">Região…</option>
                          {REGIOES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                        <input aria-label="Observação" className={`${inputCls} !py-1.5 text-xs`} placeholder="Observação" value={it.descricao} onChange={(e) => patch(it.id, { descricao: e.target.value })} disabled={enviando} />
                        {it.status === "erro" && <p className="col-span-2 text-xs text-rose-600 sm:col-span-4">{it.erro}</p>}
                      </>
                    )}
                  </div>
                  <IconBtn label="Remover da lista" danger onClick={() => setItens((l) => l.filter((x) => x.id !== it.id))} disabled={enviando}><X size={15} /></IconBtn>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
        <p className="text-xs text-slate-500">{preparando ? "Preparando imagens…" : pendentes > 0 ? `${pendentes} foto(s) pronta(s) para enviar` : "Adicione fotos para continuar"}</p>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={onClose} disabled={enviando}>Fechar</button>
          <button className={btnBlue} onClick={() => void enviar()} disabled={enviando || preparando || pendentes === 0}>
            {enviando && <Loader2 size={15} className="animate-spin" />}
            Enviar {pendentes > 0 ? pendentes : ""} foto{pendentes === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GALERIA
   ═══════════════════════════════════════════════════════════════ */

function Galeria({ fotos, ancora, procedimentos, privacidade, sel, setSel, onAbrir, onFavoritar, onUpload, onBulkCategoria, onBulkExcluir, onBulkBaixar, onComparar }: { fotos: Foto[]; ancora: string | null; procedimentos: ProcGrupo[]; privacidade: boolean; sel: Set<string>; setSel: (s: Set<string>) => void; onAbrir: (lista: Foto[], idx: number) => void; onFavoritar: (f: Foto) => void; onUpload: () => void; onBulkCategoria: (c: Cat) => void; onBulkExcluir: () => void; onBulkBaixar: () => void; onComparar: (a: string, b: string) => void }) {
  const [cat, setCat] = useState<Cat | "TODAS">("TODAS");
  const [regiao, setRegiao] = useState("");
  const [proc, setProc] = useState("");
  const [favs, setFavs] = useState(false);
  const [ordem, setOrdem] = useState<"recentes" | "antigas">("recentes");
  const [modoSelecao, setModoSelecao] = useState(false);

  const contagem = useMemo(() => {
    const m: Record<string, number> = {};
    fotos.forEach((f) => (m[f.category] = (m[f.category] ?? 0) + 1));
    return m;
  }, [fotos]);
  const regioes = useMemo(() => [...new Set(fotos.map((f) => f.region).filter((x): x is string => !!x))].sort(), [fotos]);

  const visiveis = useMemo(() => {
    const l = fotos.filter(
      (f) => (cat === "TODAS" || f.category === cat) && (!regiao || f.region === regiao) && (!proc || keyProc(f.procedimento) === proc) && (!favs || f.favorite),
    );
    return ordem === "recentes" ? l : [...l].reverse();
  }, [fotos, cat, regiao, proc, favs, ordem]);

  const grupos = useMemo(() => {
    const m = new Map<string, Foto[]>();
    visiveis.forEach((f) => {
      const d = f.takenAt.slice(0, 10);
      m.set(d, [...(m.get(d) ?? []), f]);
    });
    return [...m.entries()];
  }, [visiveis]);

  const alternar = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSel(n);
    if (n.size > 0) setModoSelecao(true);
  };
  const limparSel = () => {
    setSel(new Set());
    setModoSelecao(false);
  };
  const selecionadas = [...sel];

  if (fotos.length === 0)
    return (
      <div className={`${card} p-14 text-center`}>
        <ImageIcon size={32} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-700">Nenhuma foto deste paciente ainda</p>
        <p className="mt-1 text-xs text-slate-500">Envie as primeiras fotos para iniciar o dossiê e o acompanhamento.</p>
        <button className={`${btnBlue} mt-4`} onClick={onUpload}><Plus size={15} /> Enviar fotos</button>
      </div>
    );

  return (
    <div className="pb-20">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["TODAS", ...CATS] as const).map((c) => {
          const n = c === "TODAS" ? fotos.length : contagem[c] ?? 0;
          if (c !== "TODAS" && n === 0) return null;
          return (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${cat === c ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {c === "TODAS" ? "Todas" : CAT[c].label} <span className={cat === c ? "text-slate-300" : "text-slate-400"}>{n}</span>
            </button>
          );
        })}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {regioes.length > 0 && (
            <select aria-label="Filtrar por região" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={regiao} onChange={(e) => setRegiao(e.target.value)}>
              <option value="">Todas as regiões</option>
              {regioes.map((r) => <option key={r}>{r}</option>)}
            </select>
          )}
          {procedimentos.length > 1 && (
            <select aria-label="Filtrar por procedimento" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={proc} onChange={(e) => setProc(e.target.value)}>
              <option value="">Todos os procedimentos</option>
              {procedimentos.map((p) => <option key={keyProc(p.nome)} value={keyProc(p.nome)}>{p.nome ?? "Sem procedimento"}</option>)}
            </select>
          )}
          <button onClick={() => setFavs((v) => !v)} aria-pressed={favs} className={`${btnGhost} !px-3 !py-1.5 text-xs ${favs ? "!border-amber-300 !bg-amber-50 !text-amber-700" : ""}`}><Star size={13} fill={favs ? "currentColor" : "none"} /> Favoritas</button>
          <button onClick={() => setOrdem((o) => (o === "recentes" ? "antigas" : "recentes"))} className={`${btnGhost} !px-3 !py-1.5 text-xs`}>{ordem === "recentes" ? "Mais recentes" : "Mais antigas"}</button>
          <button onClick={() => (modoSelecao ? limparSel() : setModoSelecao(true))} aria-pressed={modoSelecao} className={`${btnGhost} !px-3 !py-1.5 text-xs ${modoSelecao ? "!border-blue-300 !bg-blue-50 !text-blue-700" : ""}`}><Check size={13} /> Selecionar</button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className={`${card} p-12 text-center text-sm text-slate-500`}>Nenhuma foto com esses filtros.</div>
      ) : (
        <div className="space-y-7">
          {grupos.map(([dia, lista]) => {
            const todas = lista.every((f) => sel.has(f.id));
            return (
              <section key={dia} aria-label={fmtDateLong(dia)}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <h3 className="text-sm font-extrabold capitalize text-slate-900">{fmtDateLong(dia)}</h3>
                  {ancora && <Badge tone="info">{rotuloDia(diasEntre(ancora, dia))}</Badge>}
                  <span className="text-xs text-slate-400">{lista.length} foto{lista.length === 1 ? "" : "s"}</span>
                  <button
                    className="ml-auto text-[11px] font-semibold text-blue-600 hover:underline"
                    onClick={() => {
                      const n = new Set(sel);
                      lista.forEach((f) => (todas ? n.delete(f.id) : n.add(f.id)));
                      setSel(n);
                      if (n.size > 0) setModoSelecao(true);
                    }}
                  >
                    {todas ? "Desmarcar o dia" : "Selecionar o dia"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {lista.map((f) => (
                    <Miniatura
                      key={f.id}
                      foto={f}
                      privacidade={privacidade}
                      selecionada={sel.has(f.id)}
                      modoSelecao={modoSelecao}
                      ancora={ancora}
                      onAbrir={() => onAbrir(visiveis, visiveis.findIndex((x) => x.id === f.id))}
                      onSelecionar={() => alternar(f.id)}
                      onFavoritar={() => onFavoritar(f)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selecionadas.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto mt-6 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white shadow-2xl">
          <span className="text-sm font-bold">{selecionadas.length} selecionada(s)</span>
          {selecionadas.length === 2 && (
            <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20" onClick={() => {
              const [x, y] = selecionadas.map((id) => fotos.find((f) => f.id === id)!).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
              onComparar(x.id, y.id);
              limparSel();
            }}><ArrowLeftRight size={13} /> Comparar</button>
          )}
          <select aria-label="Mudar categoria" className="rounded-lg bg-white/10 px-2 py-1.5 text-xs font-bold text-white" value="" onChange={(e) => { if (e.target.value) { onBulkCategoria(e.target.value as Cat); limparSel(); } }}>
            <option value="" className="text-slate-900">Mudar categoria…</option>
            {CATS.map((c) => <option key={c} value={c} className="text-slate-900">{CAT[c].label}</option>)}
          </select>
          <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20" onClick={onBulkBaixar}><Download size={13} /> Baixar</button>
          <button className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold hover:bg-rose-700" onClick={onBulkExcluir}><Trash2 size={13} /> Excluir</button>
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10" onClick={limparSel} aria-label="Limpar seleção"><X size={15} /></button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LINHA DO TEMPO + MARCOS
   ═══════════════════════════════════════════════════════════════ */

function SeletorProcedimento({ grupos, valor, onChange }: { grupos: ProcGrupo[]; valor: string; onChange: (v: string) => void }) {
  if (grupos.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={eyebrow}>Procedimento</span>
      <select aria-label="Procedimento de referência" className={`${inputCls} !w-auto !py-1.5 text-xs font-semibold`} value={valor} onChange={(e) => onChange(e.target.value)}>
        {grupos.map((g) => <option key={keyProc(g.nome)} value={keyProc(g.nome)}>{g.nome ?? "Sem procedimento informado"} · {fmtDate(g.ancora)}</option>)}
      </select>
    </div>
  );
}

function Timeline({ fotos, grupo, grupos, procRef, setProcRef, privacidade, onAbrir, onUploadMarco }: { fotos: Foto[]; grupo: ProcGrupo | null; grupos: ProcGrupo[]; procRef: string; setProcRef: (v: string) => void; privacidade: boolean; onAbrir: (lista: Foto[], idx: number) => void; onUploadMarco: (d: string) => void }) {
  if (!grupo)
    return <div className={`${card} p-12 text-center text-sm text-slate-500`}>Envie fotos informando o procedimento para montar a linha do tempo e os marcos de acompanhamento.</div>;

  const ancora = grupo.ancora.slice(0, 10);
  const daGrupo = fotos.filter((f) => keyProc(f.procedimento) === keyProc(grupo.nome)).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const hojeD = diasEntre(ancora, hojeISO());

  const marcos = MARCOS.map((m) => {
    const tol = m.d === 0 ? 0 : 1;
    const feita = daGrupo.some((f) => Math.abs(diasEntre(ancora, f.takenAt) - m.d) <= tol);
    const estado = feita ? "ok" : hojeD > m.d + tol ? "atrasado" : Math.abs(hojeD - m.d) <= tol ? "hoje" : "futuro";
    return { ...m, estado, data: addDiasISO(ancora, m.d) };
  });

  const porDia = new Map<string, Foto[]>();
  daGrupo.forEach((f) => porDia.set(f.takenAt.slice(0, 10), [...(porDia.get(f.takenAt.slice(0, 10)) ?? []), f]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeletorProcedimento grupos={grupos} valor={procRef} onChange={setProcRef} />
        <p className="text-xs text-slate-500">Início em <strong className="text-slate-800">{fmtDate(ancora)}</strong> · hoje é <strong className="text-slate-800">{rotuloDia(hojeD)}</strong></p>
      </div>

      <section className={`${card} p-5`} aria-label="Marcos de acompanhamento">
        <p className={`${eyebrow} mb-4`}>Marcos de acompanhamento fotográfico</p>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {marcos.map((m) => {
            const tone = m.estado === "ok" ? "border-emerald-200 bg-emerald-50" : m.estado === "atrasado" ? "border-rose-200 bg-rose-50" : m.estado === "hoje" ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white";
            return (
              <li key={m.d} className={`rounded-xl border p-3 ${tone}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">D+{m.d}</span>
                  {m.estado === "ok" ? <CheckCircle2 size={16} className="text-emerald-600" /> : m.estado === "atrasado" ? <AlertTriangle size={16} className="text-rose-500" /> : <CalendarClock size={16} className={m.estado === "hoje" ? "text-blue-600" : "text-slate-300"} />}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-600">{m.label}</p>
                <p className="text-[11px] text-slate-400">{fmtDate(m.data)}</p>
                <p className={`mt-1.5 text-[11px] font-bold ${m.estado === "ok" ? "text-emerald-700" : m.estado === "atrasado" ? "text-rose-600" : m.estado === "hoje" ? "text-blue-700" : "text-slate-400"}`}>
                  {m.estado === "ok" ? "Registrado" : m.estado === "atrasado" ? "Sem foto" : m.estado === "hoje" ? "Registrar hoje" : `Em ${m.d - hojeD} dia(s)`}
                </p>
                {(m.estado === "atrasado" || m.estado === "hoje") && (
                  <button className="mt-2 w-full rounded-lg border border-current px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-white" onClick={() => onUploadMarco(m.data <= hojeISO() ? m.data : hojeISO())}>
                    Enviar foto
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <ol className="relative ml-3 border-l-2 border-slate-200 pl-6" aria-label="Linha do tempo">
        {[...porDia.entries()].map(([dia, lista]) => {
          const n = diasEntre(ancora, dia);
          const marco = MARCOS.find((m) => m.d === n);
          return (
            <li key={dia} className="relative pb-7 last:pb-0">
              <span className="absolute -left-[37px] top-0 grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[9px] font-extrabold text-white ring-4 ring-slate-50">{n}</span>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-extrabold capitalize text-slate-900">{fmtDateLong(dia)}</h4>
                <Badge tone="info">{rotuloDia(n)}</Badge>
                {marco && <Badge tone="success">{marco.label}</Badge>}
              </div>
              <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
                {lista.map((f) => (
                  <button key={f.id} onClick={() => onAbrir(daGrupo, daGrupo.findIndex((x) => x.id === f.id))} className="group relative h-28 w-[84px] shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-2 ring-transparent hover:ring-blue-300" aria-label={`Abrir foto ${CAT[f.category].label}`}>
                    {f.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.thumb} alt="" loading="lazy" className={`h-full w-full object-cover ${privacidade ? "scale-110 blur-lg" : ""}`} />
                    ) : (
                      <span className="grid h-full place-items-center text-slate-300"><ImageIcon size={20} /></span>
                    )}
                    <span className="absolute bottom-1 left-1"><CatPill cat={f.category} /></span>
                  </button>
                ))}
              </div>
              {lista.some((f) => f.description) && <p className="mt-2 max-w-xl text-xs text-slate-600">{lista.find((f) => f.description)?.description}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPARADOR ANTES / DEPOIS
   ═══════════════════════════════════════════════════════════════ */

type Modo = "slider" | "lado" | "sobrepor";

function Comparador({ fotos, ancora, idA, idB, setIdA, setIdB, privacidade, toast }: { fotos: Foto[]; ancora: string | null; idA: string; idB: string; setIdA: (id: string) => void; setIdB: (id: string) => void; privacidade: boolean; toast: ToastFn }) {
  const [modo, setModo] = useState<Modo>("slider");
  const [pos, setPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grade, setGrade] = useState(false);
  const [opac, setOpac] = useState(50);
  const [A, setA] = useState<FotoCompleta | null>(null);
  const [B, setB] = useState<FotoCompleta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [revelar, setRevelar] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ tipo: "divisor" | "pan"; x: number; y: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([idA ? carregarFull(idA) : null, idB ? carregarFull(idB) : null])
      .then(([a, b]) => {
        if (!vivo) return;
        setA(a);
        setB(b);
      })
      .catch((e: unknown) => vivo && toast(e instanceof Error ? e.message : "Não foi possível carregar as imagens", "err"))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idA, idB]);

  const fa = fotos.find((f) => f.id === idA);
  const fb = fotos.find((f) => f.id === idB);
  const rotulo = (f?: Foto) => (f ? `${CAT[f.category].label}${ancora ? ` · ${rotuloDia(diasEntre(ancora, f.takenAt))}` : ""}` : "—");
  const opcao = (f: Foto) => `${fmtDate(f.takenAt)} · ${CAT[f.category].label} · ${f.angle ?? "sem ângulo"}${ancora ? ` · ${rotuloDia(diasEntre(ancora, f.takenAt))}` : ""}`;
  const ordenadas = useMemo(() => [...fotos].sort((a, b) => a.takenAt.localeCompare(b.takenAt)), [fotos]);
  const oculta = privacidade && !revelar;

  const ajustarZoom = (v: number) => {
    const z = Math.min(4, Math.max(1, v));
    setZoom(z);
    if (z === 1) setPan({ x: 0, y: 0 });
  };

  const moverDivisor = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const alvoDivisor = (e.target as HTMLElement).closest("[data-divisor]");
    if (modo === "slider" && alvoDivisor) arrasto.current = { tipo: "divisor", x: 0, y: 0 };
    else if (zoom > 1) arrasto.current = { tipo: "pan", x: e.clientX - pan.x, y: e.clientY - pan.y };
    else return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a) return;
    if (a.tipo === "divisor") moverDivisor(e.clientX);
    else setPan({ x: e.clientX - a.x, y: e.clientY - a.y });
  };

  const camada = (f: FotoCompleta | null, extra = "") =>
    f ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={f.url} alt="" draggable={false} className={`absolute inset-0 h-full w-full object-contain ${oculta ? "blur-2xl" : ""} ${extra}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
    ) : null;

  const gradeEl = grade ? (
    <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "33.333% 25%" }}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-rose-400/80" />
    </div>
  ) : null;

  const moldura = "relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-slate-900 touch-none";

  const exportar = async () => {
    if (!A || !B || !fa || !fb) return;
    setExportando(true);
    try {
      await exportarComparacao(A, B, rotulo(fa), rotulo(fb));
      toast("Comparativo exportado");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível exportar", "err");
    } finally {
      setExportando(false);
    }
  };

  if (fotos.length < 2)
    return <div className={`${card} p-12 text-center text-sm text-slate-500`}>Envie ao menos duas fotos deste paciente para comparar a evolução.</div>;

  return (
    <div className="space-y-4">
      <div className={`${card} grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto_1fr]`}>
        <Field label="Foto A — Antes">
          <select className={inputCls} value={idA} onChange={(e) => setIdA(e.target.value)}>
            <option value="">Selecione…</option>
            {ordenadas.map((f) => <option key={f.id} value={f.id}>{opcao(f)}</option>)}
          </select>
        </Field>
        <div className="flex items-end justify-center">
          <button className={btnGhost} onClick={() => { setIdA(idB); setIdB(idA); }} aria-label="Trocar A e B"><ArrowLeftRight size={15} /></button>
        </div>
        <Field label="Foto B — Depois">
          <select className={inputCls} value={idB} onChange={(e) => setIdB(e.target.value)}>
            <option value="">Selecione…</option>
            {ordenadas.map((f) => <option key={f.id} value={f.id}>{opcao(f)}</option>)}
          </select>
        </Field>
        {fa && fb && fa.angle !== fb.angle && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 sm:col-span-3"><AlertTriangle size={13} /> Os ângulos são diferentes ({fa.angle ?? "sem ângulo"} × {fb.angle ?? "sem ângulo"}). Compare o mesmo ângulo para uma leitura fiel.</p>
        )}
      </div>

      <div className={`${card} flex flex-wrap items-center gap-x-5 gap-y-3 p-3`}>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Modo de comparação">
          {([["slider", "Divisor", <SlidersHorizontal key="s" size={13} />], ["lado", "Lado a lado", <Columns3 key="l" size={13} />], ["sobrepor", "Sobrepor", <Layers key="o" size={13} />]] as const).map(([v, l, ic]) => (
            <button key={v} onClick={() => setModo(v)} aria-pressed={modo === v} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${modo === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}>{ic}{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut size={14} className="text-slate-400" />
          <input type="range" min={1} max={4} step={0.1} value={zoom} onChange={(e) => ajustarZoom(Number(e.target.value))} aria-label="Zoom" className="w-28 accent-blue-600" />
          <ZoomIn size={14} className="text-slate-400" />
          <span className="w-10 text-xs font-bold text-slate-600">{Math.round(zoom * 100)}%</span>
        </div>
        {modo === "sobrepor" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Opacidade</span>
            <input type="range" min={0} max={100} value={opac} onChange={(e) => setOpac(Number(e.target.value))} aria-label="Opacidade da foto B" className="w-28 accent-blue-600" />
          </div>
        )}
        <button onClick={() => setGrade((g) => !g)} aria-pressed={grade} className={`${btnGhost} !px-3 !py-1.5 text-xs ${grade ? "!border-blue-300 !bg-blue-50 !text-blue-700" : ""}`}><Grid3x3 size={13} /> Grade de simetria</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setPos(50); }} className={`${btnGhost} !px-3 !py-1.5 text-xs`}><RotateCcw size={13} /> Reiniciar</button>
        <button onClick={() => void exportar()} disabled={!A || !B || exportando} className={`${btnBlue} ml-auto !px-3 !py-1.5 text-xs`}>{exportando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Exportar PNG</button>
      </div>

      {(!idA || !idB) ? (
        <div className={`${card} p-12 text-center text-sm text-slate-500`}>Escolha as duas fotos para começar.</div>
      ) : (
        <div className="relative mx-auto w-full max-w-[1000px]">
          {carregando && <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-white/60"><Loader2 className="animate-spin text-slate-500" /></div>}
          {modo === "lado" ? (
            <div className="grid grid-cols-2 gap-3" onPointerDown={down} onPointerMove={move} onPointerUp={() => (arrasto.current = null)} style={{ cursor: zoom > 1 ? "grab" : "default" }}>
              {([[A, fa, "ANTES"], [B, fb, "DEPOIS"]] as const).map(([f, meta, tit]) => (
                <div key={tit} className={moldura}>
                  {camada(f)}
                  {gradeEl}
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">{rotulo(meta)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div ref={caixa} className={`${moldura} mx-auto max-w-[560px]`} onPointerDown={down} onPointerMove={move} onPointerUp={() => (arrasto.current = null)} style={{ cursor: zoom > 1 ? "grab" : "default" }}>
              {camada(B)}
              {modo === "slider" ? (
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>{camada(A)}</div>
              ) : (
                <div className="absolute inset-0" style={{ opacity: opac / 100 }}>{camada(A)}</div>
              )}
              {gradeEl}
              <span className="absolute left-3 top-3 rounded-full bg-blue-600/90 px-3 py-1 text-[11px] font-bold text-white">{rotulo(fa)}</span>
              <span className="absolute right-3 top-3 rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-bold text-white">{rotulo(fb)}</span>
              {modo === "slider" && (
                <div data-divisor className="absolute inset-y-0 w-10 -translate-x-1/2 cursor-ew-resize" style={{ left: `${pos}%` }}>
                  <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow" />
                  <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-lg"><ArrowLeftRight size={15} /></div>
                </div>
              )}
            </div>
          )}
          {oculta && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <button onClick={() => setRevelar(true)} className={`${btnGhost} !bg-white`}><Eye size={15} /> Revelar imagens</button>
            </div>
          )}
        </div>
      )}

      {modo === "slider" && idA && idB && (
        <div className="mx-auto flex max-w-[560px] items-center gap-3">
          <span className="text-xs font-bold text-blue-600">Antes</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Posição do divisor" className="flex-1 accent-blue-600" />
          <span className="text-xs font-bold text-emerald-600">Depois</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOSSIÊ
   ═══════════════════════════════════════════════════════════════ */

function imprimirDossie(p: PacienteDetalhe, fotos: Foto[]) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  const blocos = p.procedimentos
    .map((g) => {
      const fs = fotos.filter((f) => keyProc(f.procedimento) === keyProc(g.nome)).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
      const anc = g.ancora.slice(0, 10);
      return `<h2>${escHtml(g.nome ?? "Sem procedimento informado")} <small>início ${fmtDate(anc)} · ${fs.length} foto(s)</small></h2>
      <div class="grid">${fs
        .map(
          (f) => `<figure>${f.thumb ? `<img src="${f.thumb}" alt="">` : ""}<figcaption><b>${escHtml(CAT[f.category].label)}</b> · ${rotuloDia(diasEntre(anc, f.takenAt))}<br>${fmtDate(f.takenAt)}${f.angle ? ` · ${escHtml(f.angle)}` : ""}${f.region ? ` · ${escHtml(f.region)}` : ""}</figcaption></figure>`,
        )
        .join("")}</div>`;
    })
    .join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Dossiê — ${escHtml(p.nome)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px;max-width:860px;margin:auto;font-size:13px}
    h1{font-size:24px;margin:0}.sub{color:#64748b;font-size:12px;margin:4px 0 18px;text-transform:uppercase;letter-spacing:.08em}
    h2{font-size:15px;margin:26px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}h2 small{color:#64748b;font-weight:500;font-size:12px;margin-left:8px}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.meta div{border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px}
    .meta small{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
    .alert{background:#fff1f2;border:1px solid #fecdd3;color:#be123c;border-radius:10px;padding:8px 12px;margin:10px 0;font-weight:600}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0;break-inside:avoid}
    img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#f1f5f9}figcaption{font-size:10.5px;color:#475569;margin-top:3px;line-height:1.35}
    footer{margin-top:30px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:8px}
  </style></head><body>
  <h1>Dossiê fotográfico — ${escHtml(p.nome)}</h1>
  <p class="sub">${escHtml(CLINICA_NOME)} · Prontuário ${escHtml(p.codigo)}</p>
  <div class="meta">
    <div><small>Fototipo</small>${escHtml(p.fototipo ?? "—")}</div>
    <div><small>Tendência de pele</small>${escHtml(p.tendenciaPele ?? "—")}</div>
    <div><small>Total de fotos</small>${p.total}</div>
    <div><small>Termo de uso de imagem</small>${p.termoImagem ? "Assinado" : "Pendente"}</div>
    <div><small>Profissional responsável</small>${escHtml(p.responsavel ?? "—")}</div>
    <div><small>Emitido em</small>${fmtDate(hojeISO())}</div>
  </div>
  ${p.alergias ? `<div class="alert">Alergias: ${escHtml(p.alergias)}</div>` : ""}
  ${blocos || "<p>Nenhuma foto registrada.</p>"}
  <footer>Documento confidencial · Dados sensíveis protegidos pela LGPD. Acessos a este dossiê são auditados.</footer>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

function Dossie({ p, fotos, onImprimir, onAbrirAba }: { p: PacienteDetalhe; fotos: Foto[]; onImprimir: () => void; onAbrirAba: (a: "Comparar" | "Galeria") => void }) {
  const total = p.total;
  const porCat = CATS.filter((c) => (p.porCategoria[c] ?? 0) > 0);
  return (
    <div className="space-y-5">
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={eyebrow}>Prontuário {p.codigo}</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">{p.nome}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
              {p.fototipo && <Badge>{p.fototipo}</Badge>}
              {p.tendenciaPele && <Badge>{p.tendenciaPele}</Badge>}
              {p.termoImagem ? <Badge tone="success"><ShieldCheck size={11} /> Termo de imagem assinado</Badge> : <Badge tone="warning"><ShieldAlert size={11} /> Termo de imagem pendente</Badge>}
            </div>
          </div>
          <button className={btnPrimary} onClick={onImprimir} disabled={total === 0}><Printer size={15} /> Imprimir dossiê</button>
        </div>
        {p.alergias && <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Alergias: {p.alergias}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-[10px] font-bold uppercase text-slate-400">Total de fotos</dt><dd className="text-lg font-extrabold text-slate-900">{total}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-[10px] font-bold uppercase text-slate-400">Procedimentos</dt><dd className="text-lg font-extrabold text-slate-900">{p.procedimentos.length}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-[10px] font-bold uppercase text-slate-400">Primeira foto</dt><dd className="text-sm font-extrabold text-slate-900">{fotos.length ? fmtDate(fotos[fotos.length - 1].takenAt) : "—"}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-[10px] font-bold uppercase text-slate-400">Responsável</dt><dd className="truncate text-sm font-extrabold text-slate-900">{p.responsavel ?? "—"}</dd></div>
        </dl>
        {porCat.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{porCat.map((c) => <span key={c} className="flex items-center gap-1.5 text-xs text-slate-600"><CatPill cat={c} /> {p.porCategoria[c]}</span>)}</div>}
      </section>

      <section className={`${card} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={eyebrow}>Histórico por procedimento</p>
          <button className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => onAbrirAba("Galeria")}>Ver galeria</button>
        </div>
        {p.procedimentos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum procedimento registrado nas fotos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {p.procedimentos.map((g) => {
              const fs = fotos.filter((f) => keyProc(f.procedimento) === keyProc(g.nome));
              return (
                <li key={keyProc(g.nome)} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{g.nome ?? "Sem procedimento informado"}</p>
                    <p className="text-xs text-slate-500">{fmtDate(g.ancora)} → {fmtDate(g.ultima)} · {g.total} foto(s)</p>
                  </div>
                  <div className="flex -space-x-2">
                    {fs.slice(0, 4).map((f) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      f.thumb ? <img key={f.id} src={f.thumb} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover blur-[0px]" /> : null
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-5`}>
        <div>
          <p className="text-sm font-bold text-slate-900">Comparativo de evolução</p>
          <p className="text-xs text-slate-500">Monte um antes e depois com divisor, sobreposição e grade de simetria.</p>
        </div>
        <button className={btnBlue} onClick={() => onAbrirAba("Comparar")}><ArrowLeftRight size={15} /> Abrir comparador</button>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ESPAÇO DE TRABALHO DO PACIENTE
   ═══════════════════════════════════════════════════════════════ */

const ABAS = ["Galeria", "Linha do tempo", "Comparar", "Dossiê"] as const;
type Aba = (typeof ABAS)[number];

function Workspace({ pacienteId, acomp, privacidade, versao, onVoltar, onMudou, toast }: { pacienteId: string; acomp: Acomp | null; privacidade: boolean; versao: number; onVoltar: () => void; onMudou: () => void; toast: ToastFn }) {
  const [detalhe, setDetalhe] = useState<PacienteDetalhe | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("Galeria");
  const [upload, setUpload] = useState<UploadInicial | null>(null);
  const [lightbox, setLightbox] = useState<{ lista: Foto[]; idx: number } | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [procRef, setProcRef] = useState("");
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const dragCount = useRef(0);

  const carregar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setLoading(true);
      setErro(null);
      try {
        const [d, f] = await Promise.all([
          api<PacienteDetalhe>(`${BASE}/pacientes/${pacienteId}`),
          api<{ data: Foto[] }>(`${BASE}?patientId=${pacienteId}`),
        ]);
        setDetalhe(d);
        setFotos(f.data ?? []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar o paciente");
      } finally {
        setLoading(false);
      }
    },
    [pacienteId],
  );

  useEffect(() => {
    setDetalhe(null);
    setFotos([]);
    setSel(new Set());
    setAba("Galeria");
    setProcRef("");
    setIdA("");
    setIdB("");
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (versao > 0) void carregar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const grupos = detalhe?.procedimentos ?? [];
  const refPadrao = acomp ? keyProc(acomp.procedimento) : grupos[0] ? keyProc(grupos[0].nome) : "";
  const refAtual = procRef && grupos.some((g) => keyProc(g.nome) === procRef) ? procRef : grupos.some((g) => keyProc(g.nome) === refPadrao) ? refPadrao : grupos[0] ? keyProc(grupos[0].nome) : "";
  const grupoRef = grupos.find((g) => keyProc(g.nome) === refAtual) ?? null;
  const ancora = grupoRef ? grupoRef.ancora.slice(0, 10) : null;
  const nomesProc = grupos.map((g) => g.nome).filter((x): x is string => !!x);

  // Sugere automaticamente o par antes/depois ao abrir o comparador
  useEffect(() => {
    if (aba !== "Comparar" || idA || idB || fotos.length < 2) return;
    const asc = [...fotos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const antes = asc.find((f) => f.category === "ANTES") ?? asc[0];
    const depois = [...asc].reverse().find((f) => f.id !== antes.id && (f.angle === antes.angle || !antes.angle)) ?? asc[asc.length - 1];
    if (antes && depois && antes.id !== depois.id) {
      setIdA(antes.id);
      setIdB(depois.id);
    }
  }, [aba, fotos, idA, idB]);

  const atualizarFoto = async (id: string, patch: Record<string, unknown>) => {
    try {
      const salva = await api<Foto>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setFotos((l) => l.map((f) => (f.id === id ? { ...f, ...salva } : f)));
      setLightbox((lb) => (lb ? { ...lb, lista: lb.lista.map((f) => (f.id === id ? { ...f, ...salva } : f)) } : lb));
      if ("procedimento" in patch || "takenAt" in patch || "categoria" in patch) onMudou();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível atualizar a foto", "err");
      throw e;
    }
  };

  const excluirFotos = async (ids: string[]) => {
    try {
      await api(`${BASE}/excluir-lote`, { method: "POST", body: JSON.stringify({ ids }) });
      ids.forEach((i) => cacheFull.delete(i));
      setFotos((l) => l.filter((f) => !ids.includes(f.id)));
      setLightbox((lb) => (lb ? { ...lb, lista: lb.lista.filter((f) => !ids.includes(f.id)) } : lb));
      setSel(new Set());
      onMudou();
      toast(ids.length === 1 ? "Foto excluída" : `${ids.length} fotos excluídas`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível excluir", "err");
    }
  };

  const bulkCategoria = async (cat: Cat) => {
    const ids = [...sel];
    try {
      await api(`${BASE}/lote`, { method: "PATCH", body: JSON.stringify({ ids, categoria: cat }) });
      setFotos((l) => l.map((f) => (ids.includes(f.id) ? { ...f, category: cat } : f)));
      toast(`${ids.length} foto(s) movida(s) para “${CAT[cat].label}”`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível atualizar", "err");
    }
  };

  const bulkBaixar = async () => {
    const ids = [...sel].slice(0, 12);
    toast(`Preparando ${ids.length} foto(s)…`);
    for (const id of ids) {
      try {
        const f = await carregarFull(id);
        baixarUrl(f.url, `${slug(detalhe?.nome ?? "paciente")}_${f.category.toLowerCase()}_${f.takenAt.slice(0, 10)}.jpg`);
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        toast("Não foi possível baixar uma das fotos", "err");
      }
    }
  };

  const temArquivos = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");

  if (loading && !detalhe)
    return <div className="grid flex-1 place-items-center p-10"><Loader2 className="animate-spin text-slate-300" /></div>;
  if (erro || !detalhe)
    return (
      <div className="grid flex-1 place-items-center p-10 text-center">
        <div>
          <p className="text-sm text-rose-600">{erro ?? "Paciente não encontrado"}</p>
          <button className={`${btnGhost} mt-3`} onClick={() => void carregar()}>Tentar de novo</button>
        </div>
      </div>
    );

  const fase = acomp ? faseDia(acomp.dias) : null;

  return (
    <div
      className="relative min-w-0 flex-1 overflow-y-auto"
      onDragEnter={(e) => { if (temArquivos(e)) { dragCount.current++; setArrastando(true); } }}
      onDragLeave={() => { dragCount.current = Math.max(0, dragCount.current - 1); if (dragCount.current === 0) setArrastando(false); }}
      onDragOver={(e) => temArquivos(e) && e.preventDefault()}
      onDrop={(e) => {
        if (!temArquivos(e)) return;
        e.preventDefault();
        dragCount.current = 0;
        setArrastando(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (files.length) setUpload({ files });
      }}
    >
      {arrastando && (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-3xl border-2 border-dashed border-blue-500 bg-blue-50/90">
          <div className="text-center text-blue-700"><UploadCloud size={36} className="mx-auto" /><p className="mt-2 text-sm font-extrabold">Solte as fotos para enviar a {detalhe.nome.split(" ")[0]}</p></div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-8">
        <button className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 lg:hidden" onClick={onVoltar}><ArrowLeft size={14} /> Pacientes</button>

        {/* Cabeçalho do paciente */}
        <header className={`${card} mb-5 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar nome={detalhe.nome} foto={detalhe.avatar ?? fotos[0]?.thumb} size={60} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900">{detalhe.nome}</h2>
                  {detalhe.tags.slice(0, 2).map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Prontuário {detalhe.codigo}{detalhe.responsavel ? ` · ${detalhe.responsavel}` : ""}{detalhe.fototipo ? ` · ${detalhe.fototipo}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fase && <Badge tone="info"><Activity size={11} /> {fase}{acomp?.procedimento ? ` · ${acomp.procedimento}` : ""}</Badge>}
                  {detalhe.termoImagem ? <Badge tone="success"><ShieldCheck size={11} /> Termo de imagem assinado</Badge> : <Link href="/termos"><Badge tone="warning"><ShieldAlert size={11} /> Termo de imagem pendente</Badge></Link>}
                  <Badge>{detalhe.total} foto{detalhe.total === 1 ? "" : "s"}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={() => setUpload({})}><Plus size={16} /> Enviar fotos</button>
            </div>
          </div>
          {detalhe.alergias && <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> Alergias: {detalhe.alergias}</p>}
        </header>

        <nav className={`${card} mb-5 flex gap-1 overflow-x-auto p-1.5`} role="tablist" aria-label="Seções do paciente">
          {ABAS.map((a) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${aba === a ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              {a}{a === "Galeria" && <span className={`ml-2 rounded-full px-1.5 text-[10px] font-bold ${aba === a ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{fotos.length}</span>}
            </button>
          ))}
        </nav>

        {aba === "Galeria" && (
          <Galeria
            fotos={fotos}
            ancora={ancora}
            procedimentos={grupos}
            privacidade={privacidade}
            sel={sel}
            setSel={setSel}
            onAbrir={(lista, idx) => setLightbox({ lista, idx })}
            onFavoritar={(f) => void atualizarFoto(f.id, { favorita: !f.favorite })}
            onUpload={() => setUpload({})}
            onBulkCategoria={(c) => void bulkCategoria(c)}
            onBulkExcluir={() => setConfirm({ message: `Excluir ${sel.size} foto(s) definitivamente? Essa ação não pode ser desfeita.`, confirmLabel: "Excluir", danger: true, onConfirm: () => excluirFotos([...sel]) })}
            onBulkBaixar={() => void bulkBaixar()}
            onComparar={(a, b) => { setIdA(a); setIdB(b); setAba("Comparar"); }}
          />
        )}
        {aba === "Linha do tempo" && (
          <Timeline fotos={fotos} grupo={grupoRef} grupos={grupos} procRef={refAtual} setProcRef={setProcRef} privacidade={privacidade} onAbrir={(lista, idx) => setLightbox({ lista, idx })} onUploadMarco={(d) => setUpload({ data: d, categoria: "EVOLUCAO", procedimento: grupoRef?.nome ?? "" })} />
        )}
        {aba === "Comparar" && (
          <Comparador fotos={fotos} ancora={ancora} idA={idA} idB={idB} setIdA={setIdA} setIdB={setIdB} privacidade={privacidade} toast={toast} />
        )}
        {aba === "Dossiê" && (
          <Dossie p={detalhe} fotos={fotos} onImprimir={() => imprimirDossie(detalhe, fotos)} onAbrirAba={(a) => setAba(a)} />
        )}
      </div>

      {lightbox && (
        <Lightbox
          fotos={lightbox.lista}
          inicio={lightbox.idx}
          ancora={ancora}
          paciente={detalhe.nome}
          privacidade={privacidade}
          procedimentos={nomesProc}
          onClose={() => setLightbox(null)}
          onUpdate={atualizarFoto}
          onDelete={(id) => excluirFotos([id])}
          onComparar={(slot, id) => { if (slot === "A") setIdA(id); else setIdB(id); setAba("Comparar"); }}
        />
      )}
      {upload && (
        <UploadModal
          paciente={detalhe}
          procedimentos={nomesProc}
          inicial={{ ...upload, procedimento: upload.procedimento ?? (acomp?.procedimento ?? "") }}
          onClose={() => setUpload(null)}
          onDone={(n) => { toast(`${n} foto(s) enviada(s)`); void carregar(true); onMudou(); }}
        />
      )}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LISTA DE PACIENTES + VISÃO GERAL
   ═══════════════════════════════════════════════════════════════ */

const FILTROS: { v: Filtro; label: string }[] = [
  { v: "ativos", label: "Em acompanhamento" },
  { v: "com-fotos", label: "Com fotos" },
  { v: "sem-fotos", label: "Sem fotos" },
  { v: "todos", label: "Todos" },
];

function PacienteLista({ lista, loading, erro, filtro, setFiltro, selecionado, busca, onSelecionar, onRetry, privacidade }: { lista: PacienteItem[]; loading: boolean; erro: string | null; filtro: Filtro; setFiltro: (f: Filtro) => void; selecionado: string | null; busca: string; onSelecionar: (id: string) => void; onRetry: () => void; privacidade: boolean }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-[320px]" aria-label="Pacientes">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">Pacientes</h2>
        <p className="mt-0.5 text-xs text-slate-500">Acompanhamento fotográfico e dossiê</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtro de pacientes">
          {FILTROS.map((f) => (
            <button key={f.v} onClick={() => setFiltro(f.v)} aria-pressed={filtro === f.v} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${filtro === f.v ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-slate-100" />)}
        {!loading && erro && (
          <div className="p-6 text-center">
            <p className="text-xs text-rose-600">{erro}</p>
            <button className={`${btnGhost} mt-3 !py-1.5 text-xs`} onClick={onRetry}>Tentar de novo</button>
          </div>
        )}
        {!loading && !erro && lista.length === 0 && (
          <div className="px-4 py-10 text-center">
            <Users size={26} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">{busca ? "Nenhum paciente encontrado" : filtro === "ativos" ? "Nenhuma evolução ativa" : "Nenhum paciente aqui"}</p>
            <p className="mt-1 text-xs text-slate-500">{filtro === "ativos" && !busca ? "Pacientes aparecem aqui por 45 dias após o início de um procedimento fotografado." : "Ajuste a busca ou o filtro."}</p>
            {filtro !== "todos" && <button className={`${btnGhost} mt-3 !py-1.5 text-xs`} onClick={() => setFiltro("todos")}>Ver todos</button>}
          </div>
        )}
        {!loading && !erro && lista.map((p) => {
          const ativo = selecionado === p.id;
          return (
            <button key={p.id} onClick={() => onSelecionar(p.id)} aria-current={ativo ? "true" : undefined} className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${ativo ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              {ativo && <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r bg-blue-600" aria-hidden />}
              <span className={`shrink-0 ${privacidade ? "[&_img]:blur-md" : ""}`}><Avatar nome={p.nome} foto={p.ultimaThumb} size={44} /></span>
              <span className="min-w-0 flex-1">
                {p.acompanhamento && <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">{faseDia(p.acompanhamento.dias)}</span>}
                <span className="block truncate text-sm font-extrabold text-slate-900">{p.nome}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {p.acompanhamento?.procedimento ?? (p.totalFotos ? `${p.totalFotos} foto${p.totalFotos === 1 ? "" : "s"} · última ${fmtDate(p.ultimaFotoEm)}` : "Sem fotos")}
                </span>
              </span>
              {p.acompanhamento && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Em acompanhamento" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function VisaoGeral({ resumo, loading, onSelecionar, privacidade }: { resumo: Resumo | null; loading: boolean; onSelecionar: (id: string) => void; privacidade: boolean }) {
  if (loading && !resumo) return <div className="grid flex-1 place-items-center"><Loader2 className="animate-spin text-slate-300" /></div>;
  const r = resumo;
  const cards = [
    { l: "Fotos no sistema", v: String(r?.totalFotos ?? 0), h: `${r?.mes ?? 0} neste mês` },
    { l: "Pacientes com fotos", v: String(r?.pacientesComFotos ?? 0), h: "Com ao menos uma foto" },
    { l: "Em acompanhamento", v: String(r?.emAcompanhamento ?? 0), h: "Procedimento nos últimos 45 dias" },
    { l: "Sem termo de imagem", v: String(r?.semTermo ?? 0), h: "Pacientes com fotos e termo pendente", alerta: (r?.semTermo ?? 0) > 0 },
  ];
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Fotos Clínicas & Dossiê</h1>
        <p className="mt-1 text-sm text-slate-500">Selecione um paciente à esquerda para abrir a galeria, a linha do tempo e o comparador.</p>

        <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-5" aria-label="Indicadores">
          {cards.map((c) => (
            <div key={c.l} className={`rounded-2xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${c.alerta ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <p className={eyebrow}>{c.l}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{c.v}</p>
              <p className="mt-1 text-[11px] text-slate-500">{c.h}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border border-slate-900 bg-slate-900 p-4 text-white xl:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Armazenamento</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{(r?.armazenamentoMb ?? 0).toLocaleString("pt-BR")} MB</p>
            <p className="mt-1 text-[11px] text-slate-400">Imagens reduzidas no envio</p>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-label="Evoluções ativas">
            <h2 className={`${eyebrow} mb-3`}>Evoluções ativas</h2>
            {(r?.acompanhamentos.length ?? 0) === 0 ? (
              <div className={`${card} p-8 text-center text-sm text-slate-500`}>Nenhum paciente em acompanhamento agora.</div>
            ) : (
              <ul className="space-y-2.5">
                {r!.acompanhamentos.map((p) => {
                  const prox = p.acompanhamento ? proximoMarco(p.acompanhamento.dias) : null;
                  return (
                    <li key={p.id}>
                      <button onClick={() => onSelecionar(p.id)} className={`${card} flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50`}>
                        <span className={privacidade ? "[&_img]:blur-md" : ""}><Avatar nome={p.nome} foto={p.ultimaThumb} size={42} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">{p.acompanhamento ? faseDia(p.acompanhamento.dias) : ""}</span>
                          <span className="block truncate text-sm font-extrabold text-slate-900">{p.nome}</span>
                          <span className="block truncate text-[11px] text-slate-500">{p.acompanhamento?.procedimento ?? "Sem procedimento informado"}</span>
                        </span>
                        {prox && <Badge tone={prox.em === 0 ? "warning" : "neutral"}>{prox.em === 0 ? `Hoje: ${prox.label}` : `${rotuloDia(prox.d)} em ${prox.em}d`}</Badge>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Pendências de consentimento">
            <h2 className={`${eyebrow} mb-3`}>Termo de uso de imagem pendente</h2>
            {(r?.pendenciasTermo.length ?? 0) === 0 ? (
              <div className={`${card} flex items-center gap-3 p-6 text-sm text-slate-600`}><ShieldCheck className="text-emerald-600" size={20} /> Todos os pacientes com fotos têm o termo assinado.</div>
            ) : (
              <ul className="space-y-2.5">
                {r!.pendenciasTermo.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => onSelecionar(p.id)} className={`${card} flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50`}>
                      <Avatar nome={p.nome} size={38} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{p.nome}</span><span className="text-[11px] text-slate-500">{p.total} foto(s) sem termo</span></span>
                      <Badge tone="warning"><ShieldAlert size={11} /> Pendente</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Colete o termo em Termos & Documentos antes de usar imagens em comparativos ou divulgação.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTEÚDO DA PÁGINA
   ═══════════════════════════════════════════════════════════════ */

function FotosContent({ busca, privacidade }: { busca: string; privacidade: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [lista, setLista] = useState<PacienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const dBusca = useDebounced(busca, 300);
  const reqId = useRef(0);

  const toast = useCallback<ToastFn>((text, tone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // Paciente na URL (?paciente=...) — permite abrir direto de outras telas
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("paciente");
    if (p) setSelecionado(p);
  }, []);

  const selecionar = useCallback((id: string | null) => {
    setSelecionado(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("paciente", id);
    else url.searchParams.delete("paciente");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const carregarLista = useCallback(
    async (silencioso = false) => {
      const my = ++reqId.current;
      if (!silencioso) setLoading(true);
      setErro(null);
      try {
        const p = new URLSearchParams({ filtro });
        if (dBusca.trim()) p.set("search", dBusca.trim());
        const r = await api<{ data: PacienteItem[] }>(`${BASE}/pacientes?${p}`);
        if (my === reqId.current) setLista(r.data ?? []);
      } catch (e) {
        if (my === reqId.current) setErro(e instanceof Error ? e.message : "Falha ao carregar pacientes");
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [filtro, dBusca],
  );

  const carregarResumo = useCallback(async () => {
    try {
      setResumo(await api<Resumo>(`${BASE}/resumo`));
    } catch {
      /* indicadores são complementares */
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);
  useEffect(() => {
    void carregarResumo();
  }, [carregarResumo]);

  const mudou = useCallback(() => {
    setVersao((v) => v + 1);
    void carregarLista(true);
    void carregarResumo();
  }, [carregarLista, carregarResumo]);

  const acomp = useMemo(() => {
    const doLista = lista.find((p) => p.id === selecionado)?.acompanhamento;
    return doLista ?? resumo?.acompanhamentos.find((p) => p.id === selecionado)?.acompanhamento ?? null;
  }, [lista, resumo, selecionado]);

  return (
    <div className="flex h-full min-h-0">
      <div className={`${selecionado ? "hidden lg:flex" : "flex"} min-h-0 w-full lg:w-auto`}>
        <PacienteLista lista={lista} loading={loading} erro={erro} filtro={filtro} setFiltro={setFiltro} selecionado={selecionado} busca={dBusca} onSelecionar={selecionar} onRetry={() => void carregarLista()} privacidade={privacidade} />
      </div>
      <div className={`${selecionado ? "flex" : "hidden lg:flex"} min-w-0 flex-1 bg-slate-50`}>
        {selecionado ? (
          <Workspace key={selecionado} pacienteId={selecionado} acomp={acomp} privacidade={privacidade} versao={versao} onVoltar={() => selecionar(null)} onMudou={mudou} toast={toast} />
        ) : (
          <VisaoGeral resumo={resumo} loading={!resumo} onSelecionar={selecionar} privacidade={privacidade} />
        )}
      </div>
      <Toasts list={toasts} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHELL DO SISTEMA (sidebar + topbar)
   Se o seu layout.tsx já renderiza isso, remova AppShell e exporte só <FotosContent />
   ═══════════════════════════════════════════════════════════════ */

function AppShell({ children, busca, onBusca, privacidade, onPrivacidade }: { children: React.ReactNode; busca: string; onBusca: (v: string) => void; privacidade: boolean; onPrivacidade: () => void }) {
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
            <span className="font-bold text-slate-900">Fotos Clínicas & Dossiê</span>
          </nav>
          <div className="relative hidden w-full max-w-[300px] md:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscaRef}
              value={busca}
              onChange={(e) => onBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-[13px] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Buscar paciente…"
              aria-label="Buscar paciente"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400">/</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onPrivacidade}
              aria-pressed={privacidade}
              title={privacidade ? "Modo privacidade ligado: imagens desfocadas" : "Ativar modo privacidade (desfoca as imagens)"}
              className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition ${privacidade ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {privacidade ? <EyeOff size={15} /> : <Eye size={15} />}
              <span className="hidden sm:inline">Privacidade</span>
            </button>
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

export default function FotosPage() {
  const [busca, setBusca] = useState("");
  const [privacidade, setPrivacidade] = useState(false);

  // Lembra a preferência de privacidade neste dispositivo
  useEffect(() => {
    try {
      setPrivacidade(localStorage.getItem("fotos:privacidade") === "1");
    } catch {}
  }, []);
  const alternarPrivacidade = () =>
    setPrivacidade((v) => {
      try {
        localStorage.setItem("fotos:privacidade", v ? "0" : "1");
      } catch {}
      return !v;
    });

  return (
    <AppShell busca={busca} onBusca={setBusca} privacidade={privacidade} onPrivacidade={alternarPrivacidade}>
      <FotosContent busca={busca} privacidade={privacidade} />
    </AppShell>
  );
}