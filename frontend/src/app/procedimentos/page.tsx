"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Kanban,
  Activity,
  Stethoscope,
  DoorOpen,
  ListTodo,
  FileText,
  Star,
  BookOpen,
  Image as ImageIcon,
  FileSignature,
  Search,
  MapPin,
  Plus,
  Bell,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Settings,
  Clock,
  X,
  Check,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  LayoutGrid,
  List,
  Download,
  Minus,
  RotateCcw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
 *  API
 * ============================================================ */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const m = (await res.json())?.message;
      msg = Array.isArray(m) ? m.join(", ") : m ?? msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

/* ============================================================
 *  TIPOS E UTILS
 * ============================================================ */
interface Procedure {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration: number;
  price: number;
  cost: number;
  returnDays: number | null;
  active: boolean;
  usage: number;
}

type FormPayload = Omit<Procedure, "id" | "usage">;
type SortKey = "name" | "price" | "duration" | "margin";
type StatusFilter = "active" | "inactive" | "all";

const normalize = (p: any): Procedure => ({
  id: String(p.id),
  name: p.name ?? "",
  category: p.category ?? "Geral",
  description: p.description ?? null,
  duration: Number(p.duration) || 30,
  price: Number(p.price) || 0,
  cost: Number(p.cost) || 0,
  returnDays: p.returnDays ?? null,
  active: p.active !== false,
  usage: Number(p.usage) || 0,
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n).replace(/\u00a0/g, " ");
const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
};
const parseMoney = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
const toMoneyInput = (n: number) => n.toFixed(2).replace(".", ",");
const marginOf = (p: { price: number; cost: number }) => (p.price > 0 ? (p.price - p.cost) / p.price : 0);
const marginTone = (m: number) => (m >= 0.6 ? "bg-emerald-500" : m >= 0.3 ? "bg-blue-600" : m >= 0 ? "bg-amber-500" : "bg-rose-500");
const returnLabel = (d: number | null) => (d ? `Retorno em ${d} dias` : "Sem retorno programado");

const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";
const inputCls =
  "w-full h-11 px-3.5 rounded-xl border bg-white focus:ring-4 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400";
const inputOk = "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10";
const inputErr = "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10";

/* ============================================================
 *  PÁGINA
 * ============================================================ */
export default function ProcedimentosPage() {
  const [items, setItems] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [view, setView] = useState<"grid" | "table">("grid");

  const [drawer, setDrawer] = useState<{ mode: "create" | "edit"; item?: Procedure; seed: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Procedure | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------- dados ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<any[]>("/api/procedures");
      setItems((Array.isArray(data) ? data : []).map(normalize));
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar procedimentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- atalhos e menus ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(null);
        setDeleteTarget(null);
        setMenuId(null);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const closeMenu = () => setMenuId(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  /* ---------- derivados ---------- */
  const categories = useMemo(() => {
    const base = items.filter((p) => status === "all" || (status === "active" ? p.active : !p.active));
    const map = new Map<string, number>();
    base.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, status]);

  const allCategories = useMemo(() => [...new Set(items.map((p) => p.category))].sort((a, b) => a.localeCompare(b)), [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (p) =>
        (status === "all" || (status === "active" ? p.active : !p.active)) &&
        (category === "Todos" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "price") return (a.price - b.price) * dir;
      if (sort.key === "duration") return (a.duration - b.duration) * dir;
      return (marginOf(a) - marginOf(b)) * dir;
    });
  }, [items, query, category, status, sort]);

  const kpis = useMemo(() => {
    const active = items.filter((p) => p.active);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0);
    const withCost = active.filter((p) => p.cost > 0);
    const top = [...active].sort((a, b) => b.price - b.cost - (a.price - a.cost))[0];
    return {
      active: active.length,
      total: items.length,
      categories: new Set(active.map((p) => p.category)).size,
      ticket: avg(active.map((p) => p.price)),
      margin: withCost.length ? avg(withCost.map(marginOf)) : null,
      duration: avg(active.map((p) => p.duration)),
      top,
    };
  }, [items]);

  const filtersActive = query.trim() !== "" || category !== "Todos" || status !== "active";
  const clearFilters = () => {
    setQuery("");
    setCategory("Todos");
    setStatus("active");
  };

  /* ---------- ações ---------- */
  const openCreate = () => setDrawer({ mode: "create", seed: Date.now() });
  const openEdit = (item: Procedure) => setDrawer({ mode: "edit", item, seed: Date.now() });
  const openDuplicate = (item: Procedure) =>
    setDrawer({ mode: "create", item: { ...item, id: "", name: `${item.name} (cópia)`, usage: 0 }, seed: Date.now() });

  const handleSubmit = async (payload: FormPayload) => {
    setSaving(true);
    try {
      if (drawer?.mode === "edit" && drawer.item) {
        const saved = normalize(await api(`/api/procedures/${drawer.item.id}`, { method: "PATCH", body: JSON.stringify(payload) }));
        setItems((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        toast?.success("Procedimento atualizado.");
      } else {
        const saved = normalize(await api("/api/procedures", { method: "POST", body: JSON.stringify(payload) }));
        setItems((prev) => [...prev, saved]);
        toast?.success("Procedimento cadastrado.");
      }
      setDrawer(null);
    } catch (e: any) {
      toast?.error(e.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Procedure) => {
    const next = !item.active;
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, active: next } : p)));
    try {
      await api(`/api/procedures/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: next }) });
      toast?.success(next ? "Procedimento ativado." : "Procedimento desativado.");
    } catch (e: any) {
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, active: item.active } : p)));
      toast?.error(e.message ?? "Não foi possível alterar o status.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api(`/api/procedures/${deleteTarget.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast?.success("Procedimento excluído.");
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e.message ?? "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const deactivateInstead = async () => {
    if (!deleteTarget) return;
    await toggleActive(deleteTarget);
    setDeleteTarget(null);
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ["Procedimento", "Categoria", "Duração (min)", "Preço", "Custo", "Margem (%)", "Retorno (dias)", "Status"],
      ...visible.map((p) => [p.name, p.category, p.duration, p.price.toFixed(2), p.cost.toFixed(2), (marginOf(p) * 100).toFixed(1), p.returnDays ?? "", p.active ? "Ativo" : "Inativo"]),
    ];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "procedimentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const setSortKey = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  /* ============================================================
   *  RENDER
   * ============================================================ */
  return (
    <div className="fixed inset-0 z-40 flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc]">
        {/* HEADER GLOBAL */}
        <header className="h-[72px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 shrink-0">
              <span>Operação</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-bold">Procedimentos</span>
            </div>
            <div className="h-6 w-px bg-slate-200 shrink-0"></div>
            <div className="relative w-[340px] shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Buscar procedimento..."
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
              {query ? (
                <button onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">/</kbd>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 ml-2 shrink-0">
              <MapPin className="w-4 h-4" /> Unidade Av Saudade (Matriz)
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </div>
            <HelpCircle className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 ml-1" />
            <img src="https://i.pravatar.cc/150?img=5" alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 ml-2 cursor-pointer object-cover shadow-sm" />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* TOPO: título, ações e indicadores */}
          <div className="px-8 pt-6 pb-6 bg-white border-b border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mb-1.5">Catálogo de Procedimentos</h1>
                <p className="text-[13px] font-medium text-slate-500 uppercase tracking-widest">Serviços, preços e margens • Ellevare Estética Avançada</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={exportCsv}
                  disabled={!visible.length}
                  className="h-10 px-4 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 text-slate-400" /> Exportar CSV
                </button>
                <button onClick={openCreate} className="h-10 px-6 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm ml-1">
                  <Plus className="w-4 h-4" /> Novo Procedimento
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <Metric title="Procedimentos ativos" value={String(kpis.active).padStart(2, "0")} suffix={`de ${kpis.total}`} sub={`${kpis.categories} ${kpis.categories === 1 ? "categoria" : "categorias"}`} icon={<Stethoscope className="w-4 h-4" />} loading={loading} />
              <Metric title="Ticket médio" value={formatBRL(kpis.ticket)} sub="Preço médio por sessão" icon={<Briefcase className="w-4 h-4" />} loading={loading} />
              <Metric
                title="Margem média"
                value={kpis.margin === null ? "—" : `${(kpis.margin * 100).toFixed(1)}%`}
                sub={kpis.margin === null ? "Informe o custo de insumos" : "Sobre procedimentos com custo"}
                icon={<Activity className="w-4 h-4" />}
                bg={kpis.margin !== null && kpis.margin >= 0.5 ? "bg-emerald-50" : "bg-white"}
                border={kpis.margin !== null && kpis.margin >= 0.5 ? "border-emerald-200/60" : "border-slate-200/60"}
                valColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-700" : "text-slate-900"}
                titleColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-600/80" : "text-slate-400"}
                subColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-600/80" : "text-slate-400"}
                loading={loading}
              />
              <Metric title="Duração média" value={kpis.duration ? formatDuration(Math.round(kpis.duration)) : "—"} sub="Tempo médio de cadeira" icon={<Clock className="w-4 h-4" />} loading={loading} />
              <Metric
                title="Maior lucro / sessão"
                value={kpis.top ? formatBRL(kpis.top.price - kpis.top.cost) : "—"}
                sub={kpis.top ? kpis.top.name : "Sem dados"}
                icon={<Star className="w-4 h-4 text-blue-400" />}
                bg="bg-[#0f172a]"
                border="border-[#0f172a]"
                valColor="text-white"
                titleColor="text-slate-400"
                subColor="text-slate-400"
                loading={loading}
              />
            </div>
          </div>

          {/* CONTEÚDO */}
          <div className="px-8 py-6 space-y-5">
            {/* Barra de filtros */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Chip active={category === "Todos"} onClick={() => setCategory("Todos")}>
                  Todos <span className="opacity-60 tabular-nums">{categories.reduce((s, [, n]) => s + n, 0)}</span>
                </Chip>
                {categories.map(([name, n]) => (
                  <Chip key={name} active={category === name} onClick={() => setCategory(name)}>
                    {name} <span className="opacity-60 tabular-nums">{n}</span>
                  </Chip>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Segmented
                  value={status}
                  onChange={(v: StatusFilter) => setStatus(v)}
                  options={[
                    { v: "active", label: "Ativos" },
                    { v: "inactive", label: "Inativos" },
                    { v: "all", label: "Todos" },
                  ]}
                />
                <div className="relative">
                  <select
                    value={`${sort.key}:${sort.dir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split(":");
                      setSort({ key: key as SortKey, dir: dir as "asc" | "desc" });
                    }}
                    className="h-10 pl-3.5 pr-9 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
                    aria-label="Ordenar por"
                  >
                    <option value="name:asc">Nome (A–Z)</option>
                    <option value="name:desc">Nome (Z–A)</option>
                    <option value="price:desc">Maior preço</option>
                    <option value="price:asc">Menor preço</option>
                    <option value="margin:desc">Maior margem</option>
                    <option value="margin:asc">Menor margem</option>
                    <option value="duration:desc">Mais demorados</option>
                    <option value="duration:asc">Mais rápidos</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner">
                  {([
                    ["grid", LayoutGrid, "Cartões"],
                    ["table", List, "Tabela"],
                  ] as const).map(([v, Icon, label]) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-label={label}
                      aria-pressed={view === v}
                      className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${view === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Estados */}
            {error ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <h3 className="text-[15px] font-black text-slate-900">Não foi possível carregar o catálogo</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-sm">{error}</p>
                <button onClick={load} className="mt-5 h-10 px-5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-2 transition-colors">
                  <RotateCcw className="w-4 h-4" /> Tentar novamente
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-[236px] shadow-sm animate-pulse">
                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                    <div className="h-4 w-48 bg-slate-100 rounded mt-4" />
                    <div className="h-3 w-full bg-slate-100 rounded mt-3" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded mt-2" />
                    <div className="h-8 w-32 bg-slate-100 rounded mt-6" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900">Seu catálogo ainda está vazio</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-md">Cadastre os procedimentos da clínica com preço, duração e custo para acompanhar a margem e liberar o agendamento.</p>
                <button onClick={openCreate} className="mt-6 h-10 px-6 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar primeiro procedimento
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center shadow-sm">
                <Search className="w-5 h-5 text-slate-300 mb-3" />
                <h3 className="text-[15px] font-black text-slate-900">Nenhum procedimento encontrado</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Ajuste a busca ou os filtros aplicados.</p>
                {filtersActive && (
                  <button onClick={clearFilters} className="mt-4 text-[12px] font-bold text-blue-600 hover:text-blue-700">
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visible.map((p) => (
                  <ProcedureCard
                    key={p.id}
                    p={p}
                    menuOpen={menuId === p.id}
                    onMenu={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setMenuId(menuId === p.id ? null : p.id);
                    }}
                    onEdit={() => openEdit(p)}
                    onDuplicate={() => openDuplicate(p)}
                    onToggle={() => toggleActive(p)}
                    onDelete={() => {
                      setDeleteError("");
                      setDeleteTarget(p);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <Th sortable active={sort.key === "name"} dir={sort.dir} onClick={() => setSortKey("name")} className="pl-5">Procedimento</Th>
                        <Th sortable active={sort.key === "duration"} dir={sort.dir} onClick={() => setSortKey("duration")}>Duração</Th>
                        <Th sortable active={sort.key === "price"} dir={sort.dir} onClick={() => setSortKey("price")}>Preço</Th>
                        <Th>Custo</Th>
                        <Th sortable active={sort.key === "margin"} dir={sort.dir} onClick={() => setSortKey("margin")}>Margem</Th>
                        <Th>Retorno</Th>
                        <Th>Status</Th>
                        <Th className="pr-5 text-right">Ações</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((p) => {
                        const m = marginOf(p);
                        return (
                          <tr key={p.id} className={`group hover:bg-slate-50/70 transition-colors ${p.active ? "" : "opacity-60"}`}>
                            <td className="pl-5 py-3.5">
                              <button onClick={() => openEdit(p)} className="text-left">
                                <span className="block text-[13px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{p.name}</span>
                                <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{p.category}</span>
                              </button>
                            </td>
                            <td className="py-3.5 text-[13px] font-semibold text-slate-600 tabular-nums">{formatDuration(p.duration)}</td>
                            <td className="py-3.5 text-[13px] font-black text-slate-900 tabular-nums">{formatBRL(p.price)}</td>
                            <td className="py-3.5 text-[13px] font-medium text-slate-500 tabular-nums">{p.cost > 0 ? formatBRL(p.cost) : "—"}</td>
                            <td className="py-3.5 w-[170px]">
                              {p.cost > 0 ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${marginTone(m)}`} style={{ width: `${Math.max(0, Math.min(100, m * 100))}%` }} />
                                  </div>
                                  <span className="text-[12px] font-bold text-slate-700 tabular-nums w-11 text-right">{(m * 100).toFixed(0)}%</span>
                                </div>
                              ) : (
                                <span className="text-[12px] font-medium text-slate-400">Sem custo</span>
                              )}
                            </td>
                            <td className="py-3.5 text-[12px] font-medium text-slate-500">{p.returnDays ? `${p.returnDays} dias` : "—"}</td>
                            <td className="py-3.5"><Switch checked={p.active} onChange={() => toggleActive(p)} label={`${p.active ? "Desativar" : "Ativar"} ${p.name}`} /></td>
                            <td className="pr-5 py-3.5">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconBtn label="Editar" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></IconBtn>
                                <IconBtn label="Duplicar" onClick={() => openDuplicate(p)}><Copy className="w-4 h-4" /></IconBtn>
                                <IconBtn label="Excluir" danger onClick={() => { setDeleteError(""); setDeleteTarget(p); }}><Trash2 className="w-4 h-4" /></IconBtn>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && !error && visible.length > 0 && (
              <p className="text-[12px] font-medium text-slate-400">
                Exibindo {visible.length} de {items.length} procedimentos
              </p>
            )}
          </div>
        </div>
      </main>

      {/* ==================== DRAWER: CRIAR / EDITAR ==================== */}
      <AnimatePresence>
        {drawer && (
          <ProcedureDrawer
            key={drawer.seed}
            mode={drawer.mode}
            initial={drawer.item}
            categories={allCategories}
            saving={saving}
            onClose={() => setDrawer(null)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>

      {/* ==================== CONFIRMAR EXCLUSÃO ==================== */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setDeleteTarget(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-[440px] bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Excluir procedimento?</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1.5">
                  <strong className="text-slate-800">{deleteTarget.name}</strong> será removido do catálogo. Essa ação não pode ser desfeita.
                </p>
                {deleteError && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-medium text-amber-900">{deleteError}</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3">
                <button disabled={deleting} onClick={() => setDeleteTarget(null)} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                {deleteError && deleteTarget.active && (
                  <button onClick={deactivateInstead} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                    Desativar em vez disso
                  </button>
                )}
                {!deleteError && (
                  <button disabled={deleting} onClick={confirmDelete} className="h-10 px-5 rounded-xl text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-2 disabled:opacity-60 transition-colors">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 *  CARTÃO DE PROCEDIMENTO
 * ============================================================ */
function ProcedureCard({ p, menuOpen, onMenu, onEdit, onDuplicate, onToggle, onDelete }: any) {
  const m = marginOf(p);
  const hasCost = p.cost > 0;
  return (
    <article className={`group relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col ${p.active ? "" : "bg-slate-50/60"}`}>
      <div className={`p-5 flex-1 ${p.active ? "" : "opacity-60"}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{p.category}</span>
          {!p.active && <span className="text-[9px] font-black text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded uppercase tracking-widest mr-8">Inativo</span>}
        </div>
        <h3 className="mt-2 text-[16px] font-black text-slate-900 leading-snug tracking-tight">{p.name}</h3>
        <p className="mt-1.5 text-[12px] font-medium text-slate-500 leading-relaxed line-clamp-2 min-h-[36px]">{p.description || "Sem descrição cadastrada."}</p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <span className={labelCls}>Preço</span>
            <p className="text-[26px] font-black text-slate-900 leading-none mt-1 tabular-nums">{formatBRL(p.price)}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> {formatDuration(p.duration)}
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelCls}>Margem</span>
            <span className="text-[12px] font-bold text-slate-700 tabular-nums">{hasCost ? `${(m * 100).toFixed(0)}% • ${formatBRL(p.price - p.cost)}` : "Informe o custo"}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${hasCost ? marginTone(m) : "bg-slate-200"}`} style={{ width: hasCost ? `${Math.max(0, Math.min(100, m * 100))}%` : "0%" }} />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-slate-400 truncate">{returnLabel(p.returnDays)}{p.usage > 0 ? ` • ${p.usage} uso${p.usage > 1 ? "s" : ""}` : ""}</span>
        <Switch checked={p.active} onChange={onToggle} label={`${p.active ? "Desativar" : "Ativar"} ${p.name}`} />
      </div>

      {/* Menu */}
      <div className="absolute top-3.5 right-3.5">
        <button onClick={onMenu} aria-label="Mais ações" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-9 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1"
            >
              <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={onEdit}>Editar</MenuItem>
              <MenuItem icon={<Copy className="w-4 h-4" />} onClick={onDuplicate}>Duplicar</MenuItem>
              <div className="h-px bg-slate-100 my-1" />
              <MenuItem icon={<Trash2 className="w-4 h-4" />} danger onClick={onDelete}>Excluir</MenuItem>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

/* ============================================================
 *  DRAWER DE CADASTRO / EDIÇÃO
 * ============================================================ */
function ProcedureDrawer({
  mode,
  initial,
  categories,
  saving,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: Procedure;
  categories: string[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (p: FormPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? 30);
  const [price, setPrice] = useState(initial ? toMoneyInput(initial.price) : "");
  const [cost, setCost] = useState(initial && initial.cost > 0 ? toMoneyInput(initial.cost) : "");
  const [returnDays, setReturnDays] = useState<number | null>(initial?.returnDays ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitted, setSubmitted] = useState(false);

  const priceN = parseMoney(price);
  const costN = parseMoney(cost);
  const profit = priceN - costN;
  const margin = priceN > 0 ? profit / priceN : 0;
  const perHour = duration > 0 ? priceN / (duration / 60) : 0;

  const errors = {
    name: name.trim().length < 2 ? "Informe o nome do procedimento." : "",
    duration: duration < 5 || duration > 480 ? "Use entre 5 e 480 minutos." : "",
    price: priceN <= 0 ? "Informe o preço de venda." : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    onSubmit({
      name: name.trim(),
      category: category.trim() || "Geral",
      description: description.trim() || null,
      duration,
      price: priceN,
      cost: costN,
      returnDays,
      active,
    });
  };

  const money = (v: string, set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/[^\d,]/g, ""));

  return (
    <div className="fixed inset-0 z-[999]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Editar procedimento" : "Novo procedimento"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-[520px] bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-bold text-blue-600">{mode === "edit" ? "Editando procedimento" : initial ? "Duplicando procedimento" : "Novo no catálogo"}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{mode === "edit" ? "Editar procedimento" : "Novo procedimento"}</h2>
            {mode === "edit" && initial && initial.usage > 0 && (
              <p className="text-[12px] font-medium text-slate-500 mt-1">Utilizado em {initial.usage} agendamento{initial.usage > 1 ? "s" : ""}. Alterações não mudam o histórico.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-colors">
            Esc <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 py-6 space-y-7 bg-slate-50/50">
          {/* Identificação */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-900">Identificação</h3>
            <div className="space-y-2">
              <label htmlFor="proc-name" className={labelCls}>Nome</label>
              <input id="proc-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: Harmonização Facial Full Face" className={`${inputCls} ${submitted && errors.name ? inputErr : inputOk}`} />
              {submitted && errors.name && <p className="text-[12px] font-bold text-rose-600">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="proc-cat" className={labelCls}>Categoria</label>
              <input id="proc-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="Ex.: Injetáveis" className={`${inputCls} ${inputOk}`} />
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {categories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={`h-7 px-2.5 rounded-lg text-[11px] font-bold border transition-colors ${category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="proc-desc" className={labelCls}>Descrição</label>
                <span className="text-[11px] font-medium text-slate-400 tabular-nums">{description.length}/500</span>
              </div>
              <textarea id="proc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="O que está incluso, indicações e cuidados." className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all resize-none placeholder:text-slate-400" />
            </div>
          </section>

          {/* Duração */}
          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-900">Duração</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDuration((d) => Math.max(5, d - 5))} aria-label="Diminuir 5 minutos" className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <div className={`flex-1 h-11 rounded-xl border bg-white flex items-center justify-center gap-2 ${submitted && errors.duration ? "border-rose-300" : "border-slate-200"}`}>
                <input
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  inputMode="numeric"
                  aria-label="Duração em minutos"
                  className="w-14 text-center text-[15px] font-black text-slate-900 outline-none tabular-nums bg-transparent"
                />
                <span className="text-[12px] font-bold text-slate-400">min {duration >= 60 && <span className="text-slate-500">• {formatDuration(duration)}</span>}</span>
              </div>
              <button type="button" onClick={() => setDuration((d) => Math.min(480, d + 5))} aria-label="Aumentar 5 minutos" className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)} className={`h-7 px-2.5 rounded-lg text-[11px] font-bold border transition-colors ${duration === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {formatDuration(d)}
                </button>
              ))}
            </div>
            {submitted && errors.duration && <p className="text-[12px] font-bold text-rose-600">{errors.duration}</p>}
          </section>

          {/* Precificação */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-900">Precificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="proc-price" className={labelCls}>Preço de venda</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">R$</span>
                  <input id="proc-price" value={price} onChange={money(price, setPrice)} inputMode="decimal" placeholder="0,00" className={`${inputCls} pl-10 tabular-nums ${submitted && errors.price ? inputErr : inputOk}`} />
                </div>
                {submitted && errors.price && <p className="text-[12px] font-bold text-rose-600">{errors.price}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="proc-cost" className={labelCls}>Custo de insumos</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">R$</span>
                  <input id="proc-cost" value={cost} onChange={money(cost, setCost)} inputMode="decimal" placeholder="0,00" className={`${inputCls} pl-10 tabular-nums ${inputOk}`} />
                </div>
              </div>
            </div>

            {/* Resumo financeiro ao vivo */}
            <div className="bg-[#0B0F19] rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resultado por sessão</span>
                {priceN > 0 && costN > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${margin >= 0.6 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : margin >= 0.3 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                    {margin >= 0.6 ? "Margem alta" : margin >= 0.3 ? "Margem saudável" : margin >= 0 ? "Margem baixa" : "Prejuízo"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-slate-400">Lucro</p>
                  <p className={`text-[20px] font-black leading-tight mt-0.5 tabular-nums ${profit < 0 ? "text-rose-400" : ""}`}>{formatBRL(profit)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">Margem</p>
                  <p className="text-[20px] font-black leading-tight mt-0.5 tabular-nums">{priceN > 0 ? `${(margin * 100).toFixed(1)}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">Valor / hora</p>
                  <p className="text-[20px] font-black leading-tight mt-0.5 tabular-nums">{priceN > 0 ? formatBRL(perHour) : "—"}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-4">
                <div className={`h-full rounded-full transition-all ${marginTone(margin)}`} style={{ width: `${Math.max(0, Math.min(100, margin * 100))}%` }} />
              </div>
            </div>
            {costN > priceN && priceN > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[12px] font-medium text-amber-900">O custo está acima do preço de venda: cada sessão gera prejuízo.</p>
              </div>
            )}
          </section>

          {/* Pós-atendimento */}
          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-900">Retorno recomendado</h3>
            <div className="flex flex-wrap gap-1.5">
              {([null, 15, 30, 60, 90, 180, 365] as (number | null)[]).map((d) => (
                <button key={String(d)} type="button" onClick={() => setReturnDays(d)} className={`h-8 px-3 rounded-lg text-[12px] font-bold border transition-colors ${returnDays === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {d === null ? "Sem retorno" : d === 365 ? "1 ano" : `${d} dias`}
                </button>
              ))}
            </div>
          </section>

          {/* Disponibilidade */}
          <section>
            <button type="button" onClick={() => setActive((a) => !a)} aria-pressed={active} className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3.5 text-left transition-colors">
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-slate-900">Disponível para agendamento</span>
                <span className="block text-[11px] font-medium text-slate-500">Procedimentos inativos não aparecem ao agendar.</span>
              </span>
              <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : ""}`} />
              </span>
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="h-10 px-6 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === "edit" ? "Salvar alterações" : "Cadastrar procedimento"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

/* ============================================================
 *  COMPONENTES DE INTERFACE
 * ============================================================ */
function Metric({
  title,
  value,
  sub,
  suffix,
  icon,
  loading,
  bg = "bg-white",
  border = "border-slate-200/60",
  valColor = "text-slate-900",
  titleColor = "text-slate-400",
  subColor = "text-slate-400",
}: any) {
  return (
    <div className={`${bg} border ${border} rounded-2xl p-5 flex flex-col justify-between shadow-sm min-w-0 h-[110px]`}>
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${titleColor} truncate`}>{title}</span>
        <div className="text-slate-400 shrink-0">{icon}</div>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-24 bg-slate-100 rounded" />
          <div className="h-2.5 w-32 bg-slate-100 rounded" />
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${valColor} leading-none truncate tabular-nums`}>{value}</span>
            {suffix && <span className={`text-[10px] font-bold ${titleColor} truncate`}>{suffix}</span>}
          </div>
          <p className={`text-[11px] font-medium mt-1.5 ${subColor} truncate`}>{sub}</p>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 px-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-colors shadow-sm shrink-0 ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented({ value, onChange, options }: any) {
  return (
    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner">
      {options.map((o: any) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`px-3.5 h-8 rounded-lg text-[12px] font-bold transition-colors ${value === o.v ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

function Th({ children, sortable, active, dir, onClick, className = "" }: any) {
  const content = (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${active ? "text-slate-900" : "text-slate-400"}`}>
      {children}
      {sortable && active && (dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </span>
  );
  return (
    <th className={`py-3 pr-4 font-normal ${className}`}>
      {sortable ? (
        <button onClick={onClick} className="hover:text-slate-900 transition-colors">
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

function IconBtn({ children, label, onClick, danger }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${danger ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function MenuItem({ icon, children, onClick, danger }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-bold transition-colors ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============================================================
 *  SIDEBAR (mesma da agenda)
 * ============================================================ */
function Sidebar() {
  return (
    <aside className="w-[260px] min-w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 h-full">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none text-slate-900">HealthSystem</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Clinical Suite</span>
          </div>
        </div>
        <div className="flex items-center justify-between cursor-pointer group">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-blue-600 mb-0.5">Ellevare Estética Avançada</span>
            <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Unidade Av Saudade (Matriz)</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Visão Geral</span>
          <nav className="space-y-0.5">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
            <SidebarItem icon={Bell} label="Central de Notificações" />
          </nav>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Operação</span>
          <nav className="space-y-0.5">
            <SidebarItem icon={Calendar} label="Agenda da Dra. Joana" href="/" />
            <SidebarItem icon={Users} label="Clientes" href="/pacientes" />
            <SidebarItem icon={Kanban} label="CRM Kanban" href="/crm" />
            <SidebarItem icon={Stethoscope} label="Procedimentos" href="/procedimentos" active />
            <SidebarItem icon={DoorOpen} label="Recursos" />
            
          </nav>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Gestão Clínica</span>
          <nav className="space-y-0.5">
            <SidebarItem icon={FileText} label="Prontuários" href="/prontuarios" />
            <SidebarItem icon={Star} label="Avaliações Estéticas" href="/avaliacoes" />
            <SidebarItem icon={BookOpen} label="Protocolos" href="/protocolos" />
            <SidebarItem icon={ImageIcon} label="Fotos Clínicas" href="/fotos" />
            <SidebarItem icon={FileSignature} label="Termos & Documentos" href="/documentos" />
          </nav>
        </div>
      </div>

      <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/150?img=5" alt="User" className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">Dra. Joana Oliveira</span>
            <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Diretora Médica & Sócia</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Plano Enterprise</span>
          <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700">
            <HelpCircle className="w-3.5 h-3.5" /> Suporte
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, href }: any) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
      <span className="truncate">{label}</span>
    </a>
  );
}