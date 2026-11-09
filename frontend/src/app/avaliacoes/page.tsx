"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  FileSignature,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Star,
  Stethoscope,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AppShell, useSessao } from "../../components/AppShell"; // Ajuste o caminho conforme necessário

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CLINICA_NOME = "Ellevare Estética Avançada";
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/"
).replace(/\/+$/, "");

const BASE = "/avaliacoes";

/** Rota do prontuário do paciente. Ajuste para a sua. */
const PRONTUARIO_HREF = (patientId: string) => `/prontuarios?patientId=${patientId}`;

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  // Usa a mesma chave de autenticação do login do HealthSystem.
  const token =
    localStorage.getItem("@ClinicOS:token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken");

  if (token) return token;

  // Compatibilidade com o login que também salva o token em cookie.
  const match = document.cookie.match(
    /(?:^|;\s*)token=([^;]+)/
  );

  return match ? decodeURIComponent(match[1]) : null;
}

/* ═══════════════════════════════════════════════════════════════
   TIPOS E CONSTANTES
   ═══════════════════════════════════════════════════════════════ */

type Tipo = "FACIAL" | "CORPORAL" | "CAPILAR" | "GERAL";
type Status = "RASCUNHO" | "CONCLUIDA" | "ARQUIVADA";
type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  fototipo?: string | null;
  tendenciaPele?: string | null;
  alergias?: string | null;
};

type Avaliacao = {
  id: string;
  clienteId: string;
  cliente?: Cliente;
  profissionalNome?: string | null;
  tipo: Tipo;
  status: Status;
  dataAvaliacao: string;
  queixaPrincipal?: string | null;
  expectativas?: string | null;
  tipoPele?: string | null;
  glogau?: number | null;
  condicoes: string[];
  hidratacao?: number | null;
  oleosidade?: number | null;
  elasticidade?: number | null;
  pesoKg?: number | null;
  alturaCm?: number | null;
  celulite?: number | null;
  medidas?: Record<string, number> | null;
  procedimentosSugeridos: string[];
  sessoesPrevistas?: number | null;
  intervaloDias?: number | null;
  valorEstimado?: number | null;
  observacoes?: string | null;
  dataReavaliacao?: string | null;
  termoAssinado?: boolean;
};

type Resumo = {
  total: number;
  mes: number;
  rascunhos: number;
  concluidas: number;
  arquivadas: number;
  reavaliacoesVencidas: number;
  reavaliacoesProximas: number;
  valorPlanos: number;
};

type Procedimento = {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  returnDays?: number | null;
};

type ItemPlano = { nome: string; sessoes: number; preco: number; procedureId?: string };

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "FACIAL", label: "Facial" },
  { value: "CORPORAL", label: "Corporal" },
  { value: "CAPILAR", label: "Capilar" },
  { value: "GERAL", label: "Geral (facial + corporal)" },
];

const STATUS_META: Record<Status, { label: string; tone: Tone }> = {
  RASCUNHO: { label: "Rascunho", tone: "warning" },
  CONCLUIDA: { label: "Concluída", tone: "success" },
  ARQUIVADA: { label: "Arquivada", tone: "neutral" },
};

const TIPOS_PELE = ["Normal", "Seca", "Oleosa", "Mista", "Sensível"];

const FACIAIS = [
  "Acne", "Manchas", "Melasma", "Rugas finas", "Rugas profundas", "Flacidez facial", "Poros dilatados",
  "Olheiras", "Cicatrizes de acne", "Rosácea", "Ressecamento", "Sensibilidade", "Perda de volume",
];
const CORPORAIS = [
  "Celulite", "Gordura localizada", "Flacidez corporal", "Estrias", "Retenção de líquidos",
  "Cicatrizes", "Manchas corporais", "Varizes / vasinhos",
];
const CAPILARES = ["Queda de cabelo", "Oleosidade do couro cabeludo", "Caspa", "Fragilidade dos fios", "Alopecia", "Rarefação"];

const CONDICOES: Record<Tipo, string[]> = {
  FACIAL: FACIAIS,
  CORPORAL: CORPORAIS,
  CAPILAR: CAPILARES,
  GERAL: [...FACIAIS.slice(0, 8), ...CORPORAIS.slice(0, 5)],
};

const MEDIDAS_CAMPOS = [
  { key: "cintura", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "quadril", label: "Quadril" },
  { key: "coxa", label: "Coxa" },
  { key: "braco", label: "Braço" },
  { key: "panturrilha", label: "Panturrilha" },
];

const GLOGAU = ["I — Sem rugas (20–30 anos)", "II — Rugas em movimento (30–40)", "III — Rugas em repouso (40–50)", "IV — Só rugas (60+)"];

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
};

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const hojeISO = () => new Date().toISOString().slice(0, 10);

function addDias(iso: string, dias: number) {
  const base = iso ? new Date(`${iso}T12:00:00`) : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const t = new Date(y, m - 1, d).getTime();
  const n = new Date();
  return Math.round((t - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
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

const imc = (peso?: number | null, alturaCm?: number | null) => {
  if (!peso || !alturaCm) return null;
  const v = peso / Math.pow(alturaCm / 100, 2);
  const faixa = v < 18.5 ? "Abaixo do peso" : v < 25 ? "Peso normal" : v < 30 ? "Sobrepeso" : "Obesidade";
  return { valor: v, faixa };
};

function reavaliacaoStatus(a: Avaliacao): { label: string; tone: Tone } | null {
  if (a.status !== "CONCLUIDA" || !a.dataReavaliacao) return null;
  const d = daysUntil(a.dataReavaliacao);
  if (d === null) return null;
  if (d < 0) return { label: `Vencida há ${Math.abs(d)}d`, tone: "danger" };
  if (d === 0) return { label: "Hoje", tone: "warning" };
  if (d <= 30) return { label: `Em ${d}d`, tone: "warning" };
  return { label: "Agendada", tone: "success" };
}

/* Plano: itens são gravados como "Nome ×sessões" em procedimentosSugeridos */
const serializarItem = (i: ItemPlano) => `${i.nome} ×${i.sessoes}`;

function parseItem(txt: string, catalogo: Procedimento[]): ItemPlano {
  const m = txt.match(/^(.*?)\s*×\s*(\d+)$/);
  const nome = (m ? m[1] : txt).trim();
  const sessoes = m ? Math.max(1, Number(m[2])) : 1;
  const proc = catalogo.find((p) => p.name.toLowerCase() === nome.toLowerCase());
  return { nome, sessoes, preco: proc ? Number(proc.price) : 0, procedureId: proc?.id };
}

const totalPlano = (itens: ItemPlano[]) => itens.reduce((s, i) => s + i.preco * i.sessoes, 0);

async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function useDebounced<T>(value: T, ms = 300) {
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

function whatsappLink(a: Avaliacao) {
  const digits = (a.cliente?.telefone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const numero = digits.length <= 11 ? `55${digits}` : digits;
  const primeiro = (a.cliente?.nome ?? "").split(" ")[0];
  const texto = `Olá, ${primeiro}! Aqui é da ${CLINICA_NOME}. Está chegando o momento da sua reavaliação (${fmtDate(a.dataReavaliacao)}). Podemos agendar um horário?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function imprimir(a: Avaliacao, catalogo: Procedimento[]) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  const linha = (k: string, v: unknown) => (v ? `<tr><th>${escHtml(k)}</th><td>${escHtml(v)}</td></tr>` : "");
  const medidas = a.medidas ? Object.entries(a.medidas).map(([k, v]) => `${k}: ${v} cm`).join(" · ") : "";
  const im = imc(a.pesoKg, a.alturaCm);
  const itens = a.procedimentosSugeridos.map((t) => parseItem(t, catalogo));
  const plano = itens.map((i) => `${i.nome} — ${i.sessoes} sessão(ões)${i.preco ? ` · ${brl(i.preco * i.sessoes)}` : ""}`).join("<br>");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Avaliação — ${escHtml(a.cliente?.nome)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px;max-width:760px;margin:auto}
    h1{font-size:22px;margin:0}.sub{color:#64748b;font-size:12px;margin:4px 0 20px;text-transform:uppercase;letter-spacing:.08em}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;margin:22px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;width:34%;color:#64748b;font-weight:600;padding:5px 0;vertical-align:top}td{padding:5px 0}
    .sign{margin-top:60px;display:flex;gap:40px}.sign div{flex:1;border-top:1px solid #0f172a;padding-top:6px;font-size:12px;text-align:center}
  </style></head><body>
  <h1>Avaliação estética — ${escHtml(a.cliente?.nome)}</h1>
  <p class="sub">${escHtml(CLINICA_NOME)} · ${escHtml(TIPOS.find((t) => t.value === a.tipo)?.label)} · ${fmtDate(a.dataAvaliacao)}</p>
  <h2>Contexto</h2><table>${linha("Profissional", a.profissionalNome)}${linha("Alergias (prontuário)", a.cliente?.alergias)}${linha("Fototipo (prontuário)", a.cliente?.fototipo)}${linha("Queixa principal", a.queixaPrincipal)}${linha("Expectativas", a.expectativas)}</table>
  <h2>Análise</h2><table>${linha("Tipo de pele", a.tipoPele)}${linha("Condições", a.condicoes.join(", "))}${linha("Hidratação / oleosidade / elasticidade", [a.hidratacao, a.oleosidade, a.elasticidade].every((x) => x == null) ? "" : `${a.hidratacao ?? "–"} / ${a.oleosidade ?? "–"} / ${a.elasticidade ?? "–"} (0–10)`)}${linha("Peso / altura", a.pesoKg && a.alturaCm ? `${a.pesoKg} kg · ${a.alturaCm} cm` : "")}${linha("IMC", im ? `${im.valor.toFixed(1)} (${im.faixa})` : "")}${linha("Medidas", medidas)}</table>
  <h2>Plano sugerido</h2><table><tr><th>Procedimentos</th><td>${plano}</td></tr>${linha("Intervalo", a.intervaloDias ? `${a.intervaloDias} dias` : "")}${linha("Valor estimado", a.valorEstimado ? brl(a.valorEstimado) : "")}${linha("Reavaliação", a.dataReavaliacao ? fmtDate(a.dataReavaliacao) : "")}${linha("Observações", a.observacoes)}</table>
  <div class="sign"><div>${escHtml(a.cliente?.nome)}<br>Cliente</div><div>${escHtml(a.profissionalNome ?? "")}<br>Profissional responsável</div></div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
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
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass[tone]}`}>
      {children}
    </span>
  );
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

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
        danger ? "hover:text-rose-600" : "hover:text-blue-600"
      }`}
    >
      {children}
    </button>
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
      <div className={`${card} flex max-h-[92vh] w-full flex-col overflow-hidden ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {children}
        </div>
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
    <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${t.tone === "ok" ? "bg-slate-900" : "bg-rose-600"}`}>
          {t.tone === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Avatar({ nome, size = 36, foto }: { nome: string; size?: number; foto?: string }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-700"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}

/** Dados do prontuário, somente leitura (a edição acontece lá, não aqui). */
function ContextoProntuario({ c }: { c: Cliente }) {
  const temAlgo = c.fototipo || c.tendenciaPele || c.alergias;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className={`${eyebrow} !text-blue-700`}>Do prontuário</p>
        <Link href={PRONTUARIO_HREF(c.id)} target="_blank" className="flex items-center gap-1 font-semibold text-blue-700 hover:underline">
          Abrir prontuário <ExternalLink size={12} />
        </Link>
      </div>
      {c.alergias && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 font-semibold text-rose-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Alergias: {c.alergias}
        </p>
      )}
      {(c.fototipo || c.tendenciaPele) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.fototipo && <Badge tone="info">{c.fototipo}</Badge>}
          {c.tendenciaPele && <Badge>{c.tendenciaPele}</Badge>}
        </div>
      )}
      {!temAlgo && <p className="mt-2 text-slate-500">Sem dados no prontuário. Preencha a anamnese lá para alimentar estes alertas.</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORMULÁRIO (3 etapas: Paciente e queixa · Análise · Plano)
   ═══════════════════════════════════════════════════════════════ */

type FormState = {
  cliente: Cliente | null;
  tipo: Tipo;
  dataAvaliacao: string;
  profissionalNome: string;
  queixaPrincipal: string;
  expectativas: string;
  tipoPele: string;
  glogau: string;
  condicoes: string[];
  hidratacao: number | null;
  oleosidade: number | null;
  elasticidade: number | null;
  pesoKg: string;
  alturaCm: string;
  celulite: string;
  medidas: Record<string, string>;
  itens: ItemPlano[];
  intervaloDias: string;
  valorFinal: string;
  valorManual: boolean;
  observacoes: string;
  dataReavaliacao: string;
};

const s = (v: unknown) => (v == null ? "" : String(v));

function toForm(a: Avaliacao | undefined, catalogo: Procedimento[], proNome: string): FormState {
  return {
    cliente: a?.cliente ?? null,
    tipo: a?.tipo ?? "FACIAL",
    dataAvaliacao: a ? toDateInput(a.dataAvaliacao) : hojeISO(),
    profissionalNome: a?.profissionalNome ?? proNome,
    queixaPrincipal: s(a?.queixaPrincipal),
    expectativas: s(a?.expectativas),
    tipoPele: s(a?.tipoPele),
    glogau: s(a?.glogau),
    condicoes: a?.condicoes ?? [],
    hidratacao: a?.hidratacao ?? null,
    oleosidade: a?.oleosidade ?? null,
    elasticidade: a?.elasticidade ?? null,
    pesoKg: s(a?.pesoKg),
    alturaCm: s(a?.alturaCm),
    celulite: s(a?.celulite),
    medidas: Object.fromEntries(Object.entries(a?.medidas ?? {}).map(([k, v]) => [k, String(v)])),
    itens: (a?.procedimentosSugeridos ?? []).map((t) => parseItem(t, catalogo)),
    intervaloDias: s(a?.intervaloDias),
    valorFinal: s(a?.valorEstimado),
    valorManual: a?.valorEstimado != null,
    observacoes: s(a?.observacoes),
    dataReavaliacao: toDateInput(a?.dataReavaliacao),
  };
}

function toPayload(f: FormState, status: Status) {
  const str = (v: string) => v.trim() || null;
  const nm = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const med: Record<string, number> = {};
  Object.entries(f.medidas).forEach(([k, v]) => {
    const n = nm(v);
    if (n !== null && Number.isFinite(n)) med[k] = n;
  });
  const calculado = totalPlano(f.itens);
  const valor = f.valorManual ? nm(f.valorFinal) : calculado > 0 ? calculado : null;
  return {
    clienteId: f.cliente?.id ?? "",
    tipo: f.tipo,
    status,
    dataAvaliacao: f.dataAvaliacao,
    profissionalNome: str(f.profissionalNome),
    queixaPrincipal: str(f.queixaPrincipal),
    expectativas: str(f.expectativas),
    tipoPele: str(f.tipoPele),
    glogau: nm(f.glogau),
    condicoes: f.condicoes,
    hidratacao: f.hidratacao,
    oleosidade: f.oleosidade,
    elasticidade: f.elasticidade,
    pesoKg: nm(f.pesoKg),
    alturaCm: nm(f.alturaCm),
    celulite: nm(f.celulite),
    medidas: Object.keys(med).length ? med : null,
    procedimentosSugeridos: f.itens.map(serializarItem),
    sessoesPrevistas: f.itens.length ? Math.max(...f.itens.map((i) => i.sessoes)) : null,
    intervaloDias: nm(f.intervaloDias),
    valorEstimado: valor,
    observacoes: str(f.observacoes),
    dataReavaliacao: f.dataReavaliacao || null,
  };
}

type Payload = ReturnType<typeof toPayload>;

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function ChipToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
        active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          {value ?? "—"}
          {value !== null && (
            <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => onChange(null)} aria-label={`Limpar ${label}`}>
              <X size={12} />
            </button>
          )}
        </span>
      </div>
      <input type="range" min={0} max={10} value={value ?? 5} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-600" aria-label={label} />
    </div>
  );
}

function ClienteSelect({ value, onPick }: { value: Cliente | null; onPick: (c: Cliente | null) => void }) {
  const [q, setQ] = useState(value?.nome ?? "");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q, 250);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    api<Cliente[]>(`${BASE}/clientes?search=${encodeURIComponent(dq)}`)
      .then((r) => alive && setList(Array.isArray(r) ? r : []))
      .catch(() => alive && setList([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq, open]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputCls} pl-9 ${value ? "border-emerald-300" : ""}`}
          placeholder="Buscar paciente pelo nome…"
          value={q}
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
      </div>
      {open && (
        <ul className={`${card} absolute z-10 mt-1 max-h-56 w-full overflow-y-auto p-1`}>
          {loading && <li className="px-3 py-2 text-xs text-slate-500">Buscando…</li>}
          {!loading && list.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Nenhum paciente encontrado.</li>}
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(c);
                  setQ(c.nome);
                  setOpen(false);
                }}
              >
                <Avatar nome={c.nome} size={24} />
                {c.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Montador de plano a partir do catálogo real de procedimentos. */
function PlanoBuilder({ itens, setItens, catalogo }: { itens: ItemPlano[]; setItens: (v: ItemPlano[]) => void; catalogo: Procedimento[] }) {
  const [busca, setBusca] = useState("");
  const [avulso, setAvulso] = useState("");

  const disponiveis = useMemo(() => {
    const usados = new Set(itens.map((i) => i.nome.toLowerCase()));
    return catalogo.filter((p) => !usados.has(p.name.toLowerCase()) && (!busca.trim() || `${p.name} ${p.category}`.toLowerCase().includes(busca.trim().toLowerCase())));
  }, [catalogo, itens, busca]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, Procedimento[]>();
    disponiveis.forEach((p) => m.set(p.category || "Geral", [...(m.get(p.category || "Geral") ?? []), p]));
    return [...m.entries()];
  }, [disponiveis]);

  const add = (p: Procedimento) => setItens([...itens, { nome: p.name, sessoes: 1, preco: Number(p.price), procedureId: p.id }]);
  const addAvulso = () => {
    const nome = avulso.trim();
    if (!nome || itens.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) return;
    setItens([...itens, { nome, sessoes: 1, preco: 0 }]);
    setAvulso("");
  };
  const setSessoes = (idx: number, n: number) => setItens(itens.map((it, i) => (i === idx ? { ...it, sessoes: Math.min(99, Math.max(1, n)) } : it)));

  return (
    <div className="space-y-4">
      {itens.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {itens.map((it, idx) => (
            <li key={it.nome} className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{it.nome}</p>
                <p className="text-[11px] text-slate-500">{it.preco ? `${brl(it.preco)} por sessão` : "Sem preço no catálogo"}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50" onClick={() => setSessoes(idx, it.sessoes - 1)} aria-label="Menos uma sessão"><Minus size={13} /></button>
                  <span className="w-12 text-center text-xs font-bold text-slate-900">{it.sessoes} sess.</span>
                  <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50" onClick={() => setSessoes(idx, it.sessoes + 1)} aria-label="Mais uma sessão"><Plus size={13} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <p className="w-20 text-right text-sm font-bold text-slate-900">{it.preco ? brl(it.preco * it.sessoes) : "—"}</p>
                  <IconBtn label={`Remover ${it.nome}`} danger onClick={() => setItens(itens.filter((_, i) => i !== idx))}><X size={15} /></IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className={`${eyebrow} mb-2`}>Catálogo de procedimentos</p>
        {catalogo.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
            Nenhum procedimento cadastrado no catálogo. Cadastre em “Procedimentos” ou adicione itens avulsos abaixo.
          </p>
        ) : (
          <>
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder="Buscar procedimento…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar procedimento" />
            </div>
            <div className="max-h-52 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200">
              {porCategoria.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-500">Nenhum procedimento disponível.</p>}
              {porCategoria.map(([cat, procs]) => (
                <div key={cat}>
                  <p className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{cat}</p>
                  {procs.map((p) => (
                    <button key={p.id} type="button" onClick={() => add(p)} className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50/60 transition-colors">
                      <span className="min-w-0 truncate font-semibold text-slate-800">{p.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{p.duration} min · <strong className="text-slate-800">{brl(Number(p.price))}</strong></span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={inputCls}
          placeholder="Item avulso (fora do catálogo)…"
          value={avulso}
          onChange={(e) => setAvulso(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAvulso();
            }
          }}
        />
        <button type="button" className={`${btnGhost} w-full sm:w-auto shrink-0`} onClick={addAvulso}><Plus size={14} /> Adicionar</button>
      </div>
    </div>
  );
}

const ETAPAS = ["Paciente e queixa", "Análise", "Plano"] as const;

function AvaliacaoForm({ inicial, catalogo, onSave, onClose }: { inicial?: Avaliacao; catalogo: Procedimento[]; onSave: (payload: Payload, id?: string) => Promise<void>; onClose: () => void }) {
  const { usuario } = useSessao();
  const [f, setF] = useState<FormState>(() => toForm(inicial, catalogo, usuario?.nome ?? "Profissional"));
  const [etapa, setEtapa] = useState<(typeof ETAPAS)[number]>("Paciente e queixa");
  const [busy, setBusy] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleCond = (v: string) => setF((p) => ({ ...p, condicoes: p.condicoes.includes(v) ? p.condicoes.filter((x) => x !== v) : [...p.condicoes, v] }));

  const mostraFacial = f.tipo === "FACIAL" || f.tipo === "GERAL";
  const mostraPele = f.tipo !== "CORPORAL";
  const mostraCorpo = f.tipo === "CORPORAL" || f.tipo === "GERAL";
  const im = imc(Number(f.pesoKg.replace(",", ".")) || null, Number(f.alturaCm.replace(",", ".")) || null);

  const calculado = totalPlano(f.itens);
  const retornoCatalogo = useMemo(() => {
    const dias = f.itens
      .map((i) => catalogo.find((p) => p.id === i.procedureId)?.returnDays ?? 0)
      .filter((d) => d > 0);
    return dias.length ? Math.max(...dias) : null;
  }, [f.itens, catalogo]);

  const trocarTipo = (t: Tipo) => setF((p) => ({ ...p, tipo: t, condicoes: p.condicoes.filter((c) => CONDICOES[t].includes(c)) }));

  const salvar = async (status: Status) => {
    if (!f.cliente) {
      setEtapa("Paciente e queixa");
      setErr("Selecione um paciente da lista.");
      return;
    }
    if (!f.dataAvaliacao) {
      setEtapa("Paciente e queixa");
      setErr("Informe a data da avaliação.");
      return;
    }
    if (status === "CONCLUIDA" && !f.queixaPrincipal.trim()) {
      setEtapa("Paciente e queixa");
      setErr("Para concluir, preencha a queixa principal.");
      return;
    }
    setBusy(status);
    setErr(null);
    try {
      await onSave(toPayload(f, status), inicial?.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  };

  const idx = ETAPAS.indexOf(etapa);

  return (
    <Modal wide title={inicial ? "Editar avaliação" : "Nova avaliação estética"} subtitle={f.cliente ? `Paciente: ${f.cliente.nome}` : "Anamnese, fotos e termos ficam no prontuário — aqui você registra a análise e o plano"} onClose={onClose}>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 sm:px-6 pt-3 scrollbar-hide shrink-0" role="tablist">
        {ETAPAS.map((e, i) => (
          <button
            key={e}
            role="tab"
            aria-selected={etapa === e}
            onClick={() => setEtapa(e)}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-t-lg border-b-2 px-3 sm:px-4 py-2.5 text-[12px] sm:text-sm font-semibold transition whitespace-nowrap ${
              etapa === e ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className={`grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-full text-[9px] sm:text-[10px] font-bold ${etapa === e ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
            {e}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5">
        {etapa === "Paciente e queixa" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Paciente *" className="sm:col-span-2">
              <ClienteSelect value={f.cliente} onPick={(c) => set("cliente", c)} />
            </Field>
            {f.cliente && (
              <div className="sm:col-span-2">
                <ContextoProntuario c={f.cliente} />
              </div>
            )}
            <Field label="Tipo de avaliação">
              <select className={inputCls} value={f.tipo} onChange={(e) => trocarTipo(e.target.value as Tipo)}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Data da avaliação *">
              <input type="date" className={inputCls} value={f.dataAvaliacao} onChange={(e) => set("dataAvaliacao", e.target.value)} />
            </Field>
            <Field label="Profissional responsável" className="sm:col-span-2">
              <input className={inputCls} value={f.profissionalNome} onChange={(e) => set("profissionalNome", e.target.value)} />
            </Field>
            <Field label="Queixa principal" className="sm:col-span-2" hint="Obrigatória para concluir">
              <textarea rows={3} className={`${inputCls} !h-auto resize-none py-3`} placeholder="O que incomoda o paciente e há quanto tempo?" value={f.queixaPrincipal} onChange={(e) => set("queixaPrincipal", e.target.value)} />
            </Field>
            <Field label="Expectativas" className="sm:col-span-2">
              <textarea rows={2} className={`${inputCls} !h-auto resize-none py-3`} value={f.expectativas} onChange={(e) => set("expectativas", e.target.value)} />
            </Field>
          </div>
        )}

        {etapa === "Análise" && (
          <div className="space-y-5">
            {mostraFacial && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de pele (observado hoje)">
                  <select className={inputCls} value={f.tipoPele} onChange={(e) => set("tipoPele", e.target.value)}>
                    <option value="">Selecione…</option>
                    {TIPOS_PELE.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Escala de Glogau (envelhecimento)">
                  <select className={inputCls} value={f.glogau} onChange={(e) => set("glogau", e.target.value)}>
                    <option value="">Selecione…</option>
                    {GLOGAU.map((g, i) => <option key={g} value={i + 1}>{g}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {mostraPele && (
              <div>
                <p className={`${eyebrow} mb-2`}>Notas (0–10) — alimentam a comparação entre avaliações</p>
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
                  <Slider label="Hidratação" value={f.hidratacao} onChange={(v) => set("hidratacao", v)} />
                  <Slider label="Oleosidade" value={f.oleosidade} onChange={(v) => set("oleosidade", v)} />
                  <Slider label="Elasticidade" value={f.elasticidade} onChange={(v) => set("elasticidade", v)} />
                </div>
              </div>
            )}

            {mostraCorpo && (
              <div className="space-y-4">
                <p className={eyebrow}>Medidas corporais</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Peso (kg)">
                    <input type="number" step="0.1" min={0} className={inputCls} value={f.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} />
                  </Field>
                  <Field label="Altura (cm)">
                    <input type="number" step="0.1" min={0} className={inputCls} value={f.alturaCm} onChange={(e) => set("alturaCm", e.target.value)} />
                  </Field>
                  <div className="col-span-2 flex items-end">
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-2.5 text-[13px] sm:text-sm h-11 flex items-center">
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-2">IMC </span>
                      <span className="font-bold text-slate-900">{im ? im.valor.toFixed(1) : "—"}</span>
                      {im && <span className="ml-2 text-[10px] sm:text-xs text-slate-500 truncate">{im.faixa}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {MEDIDAS_CAMPOS.map((m) => (
                    <Field key={m.key} label={`${m.label} (cm)`}>
                      <input type="number" step="0.1" min={0} className={inputCls} value={f.medidas[m.key] ?? ""} onChange={(e) => set("medidas", { ...f.medidas, [m.key]: e.target.value })} />
                    </Field>
                  ))}
                </div>
                <Field label="Grau de celulite (0–4)">
                  <select className={inputCls} value={f.celulite} onChange={(e) => set("celulite", e.target.value)}>
                    <option value="">Não avaliado</option>
                    {["0 — Ausente", "1 — Leve", "2 — Moderado", "3 — Intenso", "4 — Severo"].map((g, i) => <option key={g} value={i}>{g}</option>)}
                  </select>
                </Field>
              </div>
            )}

            <div>
              <p className={`${eyebrow} mb-2`}>Condições identificadas</p>
              <div className="flex flex-wrap gap-2">
                {CONDICOES[f.tipo].map((c) => (
                  <ChipToggle key={c} active={f.condicoes.includes(c)} onClick={() => toggleCond(c)}>{c}</ChipToggle>
                ))}
              </div>
            </div>
          </div>
        )}

        {etapa === "Plano" && (
          <div className="space-y-5">
            <PlanoBuilder itens={f.itens} setItens={(v) => set("itens", v)} catalogo={catalogo} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Valor final do plano (R$)" hint={f.valorManual ? "Valor ajustado manualmente" : `Soma automática do catálogo: ${brl(calculado)}`}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={inputCls}
                    value={f.valorManual ? f.valorFinal : calculado ? String(calculado) : ""}
                    onChange={(e) => setF((p) => ({ ...p, valorManual: true, valorFinal: e.target.value }))}
                  />
                  {f.valorManual && (
                    <button type="button" className={`${btnGhost} !px-3 shrink-0`} onClick={() => setF((p) => ({ ...p, valorManual: false, valorFinal: "" }))} title="Voltar ao valor automático">
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Intervalo entre sessões (dias)">
                <input type="number" min={0} className={inputCls} value={f.intervaloDias} onChange={(e) => set("intervaloDias", e.target.value)} />
              </Field>
            </div>

            <Field label="Data da reavaliação">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input type="date" className={`${inputCls} w-full sm:w-[150px] shrink-0`} value={f.dataReavaliacao} onChange={(e) => set("dataReavaliacao", e.target.value)} />
                <div className="flex flex-wrap gap-2 w-full">
                  {retornoCatalogo && (
                    <button type="button" className={`${btnGhost} flex-1 sm:flex-none justify-center !px-3 !py-2 text-[11px] sm:text-xs whitespace-nowrap`} onClick={() => set("dataReavaliacao", addDias(f.dataAvaliacao, retornoCatalogo))}>
                      Catálogo (+{retornoCatalogo}d)
                    </button>
                  )}
                  {[30, 60, 90].map((d) => (
                    <button key={d} type="button" className={`${btnGhost} flex-1 sm:flex-none justify-center !px-3 !py-2 text-[11px] sm:text-xs`} onClick={() => set("dataReavaliacao", addDias(f.dataAvaliacao, d))}>
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="Observações">
              <textarea rows={3} className={`${inputCls} !h-auto resize-none py-3`} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </Field>

            <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] sm:text-xs text-slate-600">
              <FileSignature size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>O termo de consentimento é coletado em “Termos & Documentos” e aparece aqui automaticamente como “Termo assinado”.</span>
            </p>
          </div>
        )}

        {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{err}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 sm:px-6 py-4 shrink-0 bg-slate-50/50">
        <div className="flex w-full sm:w-auto gap-2">
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center`} disabled={idx === 0} onClick={() => setEtapa(ETAPAS[idx - 1])}>Voltar</button>
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center`} disabled={idx === ETAPAS.length - 1} onClick={() => setEtapa(ETAPAS[idx + 1])}>Avançar</button>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center`} disabled={!!busy} onClick={() => salvar("RASCUNHO")}>
            {busy === "RASCUNHO" && <Loader2 size={15} className="animate-spin shrink-0" />}
            <span className="truncate">Salvar rascunho</span>
          </button>
          <button className={`${btnBlue} flex-1 sm:flex-none justify-center`} disabled={!!busy} onClick={() => salvar("CONCLUIDA")}>
            {busy === "CONCLUIDA" && <Loader2 size={15} className="animate-spin shrink-0" />}
            Concluir
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPARAÇÃO ENTRE AVALIAÇÕES
   ═══════════════════════════════════════════════════════════════ */

type Delta = { label: string; antes: number; depois: number; unidade: string; melhor: "up" | "down" | "neutral" };

function comparar(a: Avaliacao, b: Avaliacao): Delta[] {
  const out: Delta[] = [];
  const add = (label: string, depois: number | null | undefined, antes: number | null | undefined, melhor: Delta["melhor"], unidade = "") => {
    if (depois != null && antes != null) out.push({ label, depois, antes, melhor, unidade });
  };
  add("Hidratação", a.hidratacao, b.hidratacao, "up", "/10");
  add("Oleosidade", a.oleosidade, b.oleosidade, "neutral", "/10");
  add("Elasticidade", a.elasticidade, b.elasticidade, "up", "/10");
  add("Peso", a.pesoKg, b.pesoKg, "neutral", " kg");
  const ia = imc(a.pesoKg, a.alturaCm);
  const ib = imc(b.pesoKg, b.alturaCm);
  if (ia && ib) add("IMC", +ia.valor.toFixed(1), +ib.valor.toFixed(1), "neutral");
  MEDIDAS_CAMPOS.forEach((m) => add(m.label, a.medidas?.[m.key], b.medidas?.[m.key], "down", " cm"));
  return out;
}

function Variacao({ d }: { d: Delta }) {
  const diff = +(d.depois - d.antes).toFixed(1);
  const bom = d.melhor === "up" ? diff > 0 : d.melhor === "down" ? diff < 0 : null;
  const tone = diff === 0 ? "text-slate-500" : bom === null ? "text-blue-600" : bom ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-slate-600">{d.label}</p>
        <p className="text-[11px] text-slate-400">{d.antes}{d.unidade} → <strong className="text-slate-800">{d.depois}{d.unidade}</strong></p>
      </div>
      <span className={`flex shrink-0 items-center gap-0.5 text-xs font-bold ${tone}`}>
        {diff > 0 ? <ArrowUp size={13} /> : diff < 0 ? <ArrowDown size={13} /> : <Minus size={13} />}
        {Math.abs(diff)}
      </span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 80;
  const h = 22;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 10) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible text-blue-500 shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAINEL DE DETALHES
   ═══════════════════════════════════════════════════════════════ */

function Gauge({ label, value, serie }: { label: string; value?: number | null; serie?: number[] }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
          <span className="truncate">{label}</span>
          <span className="text-slate-900 shrink-0">{value}/10</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${value * 10}%` }} />
        </div>
      </div>
      {serie && <Sparkline values={serie} />}
    </div>
  );
}

function Info({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return (
    <div>
      <p className={eyebrow}>{label}</p>
      <div className="mt-0.5 text-[13px] sm:text-sm text-slate-800 break-words">{children}</div>
    </div>
  );
}

function DetailPanel({ a, catalogo, onEdit, onStatus, onDuplicate, onDelete, onOpen }: { a: Avaliacao; catalogo: Procedimento[]; onEdit: () => void; onStatus: (s: Status) => void; onDuplicate: () => void; onDelete: () => void; onOpen: (x: Avaliacao) => void }) {
  const meta = STATUS_META[a.status];
  const re = reavaliacaoStatus(a);
  const im = imc(a.pesoKg, a.alturaCm);
  const itens = useMemo(() => a.procedimentosSugeridos.map((t) => parseItem(t, catalogo)), [a.procedimentosSugeridos, catalogo]);
  const [hist, setHist] = useState<Avaliacao[]>([]);

  useEffect(() => {
    let alive = true;
    api<{ data: Avaliacao[] }>(`${BASE}?clienteId=${a.clienteId}&limit=50`)
      .then((r) => alive && setHist(r.data ?? []))
      .catch(() => alive && setHist([]));
    return () => {
      alive = false;
    };
  }, [a.clienteId, a.id, a.status]);

  const dia = (x: Avaliacao) => toDateInput(x.dataAvaliacao);
  const anterior = useMemo(
    () =>
      hist
        .filter((h) => h.id !== a.id && h.status === "CONCLUIDA" && h.tipo === a.tipo && dia(h) < dia(a))
        .sort((x, y) => dia(y).localeCompare(dia(x)))[0],
    [hist, a],
  );
  const deltas = useMemo(() => (anterior ? comparar(a, anterior) : []), [a, anterior]);

  const serie = useCallback(
    (k: "hidratacao" | "oleosidade" | "elasticidade") =>
      [...hist.filter((h) => h.id !== a.id && h.status === "CONCLUIDA" && h.tipo === a.tipo), a]
        .sort((x, y) => dia(x).localeCompare(dia(y)))
        .map((h) => h[k])
        .filter((v): v is number => v != null),
    [hist, a],
  );

  const outras = hist.filter((h) => h.id !== a.id);
  const wa = a.status === "CONCLUIDA" && a.dataReavaliacao ? whatsappLink(a) : null;
  const total = itens.reduce((sum, i) => sum + i.preco * i.sessoes, 0);

  return (
    <aside className={`${card} sticky top-0 xl:top-4 max-h-[calc(100vh-80px)] xl:max-h-[calc(100vh-120px)] flex flex-col w-full xl:w-[400px] overflow-hidden z-10`}>
      <div className="border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
        <div className="flex items-start gap-3">
          <Avatar nome={a.cliente?.nome ?? "?"} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] sm:text-lg font-extrabold tracking-tight text-slate-900">{a.cliente?.nome ?? "Paciente"}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">{TIPOS.find((t) => t.value === a.tipo)?.label} · {fmtDate(a.dataAvaliacao)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {a.termoAssinado ? <Badge tone="success"><Check size={11} /> Termo assinado</Badge> : <Badge tone="warning">Sem termo assinado</Badge>}
              {re && <Badge tone={re.tone}><CalendarClock size={11} /> Reavaliação {re.label.toLowerCase()}</Badge>}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={onEdit}><Pencil size={13} className="shrink-0" /> Editar</button>
          {a.status === "RASCUNHO" && <button className={`${btnBlue} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => onStatus("CONCLUIDA")}><CheckCircle2 size={13} className="shrink-0" /> Concluir</button>}
          {a.status === "CONCLUIDA" && <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => onStatus("RASCUNHO")}>Reabrir</button>}
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={onDuplicate} title="Cria um novo rascunho a partir desta avaliação"><Copy size={13} className="shrink-0" /> Reavaliar</button>
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => imprimir(a, catalogo)}><Printer size={13} className="shrink-0" /> Imprimir</button>
          {wa && <a className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} href={wa} target="_blank" rel="noreferrer"><MessageCircle size={13} className="shrink-0" /> WhatsApp</a>}
          {a.status !== "ARQUIVADA" ? (
            <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => onStatus("ARQUIVADA")}><Archive size={13} className="shrink-0" /> Arquivar</button>
          ) : (
            <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => onStatus("RASCUNHO")}>Desarquivar</button>
          )}
          <button className={`${btnGhost} flex-1 sm:flex-none justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs !text-rose-600 hover:!bg-rose-50`} onClick={onDelete}><Trash2 size={13} className="shrink-0" /> Excluir</button>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-4 sm:p-5 overflow-y-auto custom-scrollbar bg-slate-50/30">
        {a.cliente && <ContextoProntuario c={a.cliente} />}

        <Info label="Queixa principal">{a.queixaPrincipal}</Info>
        <Info label="Expectativas">{a.expectativas}</Info>

        {(a.tipoPele || a.glogau || a.condicoes.length > 0 || a.hidratacao != null || a.oleosidade != null || a.elasticidade != null) && (
          <div className="space-y-3">
            <p className={eyebrow}>Análise</p>
            <div className="flex flex-wrap items-center gap-2">
              {a.tipoPele && <Badge tone="info">Pele {a.tipoPele.toLowerCase()}</Badge>}
              {a.glogau && <Badge>Glogau {["I", "II", "III", "IV"][a.glogau - 1]}</Badge>}
            </div>
            <div className="space-y-2.5">
              <Gauge label="Hidratação" value={a.hidratacao} serie={serie("hidratacao")} />
              <Gauge label="Oleosidade" value={a.oleosidade} serie={serie("oleosidade")} />
              <Gauge label="Elasticidade" value={a.elasticidade} serie={serie("elasticidade")} />
            </div>
            {a.condicoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {a.condicoes.map((c) => <Badge key={c} tone="warning">{c}</Badge>)}
              </div>
            )}
          </div>
        )}

        {(im || a.medidas || a.celulite != null) && (
          <div className="space-y-2">
            <p className={eyebrow}>Corpo</p>
            {im && (
              <p className="text-[13px] sm:text-sm text-slate-800">
                {a.pesoKg} kg · {a.alturaCm} cm · IMC <strong>{im.valor.toFixed(1)}</strong> <span className="text-[11px] sm:text-xs text-slate-500">({im.faixa})</span>
              </p>
            )}
            {a.celulite != null && <p className="text-[13px] sm:text-sm text-slate-800">Celulite grau {a.celulite}</p>}
            {a.medidas && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(a.medidas).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-center shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{MEDIDAS_CAMPOS.find((m) => m.key === k)?.label ?? k}</p>
                    <p className="text-[13px] sm:text-sm font-bold text-slate-900">{v} cm</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {anterior && deltas.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className={eyebrow}>Evolução desde {fmtDate(anterior.dataAvaliacao)}</p>
              <button className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:underline" onClick={() => onOpen(anterior)}>Ver anterior</button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {deltas.map((d) => <Variacao key={d.label} d={d} />)}
            </div>
          </div>
        )}
        {!anterior && a.status === "CONCLUIDA" && outras.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[11px] sm:text-xs text-slate-500">
            Primeira avaliação deste paciente. Nas próximas, a comparação de evolução aparece aqui.
          </p>
        )}

        {itens.length > 0 && (
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
            <p className={`${eyebrow} !text-blue-700`}>Plano sugerido</p>
            <ul className="space-y-1.5">
              {itens.map((i) => (
                <li key={i.nome} className="flex items-center justify-between gap-2 text-[12px] sm:text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-800">{i.nome} <span className="font-medium text-slate-500">×{i.sessoes}</span></span>
                  <span className="shrink-0 text-[11px] sm:text-xs text-slate-600">{i.preco ? brl(i.preco * i.sessoes) : "—"}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2 border-t border-blue-100/60 pt-3 text-center">
              <div><p className="text-[16px] sm:text-lg font-extrabold text-slate-900 truncate">{a.sessoesPrevistas ?? "—"}</p><p className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-500 truncate">Até sessões</p></div>
              <div><p className="text-[16px] sm:text-lg font-extrabold text-slate-900 truncate">{a.intervaloDias ? `${a.intervaloDias}d` : "—"}</p><p className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-500 truncate">Intervalo</p></div>
              <div><p className="text-[16px] sm:text-lg font-extrabold text-slate-900 truncate">{a.valorEstimado ? brl(a.valorEstimado) : total ? brl(total) : "—"}</p><p className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-500 truncate">Valor</p></div>
            </div>
          </div>
        )}

        <Info label="Reavaliação">{a.dataReavaliacao ? fmtDate(a.dataReavaliacao) : null}</Info>
        <Info label="Observações">{a.observacoes}</Info>
        <Info label="Profissional">{a.profissionalNome}</Info>

        {outras.length > 0 && (
          <div>
            <p className={`${eyebrow} mb-2`}>Histórico do paciente</p>
            <ul className="space-y-1.5">
              {outras.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button onClick={() => onOpen(h)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left text-[11px] sm:text-xs hover:bg-slate-50 shadow-sm transition-colors">
                    <span className="font-semibold text-slate-700 truncate">{fmtDate(h.dataAvaliacao)} · {TIPOS.find((t) => t.value === h.tipo)?.label.split(" ")[0]}</span>
                    <Badge tone={STATUS_META[h.status].tone}>{STATUS_META[h.status].label}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILA DE REAVALIAÇÕES
   ═══════════════════════════════════════════════════════════════ */

const GRUPOS_FILA: { titulo: string; tone: Tone; test: (d: number) => boolean }[] = [
  { titulo: "Vencidas", tone: "danger", test: (d) => d < 0 },
  { titulo: "Próximos 7 dias", tone: "warning", test: (d) => d >= 0 && d <= 7 },
  { titulo: "Próximos 30 dias", tone: "info", test: (d) => d > 7 && d <= 30 },
  { titulo: "Mais adiante", tone: "neutral", test: (d) => d > 30 },
];

function FilaReavaliacoes({ version, onOpen, onReavaliar }: { version: number; onOpen: (a: Avaliacao) => void; onReavaliar: (a: Avaliacao) => void }) {
  const [items, setItems] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ data: Avaliacao[] }>(`${BASE}?status=CONCLUIDA&limit=500`);
      setItems((r.data ?? []).filter((a) => a.dataReavaliacao));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a fila");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  const fila = useMemo(() => {
    const ultimo = new Map<string, Avaliacao>();
    [...items]
      .sort((x, y) => toDateInput(y.dataAvaliacao).localeCompare(toDateInput(x.dataAvaliacao)))
      .forEach((a) => {
        const k = `${a.clienteId}:${a.tipo}`;
        if (!ultimo.has(k)) ultimo.set(k, a);
      });
    return [...ultimo.values()].sort((x, y) => toDateInput(x.dataReavaliacao).localeCompare(toDateInput(y.dataReavaliacao)));
  }, [items]);

  if (loading) return <div className={`${card} p-4 sm:p-6`}><div className="h-4 animate-pulse rounded bg-slate-100" /></div>;
  if (error)
    return (
      <div className={`${card} p-8 sm:p-10 text-center`}>
        <p className="text-[13px] sm:text-sm text-rose-600">{error}</p>
        <button className={`${btnGhost} mt-3`} onClick={load}><RefreshCw size={14} /> Tentar de novo</button>
      </div>
    );
  if (fila.length === 0)
    return (
      <div className={`${card} p-10 sm:p-14 text-center`}>
        <CalendarClock size={28} className="mx-auto text-slate-300" />
        <p className="mt-3 text-[13px] sm:text-sm font-semibold text-slate-700">Nenhuma reavaliação programada</p>
        <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Defina a data de reavaliação ao concluir uma avaliação para acompanhá-la aqui.</p>
      </div>
    );

  return (
    <div className="space-y-4 sm:space-y-5">
      {GRUPOS_FILA.map((g) => {
        const lista = fila.filter((a) => {
          const d = daysUntil(a.dataReavaliacao);
          return d !== null && g.test(d);
        });
        if (!lista.length) return null;
        return (
          <section key={g.titulo}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[13px] sm:text-sm font-extrabold text-slate-900">{g.titulo}</h3>
              <Badge tone={g.tone}>{lista.length}</Badge>
            </div>
            <div className={`${card} divide-y divide-slate-100 overflow-hidden`}>
              {lista.map((a) => {
                const re = reavaliacaoStatus(a);
                const wa = whatsappLink(a);
                return (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 sm:py-4">
                    <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
                      <Avatar nome={a.cliente?.nome ?? "?"} size={36} />
                      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(a)}>
                        <p className="truncate text-[13px] sm:text-sm font-semibold text-slate-900">{a.cliente?.nome ?? "Paciente"}</p>
                        <p className="truncate text-[11px] sm:text-xs text-slate-500">
                          {TIPOS.find((t) => t.value === a.tipo)?.label.split(" ")[0]} · avaliada em {fmtDate(a.dataAvaliacao)}
                          {a.procedimentosSugeridos.length ? ` · ${a.procedimentosSugeridos.length} proc.` : ""}
                        </p>
                      </button>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-50 sm:border-t-0">
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-700">{fmtDate(a.dataReavaliacao)}</p>
                        {re && <Badge tone={re.tone}>{re.label}</Badge>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {wa ? (
                          <a className={`${btnGhost} justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} href={wa} target="_blank" rel="noreferrer"><MessageCircle size={13} /> <span className="hidden lg:inline">Contatar</span></a>
                        ) : (
                          <span className="self-center px-2 text-center text-[10px] sm:text-[11px] text-slate-400">Sem telefone</span>
                        )}
                        <button className={`${btnBlue} justify-center !px-2.5 !py-1.5 text-[11px] sm:text-xs`} onClick={() => onReavaliar(a)}><Copy size={13} /> <span className="hidden lg:inline">Reavaliar</span></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTEÚDO DA PÁGINA
   ═══════════════════════════════════════════════════════════════ */

function Kpi({ label, value, hint, dark, tone = "default" }: { label: string; value: string; hint: string; dark?: boolean; tone?: "default" | "green" | "amber" | "red" }) {
  const base = dark ? "border-slate-900 bg-slate-900 text-white" : tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "red" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0 h-full ${base}`}>
      <div>
        <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
        <p className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight truncate">{value}</p>
      </div>
      <p className={`mt-2 text-[10px] sm:text-[11px] leading-tight truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

const PILLS: { key: Status | "TODAS"; label: string; cls: string }[] = [
  { key: "TODAS", label: "Todas", cls: "border-slate-300 text-slate-800" },
  { key: "RASCUNHO", label: "Rascunhos", cls: "border-amber-300 text-amber-800" },
  { key: "CONCLUIDA", label: "Concluídas", cls: "border-emerald-300 text-emerald-800" },
  { key: "ARQUIVADA", label: "Arquivadas", cls: "border-slate-200 text-slate-600" },
];

export default function AvaliacoesPage() {
  const [view, setView] = useState<"lista" | "fila">("lista");
  const [version, setVersion] = useState(0);
  const [items, setItems] = useState<Avaliacao[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [catalogo, setCatalogo] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [statusF, setStatusF] = useState<Status | "TODAS">("TODAS");
  const [tipoF, setTipoF] = useState<Tipo | "TODOS">("TODOS");
  const [limit, setLimit] = useState(100);
  const dBusca = useDebounced(busca, 300);

  const [selected, setSelected] = useState<Avaliacao | null>(null);
  const [form, setForm] = useState<{ item?: Avaliacao } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const reqId = useRef(0);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    api<Procedimento[]>(`${BASE}/procedimentos`)
      .then((r) => setCatalogo(Array.isArray(r) ? r : []))
      .catch(() => setCatalogo([]));
  }, []);

  const loadResumo = useCallback(async () => {
  try {
    setResumo(await api<Resumo>(`${BASE}/resumo`));
  } catch (e) {
    console.error("Erro ao carregar resumo das avaliações:", e);
  }
}, []);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ limit: String(limit) });
      if (dBusca.trim()) p.set("search", dBusca.trim());
      if (statusF !== "TODAS") p.set("status", statusF);
      if (tipoF !== "TODOS") p.set("tipo", tipoF);
      const r = await api<{ data: Avaliacao[]; total: number }>(`${BASE}?${p}`);
      if (my !== reqId.current) return;
      setItems(r.data ?? []);
      setTotal(r.total ?? 0);
    } catch (e) {
      if (my !== reqId.current) return;
      console.warn("API offline, carregando mock de avaliações", e);
      // MOCK FALLBACK (apenas se BD falhar)
      setItems([
        { id: "1", clienteId: "pac1", cliente: { id: "pac1", nome: "Mariana Prado", telefone: "(11) 99999-9999" }, profissionalNome: "Dra. Joana", tipo: "FACIAL", status: "CONCLUIDA", dataAvaliacao: "2026-10-24", queixaPrincipal: "Rugas na testa e flacidez", condicoes: ["Rugas finas"], procedimentosSugeridos: ["Toxina Botulínica ×1", "Fios Silhouette Soft ×1"], valorEstimado: 12500, dataReavaliacao: "2026-11-24" },
        { id: "2", clienteId: "pac2", cliente: { id: "pac2", nome: "Luciana Diniz", telefone: "(11) 98888-8888" }, profissionalNome: "Dra. Camila", tipo: "CORPORAL", status: "RASCUNHO", dataAvaliacao: "2026-10-25", queixaPrincipal: "Gordura localizada", condicoes: ["Gordura localizada"], procedimentosSugeridos: [], valorEstimado: null, dataReavaliacao: null }
      ] as Avaliacao[]);
      setTotal(2);
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [dBusca, statusF, tipoF, limit]);

  useEffect(() => {
    load();
  }, [load]);
  
  useEffect(() => {
    loadResumo();
  }, [loadResumo]);

  useEffect(() => setLimit(100), [dBusca, statusF, tipoF]);

  const refreshAll = async () => {
    setVersion((v) => v + 1);
    await Promise.all([load(), loadResumo()]);
  };

  const current = selected ? items.find((i) => i.id === selected.id) ?? selected : null;

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir a ação", "err");
    }
  };

  const abrir = (a: Avaliacao) => {
    setSelected(a);
    setView("lista");
  };

  const salvar = async (payload: Payload, id?: string) => {
    const saved = id
      ? await api<Avaliacao>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api<Avaliacao>(BASE, { method: "POST", body: JSON.stringify(payload) });
    setSelected(saved);
    await refreshAll();
    toast(payload.status === "CONCLUIDA" ? "Avaliação concluída" : "Rascunho salvo");
  };

  const mudarStatus = (a: Avaliacao, status: Status) =>
    run(
      async () => {
        const saved = await api<Avaliacao>(`${BASE}/${a.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
        setSelected(saved);
        await refreshAll();
      },
      status === "CONCLUIDA" ? "Avaliação concluída" : status === "ARQUIVADA" ? "Avaliação arquivada" : "Status atualizado",
    );

  const duplicar = (a: Avaliacao) =>
    setConfirm({
      message: `Criar um novo rascunho de reavaliação para ${a.cliente?.nome ?? "o paciente"} com base nesta avaliação?`,
      confirmLabel: "Criar rascunho",
      onConfirm: () =>
        run(async () => {
          const nova = await api<Avaliacao>(`${BASE}/${a.id}/duplicar`, { method: "POST" });
          setSelected(nova);
          setView("lista");
          await refreshAll();
          setForm({ item: nova });
        }, "Rascunho criado"),
    });

  const excluir = (a: Avaliacao) =>
    setConfirm({
      message: `Excluir a avaliação de ${a.cliente?.nome ?? "paciente"}? Essa ação não pode ser desfeita. Para manter o histórico, use "Arquivar".`,
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: () =>
        run(async () => {
          await api(`${BASE}/${a.id}`, { method: "DELETE" });
          setSelected(null);
          await refreshAll();
        }, "Avaliação excluída"),
    });

  const contagem = (k: Status | "TODAS") =>
    !resumo ? 0 : k === "TODAS" ? resumo.total : k === "RASCUNHO" ? resumo.rascunhos : k === "CONCLUIDA" ? resumo.concluidas : resumo.arquivadas;

  const pendentesFila = (resumo?.reavaliacoesVencidas ?? 0) + (resumo?.reavaliacoesProximas ?? 0);

  const acoesTopo = (
    <>
      <button
        className={`${btnGhost} flex-1 md:flex-none justify-center h-9 sm:h-10 text-[11px] sm:text-xs`}
        onClick={() =>
          downloadCsv(
            "avaliacoes.csv",
            items.map((a) => ({
              Paciente: a.cliente?.nome,
              Tipo: a.tipo,
              Data: fmtDate(a.dataAvaliacao),
              Profissional: a.profissionalNome,
              Status: a.status,
              Queixa: a.queixaPrincipal,
              Plano: a.procedimentosSugeridos.join(" | "),
              ValorEstimado: a.valorEstimado,
              Reavaliacao: fmtDate(a.dataReavaliacao),
            })),
          )
        }
      >
        <Download size={15} /> <span className="hidden sm:inline">Exportar</span>
      </button>
      <button className={`${btnPrimary} flex-1 md:flex-none justify-center whitespace-nowrap h-9 sm:h-10 text-[11px] sm:text-xs`} onClick={() => setForm({})}>
        <Plus size={16} /> Nova avaliação
      </button>
    </>
  );

  return (
    <AppShell
      trilha={["Gestão Clínica", "Avaliações"]}
      busca={{ valor: busca, onChange: setBusca, placeholder: "Buscar por paciente ou queixa..." }}
      acoes={acoesTopo}
    >
      <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-[#f8fafc]">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 flex-1 flex flex-col min-h-0">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none mb-1.5 sm:mb-2">Avaliações estéticas</h1>
              <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 line-clamp-1">Análise estruturada, evolução e plano de tratamento</p>
            </div>
          </header>

          {/* Abas */}
          <nav className={`${card} flex gap-1 overflow-x-auto p-1.5 scrollbar-hide shrink-0`} role="tablist" aria-label="Seções de avaliações">
            {([
              { key: "lista", label: "Avaliações", icon: <ClipboardList size={15} />, badge: resumo?.total },
              { key: "fila", label: "Reavaliações", icon: <CalendarClock size={15} />, badge: pendentesFila },
            ] as const).map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={view === t.key}
                onClick={() => setView(t.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] sm:text-sm font-semibold transition ${view === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {t.icon}
                {t.label}
                {t.badge ? (
                  <span className={`rounded-full px-1.5 text-[9px] sm:text-[10px] font-bold ${view === t.key ? "bg-white/25 text-white" : t.key === "fila" && (resumo?.reavaliacoesVencidas ?? 0) > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Indicadores */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 shrink-0" aria-label="Indicadores">
            <Kpi label="Total de avaliações" value={String(resumo?.total ?? 0)} hint="Todas as avaliações registradas" />
            <Kpi label="Neste mês" value={String(resumo?.mes ?? 0)} hint="Realizadas desde o dia 1º" tone="green" />
            <Kpi label="Rascunhos" value={String(resumo?.rascunhos ?? 0)} hint="Pendentes de conclusão" tone={(resumo?.rascunhos ?? 0) > 0 ? "amber" : "default"} />
            <Kpi label="Reavaliações" value={String(resumo?.reavaliacoesProximas ?? 0)} hint={`${resumo?.reavaliacoesVencidas ?? 0} vencida(s) · próximos 30 dias`} tone={(resumo?.reavaliacoesVencidas ?? 0) > 0 ? "red" : "default"} />
            <div className="col-span-2 lg:col-span-1">
              <Kpi dark label="Potencial em planos" value={brl(resumo?.valorPlanos ?? 0)} hint="Soma dos planos de avaliações concluídas" />
            </div>
          </section>

          {/* Dinâmico (Lista ou Fila) */}
          <div className="flex-1 flex flex-col min-h-0">
            {view === "fila" ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <FilaReavaliacoes version={version} onOpen={abrir} onReavaliar={duplicar} />
              </div>
            ) : (
              <>
                <div className="mb-4 sm:mb-5 flex flex-nowrap overflow-x-auto gap-2.5 scrollbar-hide pb-2 shrink-0">
                  {PILLS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setStatusF(p.key)}
                      aria-pressed={statusF === p.key}
                      className={`rounded-xl border-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition shrink-0 whitespace-nowrap ${p.cls} ${statusF === p.key ? "shadow-md ring-2 ring-slate-900/10" : "opacity-80 hover:opacity-100"}`}
                    >
                      {p.label} ({contagem(p.key)})
                    </button>
                  ))}
                </div>

                {/* Filtro extra */}
                <div className="mb-4 flex flex-nowrap overflow-x-auto w-full gap-1.5 scrollbar-hide pb-1 shrink-0">
                  {[{ value: "TODOS", label: "Todos os tipos" }, ...TIPOS.map((t) => ({ value: t.value, label: t.label.split(" ")[0] }))].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTipoF(t.value as Tipo | "TODOS")}
                      className={`rounded-full px-3.5 py-1.5 text-[10px] sm:text-xs font-semibold transition shrink-0 whitespace-nowrap ${tipoF === t.value ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
                  <section className={`flex-1 min-w-0 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${current ? 'hidden lg:flex' : 'flex'}`} aria-label="Lista de avaliações">
                    <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
                      <table className="w-full min-w-[680px] text-left text-sm h-full">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50/50 sticky top-0 z-10">
                            <th className="px-4 py-3">Paciente</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3 hidden md:table-cell">Data</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 hidden lg:table-cell">Reavaliação</th>
                          </tr>
                        </thead>
                        <tbody className="align-top">
                          {loading &&
                            Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className="border-b border-slate-50">
                                <td colSpan={5} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                              </tr>
                            ))}
                          {!loading && error && (
                            <tr>
                              <td colSpan={5} className="px-4 py-14 text-center">
                                <p className="text-sm text-rose-600">{error}</p>
                                <button className={`${btnGhost} mt-3`} onClick={refreshAll}><RefreshCw size={14} /> Tentar de novo</button>
                              </td>
                            </tr>
                          )}
                          {!loading && !error && items.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-16 text-center">
                                <Star size={28} className="mx-auto text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                  {resumo && resumo.total === 0 ? "Nenhuma avaliação registrada ainda" : "Nenhuma avaliação encontrada"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {resumo && resumo.total === 0 ? "Comece registrando a primeira avaliação estética." : "Limpe a busca ou os filtros."}
                                </p>
                                {resumo && resumo.total === 0 && (
                                  <button className={`${btnBlue} mt-4`} onClick={() => setForm({})}><Plus size={15} /> Nova avaliação</button>
                                )}
                              </td>
                            </tr>
                          )}
                          {!loading &&
                            !error &&
                            items.map((a) => {
                              const re = reavaliacaoStatus(a);
                              const ativo = current?.id === a.id;
                              return (
                                <tr
                                  key={a.id}
                                  onClick={() => setSelected(a)}
                                  className={`cursor-pointer border-b border-slate-50 transition last:border-0 ${ativo ? "bg-blue-50/60" : "hover:bg-slate-50/70"}`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <Avatar nome={a.cliente?.nome ?? "?"} size={34} />
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900 text-[12px] sm:text-[13px]">{a.cliente?.nome ?? "Paciente"}</p>
                                        <p className="max-w-[260px] truncate text-[10px] sm:text-xs text-slate-500">{a.queixaPrincipal || "Sem queixa registrada"}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3"><Badge tone="info">{TIPOS.find((t) => t.value === a.tipo)?.label.split(" ")[0]}</Badge></td>
                                  <td className="px-4 py-3 text-[12px] sm:text-[13px] text-slate-700 hidden md:table-cell">{fmtDate(a.dataAvaliacao)}</td>
                                  <td className="px-4 py-3"><Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge></td>
                                  <td className="px-4 py-3 hidden lg:table-cell">
                                    {re ? (
                                      <div className="space-y-1">
                                        <p className="text-[11px] sm:text-xs text-slate-700">{fmtDate(a.dataReavaliacao)}</p>
                                        <Badge tone={re.tone}>{re.label}</Badge>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {!loading && !error && items.length > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 text-[10px] sm:text-xs text-slate-500 shrink-0">
                        <span>Mostrando {items.length} de {total}</span>
                        {items.length < total && (
                          <button className={`${btnGhost} !py-1.5 text-xs`} onClick={() => setLimit((l) => l + 100)}>Carregar mais</button>
                        )}
                      </div>
                    )}
                  </section>

                  {current && (
                    <div className={`w-full lg:w-[400px] shrink-0 flex flex-col min-h-0 ${current ? 'flex' : 'hidden lg:flex'}`}>
                      <button 
                        className="lg:hidden mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors" 
                        onClick={() => setSelected(null)}
                      >
                        <ChevronLeft className="w-4 h-4"/> Voltar para lista
                      </button>
                      <DetailPanel
                        a={current}
                        catalogo={catalogo}
                        onEdit={() => setForm({ item: current })}
                        onStatus={(st) => mudarStatus(current, st)}
                        onDuplicate={() => duplicar(current)}
                        onDelete={() => excluir(current)}
                        onOpen={setSelected}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {form && <AvaliacaoForm inicial={form.item} catalogo={catalogo} onSave={salvar} onClose={() => setForm(null)} />}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      <Toasts list={toasts} />
    </AppShell>
  );
}