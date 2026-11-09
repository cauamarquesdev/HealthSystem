"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Check,
  Cpu,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { AppShell } from "../../components/AppShell"; // Ajuste o caminho se necessário

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ENDPOINTS = {
  insumos: "/api/recursos/insumos",
  movimentacoes: "/api/recursos/movimentacoes", 
  aparelhos: "/api/recursos/aparelhos",
  biosseguranca: "/api/recursos/biosseguranca",
  documentos: "/api/recursos/documentos",
  compras: "/api/recursos/compras",
} as const;

/** Token de autenticação. */
function getToken(): string | null {
  try {
    return localStorage.getItem("token") ?? localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════════════════ */

type Base = { id: string };

type Insumo = Base & {
  nome: string;
  fabricante?: string;
  categoria?: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  custoUnitario: number;
  lote?: string;
  validade?: string | null;
};

type Movimentacao = Base & {
  insumoId: string;
  insumoNome?: string;
  tipo: "ENTRADA" | "SAIDA" | "DESCARTE";
  quantidade: number;
  lote?: string;
  motivo?: string;
  createdAt: string;
};

type Aparelho = Base & {
  nome: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  sala?: string;
  status: "OPERACIONAL" | "MANUTENCAO" | "INATIVO";
  ultimaManutencao?: string | null;
  proximaCalibracao?: string | null;
  observacao?: string;
};

type Biosseguranca = Base & {
  titulo: string;
  tipo: string;
  responsavel?: string;
  lote?: string;
  ultimaExecucao?: string | null;
  proximaExecucao?: string | null;
  observacao?: string;
};

type Documento = Base & {
  nome: string;
  tipo: string;
  numero?: string;
  orgaoEmissor?: string;
  emissao?: string | null;
  validade?: string | null;
  observacao?: string;
};

type Compra = Base & {
  fornecedor: string;
  insumoId?: string;
  insumoNome?: string;
  quantidade: number;
  custoUnitario: number;
  status: "RASCUNHO" | "PEDIDO" | "RECEBIDA" | "CANCELADA";
  dataPedido?: string | null;
  previsaoEntrega?: string | null;
  observacao?: string;
};

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const num = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
};

const fmtDateTime = (v: string) => {
  const d = new Date(v);
  return isNaN(+d)
    ? "—"
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

/** Dias até a data (negativo = vencido). null = sem data. */
function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - base) / 86400000);
}

const unwrap = <T,>(json: unknown): T[] => {
  if (Array.isArray(json)) return json as T[];
  const j = json as { data?: unknown; items?: unknown } | null;
  if (j && Array.isArray(j.data)) return j.data as T[];
  if (j && Array.isArray(j.items)) return j.items as T[];
  return [];
};

async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const baseUrl = API_URL.replace(/\/+$/, "");

  const baseWithoutApi = baseUrl.replace(/\/api$/, "");
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  const apiPath = normalizedPath === "/api" || normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api${normalizedPath}`;

  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${baseWithoutApi}${apiPath}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body?.message)
        ? body.message.join(", ")
        : body?.message ?? msg;
    } catch {
      //
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}


/** Remove strings vazias e converte números/datas antes de enviar. */
function cleanPayload(values: Record<string, string>, fields: Field[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === "number") out[f.key] = raw === "" || raw == null ? 0 : Number(raw);
    else if (f.type === "date") out[f.key] = raw ? raw : null;
    else out[f.key] = raw ?? "";
  }
  return out;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ═══════════════════════════════════════════════════════════════
   HOOK DE COLEÇÃO (CRUD genérico)
   ═══════════════════════════════════════════════════════════════ */

function useCollection<T extends Base>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(unwrap<T>(await api(path)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (body: unknown) => {
    await api(path, { method: "POST", body: JSON.stringify(body) });
    await load();
  }, [path, load]);

  const update = useCallback(async (id: string, body: unknown) => {
    await api(`${path}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  }, [path, load]);

  const remove = useCallback(async (id: string) => {
    await api(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }, [path, load]);

  return { items, loading, error, load, create, update, remove };
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
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

function IconBtn({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
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

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`${card} flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden`}>
        <div className="mb-4 sm:mb-5 flex items-start justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{subtitle}</p>}
          </div>
          <IconBtn label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
           {children}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onClose,
}: {
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Confirmar exclusão" onClose={onClose}>
      <p className="px-6 py-5 text-sm text-slate-600">{message}</p>
      <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-100 px-4 sm:px-6 py-4">
        <button className={`${btnGhost} w-full sm:w-auto`} onClick={onClose}>
          Cancelar
        </button>
        <button
          className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Excluir
        </button>
      </div>
    </Modal>
  );
}

/* ── Formulário genérico ─────────────────────────────────────── */

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  span?: 1 | 2;
  step?: string;
  placeholder?: string;
};

function FormModal({
  title,
  subtitle,
  fields,
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onClose,
}: {
  title: string;
  subtitle?: string;
  fields: Field[];
  initial: Record<string, string>;
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        setErr(`Preencha o campo "${f.label}".`);
        return;
      }
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-6">
        {fields.map((f) => (
          <label key={f.key} className={`block ${f.span === 2 ? "sm:col-span-2" : ""}`}>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {f.label}
              {f.required && <span className="text-rose-500"> *</span>}
            </span>
            {f.type === "select" ? (
              <select
                className={inputCls}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                {!f.required && <option value="">Selecione…</option>}
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                className={inputCls}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            ) : (
              <input
                className={inputCls}
                type={f.type ?? "text"}
                step={f.type === "number" ? f.step ?? "any" : undefined}
                min={f.type === "number" ? 0 : undefined}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
        {err && (
          <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {err}
          </p>
        )}
        <div className="mt-2 flex flex-col sm:flex-row justify-end gap-2 sm:col-span-2">
          <button type="button" className={`${btnGhost} w-full sm:w-auto`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={`${btnPrimary} w-full sm:w-auto justify-center`} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Tabela genérica ─────────────────────────────────────────── */

type Column<T> = { header: string; render: (row: T) => React.ReactNode; className?: string };

function DataTable<T extends Base>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyText,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyText: string;
  actions?: (row: T) => React.ReactNode;
}) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
              {columns.map((c) => (
                <th key={c.header} className={`px-4 py-3 whitespace-nowrap ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center">
                  <p className="text-sm text-rose-600">{error}</p>
                  <button className={`${btnGhost} mt-3`} onClick={onRetry}>
                    <RefreshCw size={14} /> Tentar de novo
                  </button>
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-14 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  {columns.map((c) => (
                    <td key={c.header} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                      {c.render(r)}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right">{actions(r)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toolbar({
  query,
  setQuery,
  placeholder,
  children,
  onExport,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
  children?: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="relative w-full md:max-w-xs">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputCls} pl-9 w-full`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={placeholder}
        />
      </div>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
        {children}
      </div>
      {onExport && (
        <button className={`${btnGhost} w-full md:w-auto md:ml-auto justify-center shrink-0`} onClick={onExport}>
          <Download size={14} /> Exportar CSV
        </button>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
        active ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

const matches = (q: string, ...vals: (string | undefined)[]) =>
  !q.trim() || vals.some((v) => (v ?? "").toLowerCase().includes(q.trim().toLowerCase()));

/* ── Toasts ──────────────────────────────────────────────────── */

type ToastMsg = { id: number; text: string; tone: "ok" | "err" };

function Toasts({ list }: { list: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            t.tone === "ok" ? "bg-slate-900" : "bg-rose-600"
          }`}
        >
          {t.tone === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REGRAS DE NEGÓCIO / STATUS
   ═══════════════════════════════════════════════════════════════ */

const ALERTA_DIAS = 30;

function validadeStatus(v?: string | null): { label: string; tone: Tone } {
  const d = daysUntil(v);
  if (d === null) return { label: "Sem validade", tone: "neutral" };
  if (d < 0) return { label: `Vencido há ${Math.abs(d)}d`, tone: "danger" };
  if (d <= ALERTA_DIAS) return { label: `Vence em ${d}d`, tone: "warning" };
  return { label: "Em dia", tone: "success" };
}

const insumoCritico = (i: Insumo) => {
  const d = daysUntil(i.validade);
  return i.estoqueAtual <= i.estoqueMinimo || (d !== null && d <= ALERTA_DIAS);
};

/* ═══════════════════════════════════════════════════════════════
   ABA: INSUMOS E ESTOQUE
   ═══════════════════════════════════════════════════════════════ */

const insumoFields: Field[] = [
  { key: "nome", label: "Nome do insumo", required: true, span: 2 },
  { key: "fabricante", label: "Fabricante" },
  { key: "categoria", label: "Categoria", placeholder: "Ex.: Injetáveis, Descartáveis" },
  { key: "unidade", label: "Unidade", required: true, placeholder: "un, ml, cx…" },
  { key: "custoUnitario", label: "Custo unitário (R$)", type: "number", step: "0.01" },
  { key: "estoqueAtual", label: "Estoque inicial", type: "number" },
  { key: "estoqueMinimo", label: "Estoque mínimo", type: "number" },
  { key: "lote", label: "Lote" },
  { key: "validade", label: "Validade", type: "date" },
];

const movFields = (tipo: Movimentacao["tipo"]): Field[] => [
  { key: "quantidade", label: "Quantidade", type: "number", required: true },
  ...(tipo === "ENTRADA"
    ? ([
        { key: "lote", label: "Lote" },
        { key: "validade", label: "Validade do lote", type: "date" },
      ] as Field[])
    : []),
  {
    key: "motivo",
    label: tipo === "DESCARTE" ? "Motivo do descarte" : "Observação",
    type: "textarea",
    span: 2,
    required: tipo === "DESCARTE",
  },
];

function InsumosTab({
  data,
  movs,
  reloadMovs,
  toast,
  openForm,
  openConfirm,
  registerCreate,
}: {
  data: ReturnType<typeof useCollection<Insumo>>;
  movs: ReturnType<typeof useCollection<Movimentacao>>;
  reloadMovs: () => void;
  toast: (t: string, tone?: "ok" | "err") => void;
  openForm: (p: FormProps) => void;
  openConfirm: (p: ConfirmProps) => void;
  registerCreate: (fn: () => void) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [soCriticos, setSoCriticos] = useState(false);

  const categorias = useMemo(
    () => ["Todos", ...Array.from(new Set(data.items.map((i) => i.categoria).filter(Boolean) as string[]))],
    [data.items],
  );

  const rows = data.items.filter(
    (i) =>
      matches(q, i.nome, i.fabricante, i.lote, i.categoria) &&
      (cat === "Todos" || i.categoria === cat) &&
      (!soCriticos || insumoCritico(i)),
  );

  const novo = useCallback(
    () =>
      openForm({
        title: "Novo insumo",
        fields: insumoFields,
        initial: { unidade: "un", estoqueAtual: "0", estoqueMinimo: "0", custoUnitario: "0" },
        onSubmit: async (v) => {
          await data.create(cleanPayload(v, insumoFields));
          toast("Insumo cadastrado");
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.create],
  );
  const createRef = useRef(novo);
  createRef.current = novo;
  const stableCreate = useCallback(() => createRef.current(), []);

  useEffect(() => {
    registerCreate(stableCreate);
  }, [registerCreate, stableCreate]);

  const editar = (i: Insumo) =>
    openForm({
      title: "Editar insumo",
      fields: insumoFields.filter((f) => f.key !== "estoqueAtual"),
      initial: {
        nome: i.nome,
        fabricante: i.fabricante ?? "",
        categoria: i.categoria ?? "",
        unidade: i.unidade,
        custoUnitario: String(i.custoUnitario),
        estoqueMinimo: String(i.estoqueMinimo),
        lote: i.lote ?? "",
        validade: toDateInput(i.validade),
      },
      onSubmit: async (v) => {
        await data.update(i.id, cleanPayload(v, insumoFields.filter((f) => f.key !== "estoqueAtual")));
        toast("Insumo atualizado");
      },
    });

  const movimentar = (i: Insumo, tipo: Movimentacao["tipo"]) =>
    openForm({
      title: { ENTRADA: "Registrar entrada", SAIDA: "Registrar baixa", DESCARTE: "Registrar descarte" }[tipo],
      subtitle: `${i.nome} · estoque atual ${num(i.estoqueAtual)} ${i.unidade}`,
      fields: movFields(tipo),
      initial: { quantidade: "", lote: i.lote ?? "", validade: "", motivo: "" },
      submitLabel: "Confirmar",
      onSubmit: async (v) => {
        const qtd = Number(v.quantidade);
        if (!(qtd > 0)) throw new Error("Informe uma quantidade maior que zero.");
        if (tipo !== "ENTRADA" && qtd > i.estoqueAtual) throw new Error("Quantidade maior que o estoque disponível.");
        await api(ENDPOINTS.movimentacoes, {
          method: "POST",
          body: JSON.stringify({
            insumoId: i.id,
            tipo,
            quantidade: qtd,
            lote: v.lote || undefined,
            validade: v.validade || undefined,
            motivo: v.motivo || undefined,
          }),
        });
        await Promise.all([data.load(), movs.load()]);
        reloadMovs();
        toast("Movimentação registrada");
      },
    });

  const excluir = (i: Insumo) =>
    openConfirm({
      message: `Excluir "${i.nome}"? O histórico de movimentações pode ser afetado.`,
      onConfirm: async () => {
        await data.remove(i.id);
        toast("Insumo excluído");
      },
    });

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <Toolbar
          query={q}
          setQuery={setQ}
          placeholder="Nome, fabricante, lote ou categoria"
          onExport={() =>
            downloadCsv(
              "insumos.csv",
              rows.map((i) => ({
                Nome: i.nome,
                Fabricante: i.fabricante,
                Categoria: i.categoria,
                Estoque: i.estoqueAtual,
                Unidade: i.unidade,
                Minimo: i.estoqueMinimo,
                Custo: i.custoUnitario,
                Lote: i.lote,
                Validade: fmtDate(i.validade),
              })),
            )
          }
        >
          {categorias.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
          <label className="sm:ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 mt-2 sm:mt-0 w-full sm:w-auto shrink-0 whitespace-nowrap">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 shrink-0"
              checked={soCriticos}
              onChange={(e) => setSoCriticos(e.target.checked)}
            />
            Só críticos
          </label>
        </Toolbar>

        <DataTable
          columns={[
            {
              header: "Insumo",
              render: (i) => (
                <div className="min-w-[150px]">
                  <p className="font-semibold text-slate-900 truncate">{i.nome}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {[i.fabricante, i.lote && `Lote ${i.lote}`, i.categoria].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ),
            },
            {
              header: "Estoque",
              render: (i) => {
                const pct = i.estoqueMinimo > 0 ? Math.min(100, (i.estoqueAtual / (i.estoqueMinimo * 2)) * 100) : 100;
                const baixo = i.estoqueAtual <= i.estoqueMinimo;
                return (
                  <div className="w-24 sm:w-32">
                    <p className={`text-[13px] sm:text-sm font-bold ${baixo ? "text-rose-600" : "text-slate-900"}`}>
                      {num(i.estoqueAtual)} <span className="text-[10px] sm:text-xs font-medium text-slate-500">{i.unidade}</span>
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${baixo ? "bg-rose-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400">mín. {num(i.estoqueMinimo)}</p>
                  </div>
                );
              },
            },
            {
              header: "Validade",
              render: (i) => {
                const s = validadeStatus(i.validade);
                return (
                  <div className="space-y-1">
                    <p className="text-[13px] sm:text-sm text-slate-700">{fmtDate(i.validade)}</p>
                    {i.validade && <Badge tone={s.tone}>{s.label}</Badge>}
                  </div>
                );
              },
            },
            {
              header: "Custo",
              render: (i) => (
                <div>
                  <p className="text-[13px] sm:text-sm font-semibold text-slate-900 whitespace-nowrap">{brl(i.custoUnitario)}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap">total {brl(i.custoUnitario * i.estoqueAtual)}</p>
                </div>
              ),
            },
            {
              header: "Movimentar",
              render: (i) => (
                <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                  <button className={`${btnGhost} w-full sm:w-auto justify-center !px-2 sm:!px-2.5 !py-1 sm:!py-1.5 text-[11px] sm:text-xs`} onClick={() => movimentar(i, "ENTRADA")}>
                    <ArrowDownToLine size={13} /> <span className="hidden sm:inline">Entrada</span>
                  </button>
                  <button className={`${btnGhost} w-full sm:w-auto justify-center !px-2 sm:!px-2.5 !py-1 sm:!py-1.5 text-[11px] sm:text-xs`} onClick={() => movimentar(i, "SAIDA")}>
                    <ArrowUpFromLine size={13} /> <span className="hidden sm:inline">Baixa</span>
                  </button>
                  <button
                    className={`${btnGhost} w-full sm:w-auto justify-center !px-2 sm:!px-2.5 !py-1 sm:!py-1.5 text-[11px] sm:text-xs hover:!text-rose-600`}
                    onClick={() => movimentar(i, "DESCARTE")}
                  >
                    <Trash2 size={13} /> <span className="hidden sm:inline">Descarte</span>
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          loading={data.loading}
          error={data.error}
          onRetry={data.load}
          emptyText={
            data.items.length === 0
              ? "Nenhum insumo cadastrado. Use “Novo insumo” para começar."
              : "Nenhum insumo encontrado. Limpe a busca ou os filtros."
          }
          actions={(i) => (
            <div className="flex justify-end gap-1">
              <IconBtn label="Editar" onClick={() => editar(i)}>
                <Pencil size={15} />
              </IconBtn>
              <IconBtn label="Excluir" danger onClick={() => excluir(i)}>
                <Trash2 size={15} />
              </IconBtn>
            </div>
          )}
        />
      </div>

      <aside className={`${card} h-fit p-4 sm:p-5 w-full xl:w-[320px] shrink-0`}>
        <h3 className="text-[15px] sm:text-base font-bold text-slate-900">Últimas movimentações</h3>
        <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Rastreabilidade de entradas, baixas e descartes</p>
        <ul className="mt-4 space-y-3">
          {movs.loading && <li className="h-4 animate-pulse rounded bg-slate-100" />}
          {!movs.loading && movs.items.length === 0 && (
            <li className="text-[11px] sm:text-xs text-slate-500">Nenhuma movimentação ainda.</li>
          )}
          {movs.items.slice(0, 10).map((m) => {
            const nome = m.insumoNome ?? data.items.find((i) => i.id === m.insumoId)?.nome ?? "Insumo";
            const tone: Tone = m.tipo === "ENTRADA" ? "success" : m.tipo === "SAIDA" ? "info" : "danger";
            return (
              <li key={m.id} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] sm:text-sm font-semibold text-slate-800">{nome}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    {fmtDateTime(m.createdAt)}
                    {m.lote ? ` · Lote ${m.lote}` : ""}
                  </p>
                </div>
                <Badge tone={tone}>
                  {m.tipo === "ENTRADA" ? "+" : "−"}
                  {num(m.quantidade)}
                </Badge>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABA: APARELHOS
   ═══════════════════════════════════════════════════════════════ */

const aparelhoStatus = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "MANUTENCAO", label: "Em manutenção" },
  { value: "INATIVO", label: "Inativo" },
];

const aparelhoFields: Field[] = [
  { key: "nome", label: "Aparelho", required: true, span: 2 },
  { key: "fabricante", label: "Fabricante" },
  { key: "modelo", label: "Modelo" },
  { key: "numeroSerie", label: "Nº de série" },
  { key: "sala", label: "Sala" },
  { key: "status", label: "Status", type: "select", required: true, options: aparelhoStatus },
  { key: "ultimaManutencao", label: "Última manutenção", type: "date" },
  { key: "proximaCalibracao", label: "Próxima calibração", type: "date" },
  { key: "observacao", label: "Observações", type: "textarea", span: 2 },
];

/* ═══════════════════════════════════════════════════════════════
   ABA: BIOSSEGURANÇA
   ═══════════════════════════════════════════════════════════════ */

const bioTipos = ["Esterilização (autoclave)", "Teste biológico", "Limpeza terminal", "Descarte de resíduos", "Outro"].map(
  (v) => ({ value: v, label: v }),
);

const bioFields: Field[] = [
  { key: "titulo", label: "Rotina / registro", required: true, span: 2 },
  { key: "tipo", label: "Tipo", type: "select", required: true, options: bioTipos },
  { key: "responsavel", label: "Responsável" },
  { key: "lote", label: "Lote / ciclo" },
  { key: "ultimaExecucao", label: "Última execução", type: "date" },
  { key: "proximaExecucao", label: "Próxima execução", type: "date" },
  { key: "observacao", label: "Observações", type: "textarea", span: 2 },
];

function prazoStatus(v?: string | null, vencidoLabel = "Atrasado"): { label: string; tone: Tone } {
  const d = daysUntil(v);
  if (d === null) return { label: "Sem prazo", tone: "neutral" };
  if (d < 0) return { label: `${vencidoLabel} há ${Math.abs(d)}d`, tone: "danger" };
  if (d <= 7) return { label: d === 0 ? "Hoje" : `Em ${d}d`, tone: "warning" };
  return { label: "Em dia", tone: "success" };
}

/* ═══════════════════════════════════════════════════════════════
   ABA: LICENÇAS E DOCUMENTOS
   ═══════════════════════════════════════════════════════════════ */

const docTipos = [
  "Alvará de funcionamento",
  "Licença sanitária",
  "AFE / ANVISA",
  "CNES",
  "Responsável técnico",
  "Corpo de Bombeiros",
  "Contrato",
  "Outro",
].map((v) => ({ value: v, label: v }));

const docFields: Field[] = [
  { key: "nome", label: "Documento", required: true, span: 2 },
  { key: "tipo", label: "Tipo", type: "select", required: true, options: docTipos },
  { key: "numero", label: "Número / protocolo" },
  { key: "orgaoEmissor", label: "Órgão emissor" },
  { key: "emissao", label: "Emissão", type: "date" },
  { key: "validade", label: "Validade", type: "date" },
  { key: "observacao", label: "Observações", type: "textarea", span: 2 },
];

/* ═══════════════════════════════════════════════════════════════
   ABA: COMPRAS
   ═══════════════════════════════════════════════════════════════ */

const compraStatus = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "PEDIDO", label: "Pedido enviado" },
  { value: "RECEBIDA", label: "Recebida" },
  { value: "CANCELADA", label: "Cancelada" },
];

const compraTone: Record<Compra["status"], Tone> = {
  RASCUNHO: "neutral",
  PEDIDO: "info",
  RECEBIDA: "success",
  CANCELADA: "danger",
};

/* ═══════════════════════════════════════════════════════════════
   ABA GENÉRICA (aparelhos, biossegurança, documentos, compras)
   ═══════════════════════════════════════════════════════════════ */

type FormProps = {
  title: string;
  subtitle?: string;
  fields: Field[];
  initial: Record<string, string>;
  submitLabel?: string;
  onSubmit: (v: Record<string, string>) => Promise<void>;
};
type ConfirmProps = { message: string; onConfirm: () => Promise<void> };

function CrudTab<T extends Base>({
  data,
  singular,
  fields,
  columns,
  searchOf,
  toRow,
  emptyText,
  csvName,
  toCsv,
  filters,
  extraActions,
  toast,
  openForm,
  openConfirm,
  registerCreate,
  beforeSave,
}: {
  data: ReturnType<typeof useCollection<T>>;
  singular: string;
  fields: Field[];
  columns: Column<T>[];
  searchOf: (r: T) => (string | undefined)[];
  toRow: (r: T) => Record<string, string>;
  emptyText: string;
  csvName: string;
  toCsv: (r: T) => Record<string, unknown>;
  filters?: { label: string; test: (r: T) => boolean }[];
  extraActions?: (r: T) => React.ReactNode;
  toast: (t: string, tone?: "ok" | "err") => void;
  openForm: (p: FormProps) => void;
  openConfirm: (p: ConfirmProps) => void;
  registerCreate: (fn: () => void) => void;
  beforeSave?: (payload: Record<string, unknown>) => Record<string, unknown>;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState(0);

  const rows = data.items.filter((r) => matches(q, ...searchOf(r)) && (!filters || filters[f].test(r)));

  const defaults = useMemo(() => {
    const d: Record<string, string> = {};
    fields.forEach((fl) => {
      d[fl.key] = fl.type === "select" && fl.required && fl.options ? fl.options[0].value : "";
    });
    return d;
  }, [fields]);

  const payload = (v: Record<string, string>) => {
    const p = cleanPayload(v, fields);
    return beforeSave ? beforeSave(p) : p;
  };

  const novo = useCallback(
    () =>
      openForm({
        title: `Novo ${singular}`,
        fields,
        initial: defaults,
        onSubmit: async (v) => {
          await data.create(payload(v));
          toast("Cadastro salvo");
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.create, fields, defaults],
  );
  const createRef = useRef(novo);
  createRef.current = novo;
  const stableCreate = useCallback(() => createRef.current(), []);

  useEffect(() => {
    registerCreate(stableCreate);
  }, [registerCreate, stableCreate]);

  return (
    <div className="w-full min-w-0">
      <Toolbar
        query={q}
        setQuery={setQ}
        placeholder="Buscar…"
        onExport={() => downloadCsv(csvName, rows.map(toCsv))}
      >
        {filters && (
          <div className="flex flex-nowrap gap-1.5 pb-2 md:pb-0 overflow-x-auto scrollbar-hide">
            {filters.map((fl, idx) => (
              <Chip key={fl.label} active={f === idx} onClick={() => setF(idx)}>
                {fl.label}
              </Chip>
            ))}
          </div>
        )}
      </Toolbar>
      <DataTable
        columns={columns}
        rows={rows}
        loading={data.loading}
        error={data.error}
        onRetry={data.load}
        emptyText={data.items.length === 0 ? emptyText : "Nada encontrado. Limpe a busca ou os filtros."}
        actions={(r) => (
          <div className="flex items-center justify-end gap-1">
            {extraActions?.(r)}
            <IconBtn
              label="Editar"
              onClick={() =>
                openForm({
                  title: `Editar ${singular}`,
                  fields,
                  initial: toRow(r),
                  onSubmit: async (v) => {
                    await data.update(r.id, payload(v));
                    toast("Alterações salvas");
                  },
                })
              }
            >
              <Pencil size={15} />
            </IconBtn>
            <IconBtn
              label="Excluir"
              danger
              onClick={() =>
                openConfirm({
                  message: `Excluir este registro de ${singular}? Essa ação não pode ser desfeita.`,
                  onConfirm: async () => {
                    await data.remove(r.id);
                    toast("Registro excluído");
                  },
                })
              }
            >
              <Trash2 size={15} />
            </IconBtn>
          </div>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA
   ═══════════════════════════════════════════════════════════════ */

type TabKey = "insumos" | "aparelhos" | "biosseguranca" | "documentos" | "compras";

function RecursosContent() {
  const insumos = useCollection<Insumo>(ENDPOINTS.insumos);
  const movs = useCollection<Movimentacao>(ENDPOINTS.movimentacoes);
  const aparelhos = useCollection<Aparelho>(ENDPOINTS.aparelhos);
  const bio = useCollection<Biosseguranca>(ENDPOINTS.biosseguranca);
  const docs = useCollection<Documento>(ENDPOINTS.documentos);
  const compras = useCollection<Compra>(ENDPOINTS.compras);

  const [tab, setTab] = useState<TabKey>("insumos");
  const [form, setForm] = useState<FormProps | null>(null);
  const [confirm, setConfirm] = useState<ConfirmProps | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const createFns = useRef<Partial<Record<TabKey, () => void>>>({});

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const registerCreate = useCallback(
  (key: TabKey, fn: () => void) => {
    createFns.current[key] = fn;
  },
  [],
);

const regInsumos = useCallback(
  (fn: () => void) => registerCreate("insumos", fn),
  [registerCreate],
);

const regAparelhos = useCallback(
  (fn: () => void) => registerCreate("aparelhos", fn),
  [registerCreate],
);

const regBio = useCallback(
  (fn: () => void) => registerCreate("biosseguranca", fn),
  [registerCreate],
);

const regDocs = useCallback(
  (fn: () => void) => registerCreate("documentos", fn),
  [registerCreate],
);

const regCompras = useCallback(
  (fn: () => void) => registerCreate("compras", fn),
  [registerCreate],
);


  /* ── Indicadores ── */
  const kpi = useMemo(() => {
    const valor = insumos.items.reduce((s, i) => s + i.custoUnitario * i.estoqueAtual, 0);
    const criticos = insumos.items.filter(insumoCritico).length;
    const operacionais = aparelhos.items.filter((a) => a.status === "OPERACIONAL").length;
    const calibProx = aparelhos.items.filter((a) => {
      const d = daysUntil(a.proximaCalibracao);
      return d !== null && d <= ALERTA_DIAS;
    }).length;
    const docsAcao = docs.items.filter((d) => {
      const x = daysUntil(d.validade);
      return x !== null && x <= ALERTA_DIAS;
    }).length;
    const bioAtraso = bio.items.filter((b) => {
      const x = daysUntil(b.proximaExecucao);
      return x !== null && x < 0;
    }).length;
    const totalConf = docs.items.length + bio.items.length;
    const pendentes = docsAcao + bioAtraso;
    const conformidade = totalConf === 0 ? 100 : Math.round(((totalConf - pendentes) / totalConf) * 100);
    return { valor, criticos, operacionais, calibProx, docsAcao, bioAtraso, conformidade, pendentes };
  }, [insumos.items, aparelhos.items, docs.items, bio.items]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "insumos", label: "Insumos e estoque", icon: <Boxes size={15} />, count: insumos.items.length },
    { key: "aparelhos", label: "Aparelhos", icon: <Cpu size={15} />, count: aparelhos.items.length },
    { key: "biosseguranca", label: "Biossegurança", icon: <ShieldCheck size={15} />, count: bio.items.length },
    { key: "documentos", label: "Licenças", icon: <FileText size={15} />, count: docs.items.length },
    { key: "compras", label: "Compras", icon: <ShoppingCart size={15} />, count: compras.items.length },
  ];

  const novoLabel: Record<TabKey, string> = {
    insumos: "Novo insumo",
    aparelhos: "Novo aparelho",
    biosseguranca: "Novo registro",
    documentos: "Novo documento",
    compras: "Nova compra",
  };

  const insumoOptions = insumos.items.map((i) => ({ value: i.id, label: i.nome }));
  const compraFields: Field[] = [
    { key: "fornecedor", label: "Fornecedor", required: true, span: 2 },
    { key: "insumoId", label: "Insumo", type: "select", options: insumoOptions, span: 2 },
    { key: "quantidade", label: "Quantidade", type: "number", required: true },
    { key: "custoUnitario", label: "Custo unitário (R$)", type: "number", step: "0.01" },
    { key: "status", label: "Status", type: "select", required: true, options: compraStatus },
    { key: "dataPedido", label: "Data do pedido", type: "date" },
    { key: "previsaoEntrega", label: "Previsão de entrega", type: "date" },
    { key: "observacao", label: "Observações", type: "textarea", span: 2 },
  ];

  const receberCompra = (c: Compra) =>
    setConfirm({
      message: `Confirmar o recebimento de ${num(c.quantidade)} un de "${c.insumoNome ?? "insumo"}"? O estoque será atualizado.`,
      onConfirm: async () => {
        try {
          if (c.insumoId) {
            await api(ENDPOINTS.movimentacoes, {
              method: "POST",
              body: JSON.stringify({
                insumoId: c.insumoId,
                tipo: "ENTRADA",
                quantidade: c.quantidade,
                motivo: `Recebimento de compra — ${c.fornecedor}`,
              }),
            });
          }
          await compras.update(c.id, { status: "RECEBIDA" });
          await Promise.all([insumos.load(), movs.load()]);
          toast("Compra recebida e estoque atualizado");
        } catch (e) {
          toast(e instanceof Error ? e.message : "Falha ao receber compra", "err");
          throw e;
        }
      },
    });

  /* Erros de ação viram toast em vez de quebrar o modal de confirmação */
  const safeConfirm = (p: ConfirmProps) =>
    setConfirm({
      ...p,
      onConfirm: async () => {
        try {
          await p.onConfirm();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Não foi possível concluir", "err");
        }
      },
    });

  const common = { toast, openForm: setForm, openConfirm: safeConfirm };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 flex-1 flex flex-col min-h-0">
        {/* Cabeçalho Interno */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 shrink-0">
          <div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Recursos da Clínica</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Estoque com rastreio de lote, aparelhos, biossegurança, licenças e compras.
            </p>
          </div>
          <button className={`${btnPrimary} w-full md:w-auto justify-center whitespace-nowrap shrink-0`} onClick={() => createFns.current[tab]?.()}>
            <Plus size={16} /> {novoLabel[tab]}
          </button>
        </header>

        {/* Indicadores */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0" aria-label="Indicadores">
          <Kpi
            label="Valor em estoque"
            value={brl(kpi.valor)}
            hint={`${insumos.items.length} itens cadastrados`}
            icon={<Wallet size={15} />}
            tone="blue"
          />
          <Kpi
            label="Itens críticos"
            value={String(kpi.criticos)}
            hint={`Baixo ou vence em ${ALERTA_DIAS}d`}
            icon={<AlertTriangle size={15} />}
            tone={kpi.criticos > 0 ? "red" : "blue"}
            red={kpi.criticos > 0}
          />
          <Kpi
            label="Aparelhos operacionais"
            value={`${kpi.operacionais}/${aparelhos.items.length}`}
            hint={`${kpi.calibProx} calibração próxima`}
            icon={<Cpu size={15} />}
            tone="blue"
          />
          <Kpi
            label="Conformidade"
            value={`${kpi.conformidade}%`}
            hint={`${kpi.pendentes} pendências ativas`}
            icon={<ShieldCheck size={15} />}
            tone={kpi.pendentes > 0 ? "amber" : "green"}
          />
        </section>

        {/* Abas */}
        <nav
          className={`${card} flex gap-1 overflow-x-auto scrollbar-hide p-1.5 w-full shrink-0`}
          role="tablist"
          aria-label="Seções de recursos"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-[13px] font-bold transition whitespace-nowrap ${
                tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black ${tab === t.key ? "bg-blue-700/50 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </nav>

        {/* Conteúdo Dinâmico */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col w-full">
          {tab === "insumos" && (
            <InsumosTab
              data={insumos}
              movs={movs}
              reloadMovs={() => {}}
              registerCreate={regInsumos}
              {...common}
            />
          )}

          {tab === "aparelhos" && (
            <CrudTab<Aparelho>
              data={aparelhos}
              singular="aparelho"
              fields={aparelhoFields}
              registerCreate={regAparelhos}
              emptyText="Nenhum aparelho cadastrado. Use “Novo aparelho” para começar."
              csvName="aparelhos.csv"
              searchOf={(a) => [a.nome, a.fabricante, a.modelo, a.numeroSerie, a.sala]}
              filters={[
                { label: "Todos", test: () => true },
                { label: "Operacionais", test: (a) => a.status === "OPERACIONAL" },
                { label: "Em manutenção", test: (a) => a.status === "MANUTENCAO" },
                {
                  label: "Calibração próxima",
                  test: (a) => {
                    const d = daysUntil(a.proximaCalibracao);
                    return d !== null && d <= ALERTA_DIAS;
                  },
                },
              ]}
              toRow={(a) => ({
                nome: a.nome,
                fabricante: a.fabricante ?? "",
                modelo: a.modelo ?? "",
                numeroSerie: a.numeroSerie ?? "",
                sala: a.sala ?? "",
                status: a.status,
                ultimaManutencao: toDateInput(a.ultimaManutencao),
                proximaCalibracao: toDateInput(a.proximaCalibracao),
                observacao: a.observacao ?? "",
              })}
              toCsv={(a) => ({
                Aparelho: a.nome,
                Fabricante: a.fabricante,
                Modelo: a.modelo,
                Serie: a.numeroSerie,
                Sala: a.sala,
                Status: a.status,
                ProximaCalibracao: fmtDate(a.proximaCalibracao),
              })}
              columns={[
                {
                  header: "Aparelho",
                  render: (a) => (
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{a.nome}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                        {[a.fabricante, a.modelo, a.numeroSerie && `S/N ${a.numeroSerie}`].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                  ),
                },
                { header: "Sala", render: (a) => <span className="text-slate-700 whitespace-nowrap">{a.sala || "—"}</span> },
                {
                  header: "Status",
                  render: (a) => (
                    <Badge tone={a.status === "OPERACIONAL" ? "success" : a.status === "MANUTENCAO" ? "warning" : "neutral"}>
                      {aparelhoStatus.find((s) => s.value === a.status)?.label}
                    </Badge>
                  ),
                },
                { header: "Últ. manutenção", render: (a) => <span className="whitespace-nowrap">{fmtDate(a.ultimaManutencao)}</span> },
                {
                  header: "Próx. calibração",
                  render: (a) => {
                    const s = validadeStatus(a.proximaCalibracao);
                    return (
                      <div className="space-y-1 whitespace-nowrap">
                        <p>{fmtDate(a.proximaCalibracao)}</p>
                        {a.proximaCalibracao && <Badge tone={s.tone}>{s.label}</Badge>}
                      </div>
                    );
                  },
                },
              ]}
              extraActions={(a) =>
                a.status !== "OPERACIONAL" ? (
                  <button
                    className={`${btnGhost} !px-2.5 !py-1.5 text-[11px] sm:text-xs whitespace-nowrap`}
                    onClick={async () => {
                      try {
                        await aparelhos.update(a.id, { status: "OPERACIONAL" });
                        toast("Aparelho voltou a operar");
                      } catch (e) {
                        toast(e instanceof Error ? e.message : "Falha ao atualizar", "err");
                      }
                    }}
                  >
                    <Check size={13} /> Liberar
                  </button>
                ) : null
              }
              {...common}
            />
          )}

          {tab === "biosseguranca" && (
            <CrudTab<Biosseguranca>
              data={bio}
              singular="registro de biossegurança"
              fields={bioFields}
              registerCreate={regBio}
              emptyText="Nenhum registro de biossegurança. Cadastre rotinas como esterilização e limpeza terminal."
              csvName="biosseguranca.csv"
              searchOf={(b) => [b.titulo, b.tipo, b.responsavel, b.lote]}
              filters={[
                { label: "Todos", test: () => true },
                {
                  label: "Atrasados",
                  test: (b) => {
                    const d = daysUntil(b.proximaExecucao);
                    return d !== null && d < 0;
                  },
                },
                {
                  label: "Próximos 7 dias",
                  test: (b) => {
                    const d = daysUntil(b.proximaExecucao);
                    return d !== null && d >= 0 && d <= 7;
                  },
                },
              ]}
              toRow={(b) => ({
                titulo: b.titulo,
                tipo: b.tipo,
                responsavel: b.responsavel ?? "",
                lote: b.lote ?? "",
                ultimaExecucao: toDateInput(b.ultimaExecucao),
                proximaExecucao: toDateInput(b.proximaExecucao),
                observacao: b.observacao ?? "",
              })}
              toCsv={(b) => ({
                Rotina: b.titulo,
                Tipo: b.tipo,
                Responsavel: b.responsavel,
                Lote: b.lote,
                Ultima: fmtDate(b.ultimaExecucao),
                Proxima: fmtDate(b.proximaExecucao),
              })}
              columns={[
                {
                  header: "Rotina",
                  render: (b) => (
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{b.titulo}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">{b.tipo}</p>
                    </div>
                  ),
                },
                { header: "Responsável", render: (b) => <span className="whitespace-nowrap">{b.responsavel || "—"}</span> },
                { header: "Lote / ciclo", render: (b) => <span className="whitespace-nowrap">{b.lote || "—"}</span> },
                { header: "Última execução", render: (b) => <span className="whitespace-nowrap">{fmtDate(b.ultimaExecucao)}</span> },
                {
                  header: "Próxima execução",
                  render: (b) => {
                    const s = prazoStatus(b.proximaExecucao);
                    return (
                      <div className="space-y-1 whitespace-nowrap">
                        <p>{fmtDate(b.proximaExecucao)}</p>
                        {b.proximaExecucao && <Badge tone={s.tone}>{s.label}</Badge>}
                      </div>
                    );
                  },
                },
              ]}
              extraActions={(b) => (
                <button
                  className={`${btnGhost} !px-2.5 !py-1.5 text-[11px] sm:text-xs whitespace-nowrap`}
                  onClick={async () => {
                    try {
                      const hoje = new Date().toISOString().slice(0, 10);
                      await bio.update(b.id, { ultimaExecucao: hoje });
                      toast("Execução registrada hoje");
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Falha ao registrar", "err");
                    }
                  }}
                >
                  <Check size={13} /> Executado
                </button>
              )}
              {...common}
            />
          )}

          {tab === "documentos" && (
            <CrudTab<Documento>
              data={docs}
              singular="documento"
              fields={docFields}
              registerCreate={regDocs}
              emptyText="Nenhum documento cadastrado. Registre alvarás, licenças e certificados para acompanhar os prazos."
              csvName="documentos.csv"
              searchOf={(d) => [d.nome, d.tipo, d.numero, d.orgaoEmissor]}
              filters={[
                { label: "Todos", test: () => true },
                { label: "Vencidos", test: (d) => (daysUntil(d.validade) ?? 1) < 0 },
                {
                  label: `Vencem em ${ALERTA_DIAS} dias`,
                  test: (d) => {
                    const x = daysUntil(d.validade);
                    return x !== null && x >= 0 && x <= ALERTA_DIAS;
                  },
                },
              ]}
              toRow={(d) => ({
                nome: d.nome,
                tipo: d.tipo,
                numero: d.numero ?? "",
                orgaoEmissor: d.orgaoEmissor ?? "",
                emissao: toDateInput(d.emissao),
                validade: toDateInput(d.validade),
                observacao: d.observacao ?? "",
              })}
              toCsv={(d) => ({
                Documento: d.nome,
                Tipo: d.tipo,
                Numero: d.numero,
                Orgao: d.orgaoEmissor,
                Emissao: fmtDate(d.emissao),
                Validade: fmtDate(d.validade),
              })}
              columns={[
                {
                  header: "Documento",
                  render: (d) => (
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{d.nome}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">{d.tipo}</p>
                    </div>
                  ),
                },
                { header: "Número", render: (d) => <span className="whitespace-nowrap">{d.numero || "—"}</span> },
                { header: "Órgão emissor", render: (d) => <span className="whitespace-nowrap">{d.orgaoEmissor || "—"}</span> },
                { header: "Emissão", render: (d) => <span className="whitespace-nowrap">{fmtDate(d.emissao)}</span> },
                {
                  header: "Validade",
                  render: (d) => {
                    const s = validadeStatus(d.validade);
                    return (
                      <div className="space-y-1 whitespace-nowrap">
                        <p>{fmtDate(d.validade)}</p>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                    );
                  },
                },
              ]}
              {...common}
            />
          )}

          {tab === "compras" && (
            <CrudTab<Compra>
              data={compras}
              singular="compra"
              fields={compraFields}
              registerCreate={regCompras}
              emptyText="Nenhuma compra registrada. Use “Nova compra” para criar um pedido de reposição."
              csvName="compras.csv"
              searchOf={(c) => [c.fornecedor, c.insumoNome, insumos.items.find((i) => i.id === c.insumoId)?.nome]}
              filters={[
                { label: "Todas", test: () => true },
                { label: "Em andamento", test: (c) => c.status === "PEDIDO" || c.status === "RASCUNHO" },
                { label: "Recebidas", test: (c) => c.status === "RECEBIDA" },
              ]}
              beforeSave={(p) => {
                const ins = insumos.items.find((i) => i.id === p.insumoId);
                return { ...p, insumoId: p.insumoId || undefined, insumoNome: ins?.nome };
              }}
              toRow={(c) => ({
                fornecedor: c.fornecedor,
                insumoId: c.insumoId ?? "",
                quantidade: String(c.quantidade),
                custoUnitario: String(c.custoUnitario),
                status: c.status,
                dataPedido: toDateInput(c.dataPedido),
                previsaoEntrega: toDateInput(c.previsaoEntrega),
                observacao: c.observacao ?? "",
              })}
              toCsv={(c) => ({
                Fornecedor: c.fornecedor,
                Insumo: c.insumoNome,
                Quantidade: c.quantidade,
                CustoUnitario: c.custoUnitario,
                Total: c.quantidade * c.custoUnitario,
                Status: c.status,
                Pedido: fmtDate(c.dataPedido),
                Previsao: fmtDate(c.previsaoEntrega),
              })}
              columns={[
                {
                  header: "Fornecedor",
                  render: (c) => (
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{c.fornecedor}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                        {c.insumoNome ?? insumos.items.find((i) => i.id === c.insumoId)?.nome ?? "Sem insumo vinculado"}
                      </p>
                    </div>
                  ),
                },
                { header: "Qtd.", render: (c) => <span className="whitespace-nowrap">{num(c.quantidade)}</span> },
                {
                  header: "Total",
                  render: (c) => (
                    <div className="whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{brl(c.quantidade * c.custoUnitario)}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">{brl(c.custoUnitario)} / un</p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  render: (c) => (
                    <Badge tone={compraTone[c.status]}>{compraStatus.find((s) => s.value === c.status)?.label}</Badge>
                  ),
                },
                { header: "Pedido", render: (c) => <span className="whitespace-nowrap">{fmtDate(c.dataPedido)}</span> },
                {
                  header: "Previsão",
                  render: (c) => {
                    const atrasada = c.status === "PEDIDO" && (daysUntil(c.previsaoEntrega) ?? 1) < 0;
                    return (
                      <span className={`whitespace-nowrap ${atrasada ? "font-semibold text-rose-600" : ""}`}>{fmtDate(c.previsaoEntrega)}</span>
                    );
                  },
                },
              ]}
              extraActions={(c) =>
                c.status === "PEDIDO" ? (
                  <button className={`${btnGhost} !px-2.5 !py-1.5 text-[11px] sm:text-xs whitespace-nowrap`} onClick={() => receberCompra(c)}>
                    <ArrowDownToLine size={13} /> Receber
                  </button>
                ) : null
              }
              {...common}
            />
          )}
        </div>
      </div>

      {form && <FormModal {...form} onClose={() => setForm(null)} />}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      <Toasts list={toasts} />
    </div>
  );
}

/* ── Card de indicador ───────────────────────────────────────── */

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
  red,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "blue" | "red" | "green" | "amber";
  red?: boolean;
}) {
  const iconTone = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-rose-50 text-rose-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];
  return (
    <div className={`${card} p-4 sm:p-5 h-full flex flex-col justify-between min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 truncate">{label}</p>
        <span className={`grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-lg ${iconTone}`}>{icon}</span>
      </div>
      <p className={`mt-2 sm:mt-3 text-[19px] sm:text-2xl font-extrabold tracking-tight truncate ${red ? "text-rose-600" : "text-slate-900"}`}>
        {value}
      </p>
      <div className="mt-2 sm:mt-3 border-t border-slate-100 pt-2 sm:pt-3 text-[9px] sm:text-[10px] text-slate-500 truncate">{hint}</div>
    </div>
  );
}

export default function RecursosPage() {
  return (
    <AppShell 
      trilha={["Operação", "Recursos"]}
    >
      <RecursosContent />
    </AppShell>
  );
}