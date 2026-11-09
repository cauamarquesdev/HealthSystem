"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Stethoscope,
  Star,
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
  Plus,
  Briefcase,
  Search,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell"; // Ajuste o caminho se necessário

/* ============================================================
 *  API
 * ============================================================ */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

  /* ---------- dados ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<any[]>("/api/procedures");
      setItems((Array.isArray(data) ? data : []).map(normalize));
    } catch (e: any) {
      console.warn("API offline, carregando mock.", e);
      // Fallback para caso não haja BD no momento (mock)
      setItems([
        { id: "1", name: "Toxina Botulínica Preventiva", category: "Injetáveis", description: "Aplicação full face para prevenção de rugas dinâmicas.", duration: 30, price: 1200, cost: 350, returnDays: 15, active: true, usage: 42 },
        { id: "2", name: "Bioestimulador de Colágeno (Radiesse)", category: "Injetáveis", description: "Seringa 1.5ml para flacidez facial.", duration: 60, price: 1800, cost: 700, returnDays: 30, active: true, usage: 18 },
        { id: "3", name: "Peeling de Diamante + Hidratação", category: "Limpeza de Pele", description: "Esfoliação mecânica com máscara calmante.", duration: 45, price: 250, cost: 30, returnDays: null, active: true, usage: 104 },
        { id: "4", name: "Preenchimento Labial (Ácido Hialurônico)", category: "Injetáveis", description: "1ml de Restylane Kysse.", duration: 40, price: 1500, cost: 450, returnDays: 15, active: false, usage: 12 }
      ]);
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
    <AppShell
      trilha={["Operação", "Procedimentos"]}
      busca={{ valor: query, onChange: setQuery, placeholder: "Buscar procedimento..." }}
      // Botão primário via Prop acoes (se você preferir deixá-lo no topo)
    >
      <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] w-full">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          
          {/* TOPO: título, ações e indicadores */}
          <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-4 sm:pb-6 bg-white border-b border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none mb-1.5 sm:mb-2">Catálogo de Procedimentos</h1>
                <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-widest line-clamp-1">Serviços, preços e margens • Ellevare Estética Avançada</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full lg:w-auto">
                <button
                  onClick={exportCsv}
                  disabled={!visible.length}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold text-xs sm:text-[13px] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Download className="w-4 h-4 text-slate-400" /> <span className="hidden sm:inline">Exportar CSV</span><span className="sm:hidden">Exportar</span>
                </button>
                <button onClick={openCreate} className="w-full sm:w-auto h-10 px-6 rounded-xl font-bold text-xs sm:text-[13px] text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Procedimento</span><span className="sm:hidden">Novo</span>
                </button>
              </div>
            </div>

            <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 snap-x">
              <div className="min-w-[200px] sm:min-w-0 snap-start"><Metric title="Procedimentos ativos" value={String(kpis.active).padStart(2, "0")} suffix={`de ${kpis.total}`} sub={`${kpis.categories} ${kpis.categories === 1 ? "categoria" : "categorias"}`} icon={<Stethoscope className="w-4 h-4" />} loading={loading} /></div>
              <div className="min-w-[200px] sm:min-w-0 snap-start"><Metric title="Ticket médio" value={formatBRL(kpis.ticket)} sub="Preço médio por sessão" icon={<Briefcase className="w-4 h-4" />} loading={loading} /></div>
              <div className="min-w-[200px] sm:min-w-0 snap-start"><Metric
                title="Margem média"
                value={kpis.margin === null ? "—" : `${(kpis.margin * 100).toFixed(1)}%`}
                sub={kpis.margin === null ? "Informe custo de insumos" : "Sobre procedimentos c/ custo"}
                icon={<Activity className="w-4 h-4" />}
                bg={kpis.margin !== null && kpis.margin >= 0.5 ? "bg-emerald-50" : "bg-white"}
                border={kpis.margin !== null && kpis.margin >= 0.5 ? "border-emerald-200/60" : "border-slate-200/60"}
                valColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-700" : "text-slate-900"}
                titleColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-600/80" : "text-slate-400"}
                subColor={kpis.margin !== null && kpis.margin >= 0.5 ? "text-emerald-600/80" : "text-slate-400"}
                loading={loading}
              /></div>
              <div className="min-w-[200px] sm:min-w-0 snap-start"><Metric title="Duração média" value={kpis.duration ? formatDuration(Math.round(kpis.duration)) : "—"} sub="Tempo médio de cadeira" icon={<Clock className="w-4 h-4" />} loading={loading} /></div>
              <div className="min-w-[200px] sm:min-w-0 snap-start"><Metric
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
              /></div>
            </div>
          </div>

          {/* CONTEÚDO */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
            {/* Barra de filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 w-full lg:w-auto">
                <Chip active={category === "Todos"} onClick={() => setCategory("Todos")}>
                  Todos <span className="opacity-60 tabular-nums">{categories.reduce((s, [, n]) => s + n, 0)}</span>
                </Chip>
                {categories.map(([name, n]) => (
                  <Chip key={name} active={category === name} onClick={() => setCategory(name)}>
                    {name} <span className="opacity-60 tabular-nums">{n}</span>
                  </Chip>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                <Segmented
                  value={status}
                  onChange={(v: StatusFilter) => setStatus(v)}
                  options={[
                    { v: "active", label: "Ativos" },
                    { v: "inactive", label: "Inativos" },
                    { v: "all", label: "Todos" },
                  ]}
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                   <div className="relative flex-1 sm:flex-none">
                     <select
                       value={`${sort.key}:${sort.dir}`}
                       onChange={(e) => {
                         const [key, dir] = e.target.value.split(":");
                         setSort({ key: key as SortKey, dir: dir as "asc" | "desc" });
                       }}
                       className="w-full sm:w-auto h-9 sm:h-10 pl-3.5 pr-9 rounded-xl border border-slate-200 bg-white text-[12px] sm:text-[13px] font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
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
                   <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner shrink-0">
                     {([
                       ["grid", LayoutGrid, "Cartões"],
                       ["table", List, "Tabela"],
                     ] as const).map(([v, Icon, label]) => (
                       <button
                         key={v}
                         onClick={() => setView(v)}
                         aria-label={label}
                         aria-pressed={view === v}
                         className={`w-9 h-7 sm:w-10 sm:h-8 rounded-lg flex items-center justify-center transition-colors ${view === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                       >
                         <Icon className="w-4 h-4 sm:w-4" />
                       </button>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Estados */}
            {error ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-10 flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <h3 className="text-[15px] font-black text-slate-900">Não foi possível carregar o catálogo</h3>
                <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-sm">{error}</p>
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
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-14 flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="text-[15px] sm:text-[17px] font-black text-slate-900">Seu catálogo ainda está vazio</h3>
                <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-md">Cadastre os procedimentos da clínica com preço, duração e custo para acompanhar a margem e liberar o agendamento.</p>
                <button onClick={openCreate} className="mt-6 h-10 px-6 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar primeiro procedimento
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center shadow-sm">
                <Search className="w-5 h-5 text-slate-300 mb-3" />
                <h3 className="text-[14px] sm:text-[15px] font-black text-slate-900">Nenhum procedimento encontrado</h3>
                <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1">Ajuste a busca ou os filtros aplicados.</p>
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
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full min-w-[920px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <Th sortable active={sort.key === "name"} dir={sort.dir} onClick={() => setSortKey("name")} className="pl-4 sm:pl-5">Procedimento</Th>
                        <Th sortable active={sort.key === "duration"} dir={sort.dir} onClick={() => setSortKey("duration")}>Duração</Th>
                        <Th sortable active={sort.key === "price"} dir={sort.dir} onClick={() => setSortKey("price")}>Preço</Th>
                        <Th>Custo</Th>
                        <Th sortable active={sort.key === "margin"} dir={sort.dir} onClick={() => setSortKey("margin")}>Margem</Th>
                        <Th>Retorno</Th>
                        <Th>Status</Th>
                        <Th className="pr-4 sm:pr-5 text-right">Ações</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((p) => {
                        const m = marginOf(p);
                        return (
                          <tr key={p.id} className={`group hover:bg-slate-50/70 transition-colors ${p.active ? "" : "opacity-60"}`}>
                            <td className="pl-4 sm:pl-5 py-3.5">
                              <button onClick={() => openEdit(p)} className="text-left w-full">
                                <span className="block text-[12px] sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{p.name}</span>
                                <span className="block text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5 truncate">{p.category}</span>
                              </button>
                            </td>
                            <td className="py-3.5 text-[12px] sm:text-[13px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">{formatDuration(p.duration)}</td>
                            <td className="py-3.5 text-[12px] sm:text-[13px] font-black text-slate-900 tabular-nums whitespace-nowrap">{formatBRL(p.price)}</td>
                            <td className="py-3.5 text-[12px] sm:text-[13px] font-medium text-slate-500 tabular-nums whitespace-nowrap">{p.cost > 0 ? formatBRL(p.cost) : "—"}</td>
                            <td className="py-3.5 w-[140px] sm:w-[170px]">
                              {p.cost > 0 ? (
                                <div className="flex items-center gap-2 sm:gap-2.5">
                                  <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${marginTone(m)}`} style={{ width: `${Math.max(0, Math.min(100, m * 100))}%` }} />
                                  </div>
                                  <span className="text-[11px] sm:text-[12px] font-bold text-slate-700 tabular-nums w-9 sm:w-11 text-right">{(m * 100).toFixed(0)}%</span>
                                </div>
                              ) : (
                                <span className="text-[11px] sm:text-[12px] font-medium text-slate-400">Sem custo</span>
                              )}
                            </td>
                            <td className="py-3.5 text-[11px] sm:text-[12px] font-medium text-slate-500 whitespace-nowrap">{p.returnDays ? `${p.returnDays} dias` : "—"}</td>
                            <td className="py-3.5"><Switch checked={p.active} onChange={() => toggleActive(p)} label={`${p.active ? "Desativar" : "Ativar"} ${p.name}`} /></td>
                            <td className="pr-4 sm:pr-5 py-3.5">
                              <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconBtn label="Editar" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></IconBtn>
                                <IconBtn label="Duplicar" onClick={() => openDuplicate(p)}><Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></IconBtn>
                                <IconBtn label="Excluir" danger onClick={() => { setDeleteError(""); setDeleteTarget(p); }}><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></IconBtn>
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
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 text-center sm:text-left">
                Exibindo {visible.length} de {items.length} procedimentos
              </p>
            )}
          </div>
        </div>
      </div>

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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setDeleteTarget(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-[440px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 sm:p-6 overflow-y-auto">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-50 flex items-center justify-center mb-3 sm:mb-4">
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Excluir procedimento?</h3>
                <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 sm:mt-1.5">
                  <strong className="text-slate-800">{deleteTarget.name}</strong> será removido do catálogo. Essa ação não pode ser desfeita.
                </p>
                {deleteError && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] sm:text-[12px] font-medium text-amber-900">{deleteError}</p>
                  </div>
                )}
              </div>
              <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
                <button disabled={deleting} onClick={() => setDeleteTarget(null)} className="w-full sm:w-auto h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                {deleteError && deleteTarget.active ? (
                  <button onClick={deactivateInstead} className="w-full sm:w-auto h-10 px-4 rounded-xl text-[12px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                    Desativar em vez disso
                  </button>
                ) : (
                  <button disabled={deleting} onClick={confirmDelete} className="w-full sm:w-auto h-10 px-5 rounded-xl text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
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
      <div className={`p-4 sm:p-5 flex-1 ${p.active ? "" : "opacity-60"}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest line-clamp-1 mr-8">{p.category}</span>
          {!p.active && <span className="text-[8px] sm:text-[9px] font-black text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded uppercase tracking-widest mr-8">Inativo</span>}
        </div>
        <h3 className="mt-2 text-[14px] sm:text-[16px] font-black text-slate-900 leading-snug tracking-tight line-clamp-2">{p.name}</h3>
        <p className="mt-1 sm:mt-1.5 text-[11px] sm:text-[12px] font-medium text-slate-500 leading-relaxed line-clamp-2 min-h-[32px] sm:min-h-[36px]">{p.description || "Sem descrição cadastrada."}</p>

        <div className="mt-4 sm:mt-5 flex items-end justify-between gap-2 sm:gap-3">
          <div>
            <span className={labelCls}>Preço</span>
            <p className="text-[20px] sm:text-[26px] font-black text-slate-900 leading-none mt-1 tabular-nums truncate max-w-[120px] sm:max-w-[150px]">{formatBRL(p.price)}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {formatDuration(p.duration)}
          </span>
        </div>

        <div className="mt-4 sm:mt-5">
          <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-2">
            <span className={labelCls}>Margem</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 tabular-nums whitespace-nowrap">{hasCost ? `${(m * 100).toFixed(0)}% • ${formatBRL(p.price - p.cost)}` : "Informe custo"}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${hasCost ? marginTone(m) : "bg-slate-200"}`} style={{ width: hasCost ? `${Math.max(0, Math.min(100, m * 100))}%` : "0%" }} />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 truncate">{returnLabel(p.returnDays)}{p.usage > 0 ? ` • ${p.usage} uso${p.usage > 1 ? "s" : ""}` : ""}</span>
        <Switch checked={p.active} onChange={onToggle} label={`${p.active ? "Desativar" : "Ativar"} ${p.name}`} />
      </div>

      {/* Menu */}
      <div className="absolute top-2.5 sm:top-3.5 right-2.5 sm:right-3.5">
        <button onClick={onMenu} aria-label="Mais ações" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-9 z-30 w-40 sm:w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1"
            >
              <MenuItem icon={<Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} onClick={onEdit}>Editar</MenuItem>
              <MenuItem icon={<Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} onClick={onDuplicate}>Duplicar</MenuItem>
              <div className="h-px bg-slate-100 my-1" />
              <MenuItem icon={<Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} danger onClick={onDelete}>Excluir</MenuItem>
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
    name: name.trim().length < 2 ? "Informe o nome." : "",
    duration: duration < 5 || duration > 480 ? "Use entre 5 e 480 min." : "",
    price: priceN <= 0 ? "Informe o preço." : "",
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
      <motion.form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Editar procedimento" : "Novo procedimento"}
        initial={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }}
        animate={{ x: 0, boxShadow: "-20px 0 40px rgba(0,0,0,0.15)" }}
        exit={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }}
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
        className="absolute right-0 top-0 bottom-0 w-full sm:max-w-[480px] md:max-w-[520px] bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600" />
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest">{mode === "edit" ? "Editando procedimento" : initial ? "Duplicando procedimento" : "Novo no catálogo"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{mode === "edit" ? "Editar procedimento" : "Novo procedimento"}</h2>
            {mode === "edit" && initial && initial.usage > 0 && (
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 line-clamp-2">Utilizado em {initial.usage} agendamento{initial.usage > 1 ? "s" : ""}. Alterações não mudam o histórico.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5 sm:py-6 space-y-6 sm:space-y-7 bg-white">
          {/* Identificação */}
          <section className="space-y-4">
            <h3 className="text-[12px] sm:text-[13px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">1. Identificação</h3>
            <div className="space-y-1.5">
              <label htmlFor="proc-name" className={labelCls}>Nome <span className="text-rose-500">*</span></label>
              <input id="proc-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: Harmonização Facial Full Face" className={`${inputCls} ${submitted && errors.name ? inputErr : inputOk}`} />
              {submitted && errors.name && <p className="text-[10px] sm:text-[11px] font-bold text-rose-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proc-cat" className={labelCls}>Categoria</label>
              <input id="proc-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="Ex.: Injetáveis" className={`${inputCls} ${inputOk}`} />
              {categories.length > 0 && (
                <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1.5 pt-1 pb-1">
                  {categories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={`shrink-0 h-7 px-2.5 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-colors whitespace-nowrap ${category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label htmlFor="proc-desc" className={labelCls}>Descrição</label>
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 tabular-nums">{description.length}/500</span>
              </div>
              <textarea id="proc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="O que está incluso, indicações e cuidados." className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[12px] sm:text-[13px] font-medium text-slate-900 outline-none transition-all resize-none placeholder:text-slate-400" />
            </div>
          </section>

          {/* Duração */}
          <section className="space-y-3">
            <h3 className="text-[12px] sm:text-[13px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">2. Duração Média</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDuration((d) => Math.max(5, d - 5))} aria-label="Diminuir 5 minutos" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0">
                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className={`flex-1 h-10 sm:h-11 rounded-xl border bg-white flex items-center justify-center gap-1 sm:gap-2 ${submitted && errors.duration ? "border-rose-300" : "border-slate-200"}`}>
                <input
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  inputMode="numeric"
                  aria-label="Duração em minutos"
                  className="w-10 sm:w-14 text-center text-[13px] sm:text-[14px] font-black text-slate-900 outline-none tabular-nums bg-transparent"
                />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">min {duration >= 60 && <span className="hidden sm:inline text-slate-500">({formatDuration(duration)})</span>}</span>
              </div>
              <button type="button" onClick={() => setDuration((d) => Math.min(480, d + 5))} aria-label="Aumentar 5 minutos" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
            <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1.5 pb-1">
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)} className={`shrink-0 h-7 px-2.5 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-colors whitespace-nowrap ${duration === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {formatDuration(d)}
                </button>
              ))}
            </div>
            {submitted && errors.duration && <p className="text-[10px] sm:text-[11px] font-bold text-rose-600">{errors.duration}</p>}
          </section>

          {/* Precificação */}
          <section className="space-y-4">
            <h3 className="text-[12px] sm:text-[13px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">3. Financeiro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="proc-price" className={labelCls}>Preço Venda <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-[12px] font-bold text-slate-400">R$</span>
                  <input id="proc-price" value={price} onChange={money(price, setPrice)} inputMode="decimal" placeholder="0,00" className={`${inputCls} pl-9 sm:pl-10 tabular-nums ${submitted && errors.price ? inputErr : inputOk}`} />
                </div>
                {submitted && errors.price && <p className="text-[10px] sm:text-[11px] font-bold text-rose-600">{errors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="proc-cost" className={labelCls}>Custo Insumos</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-[12px] font-bold text-slate-400">R$</span>
                  <input id="proc-cost" value={cost} onChange={money(cost, setCost)} inputMode="decimal" placeholder="0,00" className={`${inputCls} pl-9 sm:pl-10 tabular-nums ${inputOk}`} />
                </div>
              </div>
            </div>

            {/* Resumo financeiro ao vivo */}
            <div className="bg-[#0B0F19] rounded-2xl p-4 sm:p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4 gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Resultado / sessão</span>
                {priceN > 0 && costN > 0 && (
                  <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border whitespace-nowrap ${margin >= 0.6 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : margin >= 0.3 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                    {margin >= 0.6 ? "Alta" : margin >= 0.3 ? "Saudável" : margin >= 0 ? "Baixa" : "Prejuízo"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Lucro</p>
                  <p className={`text-[14px] sm:text-[18px] font-black leading-tight mt-0.5 tabular-nums truncate ${profit < 0 ? "text-rose-400" : ""}`}>{formatBRL(profit)}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Margem</p>
                  <p className="text-[14px] sm:text-[18px] font-black leading-tight mt-0.5 tabular-nums truncate">{priceN > 0 ? `${(margin * 100).toFixed(1)}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Valor / hora</p>
                  <p className="text-[14px] sm:text-[18px] font-black leading-tight mt-0.5 tabular-nums truncate">{priceN > 0 ? formatBRL(perHour) : "—"}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-4">
                <div className={`h-full rounded-full transition-all ${marginTone(margin)}`} style={{ width: `${Math.max(0, Math.min(100, margin * 100))}%` }} />
              </div>
            </div>
            {costN > priceN && priceN > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-4 py-3 flex gap-2 sm:gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] font-medium text-amber-900">O custo está acima do preço de venda: cada sessão gera prejuízo.</p>
              </div>
            )}
          </section>

          {/* Pós-atendimento */}
          <section className="space-y-3">
            <h3 className="text-[12px] sm:text-[13px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">4. Pós-Atendimento</h3>
            <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1.5 pb-1">
              {([null, 15, 30, 60, 90, 180, 365] as (number | null)[]).map((d) => (
                <button key={String(d)} type="button" onClick={() => setReturnDays(d)} className={`shrink-0 h-8 px-3 rounded-lg text-[10px] sm:text-[11px] font-bold border transition-colors whitespace-nowrap ${returnDays === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {d === null ? "Sem retorno" : d === 365 ? "1 ano" : `${d} dias`}
                </button>
              ))}
            </div>
          </section>

          {/* Disponibilidade */}
          <section>
            <button type="button" onClick={() => setActive((a) => !a)} aria-pressed={active} className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 sm:py-3.5 text-left transition-colors shadow-sm">
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] sm:text-[13px] font-bold text-slate-900 truncate">Disponível para agendamento</span>
                <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Proc. inativos não aparecem na agenda.</span>
              </span>
              <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : ""}`} />
              </span>
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={saving} className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="w-full sm:w-auto h-11 sm:h-10 px-5 sm:px-6 rounded-xl text-[12px] sm:text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span className="truncate">{mode === "edit" ? "Salvar" : "Cadastrar"}</span>
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
    <div className={`${bg} border ${border} rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0 h-full`}>
      <div className="flex justify-between items-center mb-2 sm:mb-1.5 gap-2">
        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${titleColor} truncate`}>{title}</span>
        <div className={`shrink-0 ${valColor === 'text-white' ? 'text-blue-400' : 'text-blue-600'}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse mt-2">
          <div className="h-6 w-24 bg-slate-100/50 rounded" />
          <div className="h-2.5 w-full bg-slate-100/50 rounded" />
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl sm:text-2xl font-black ${valColor} leading-none truncate tabular-nums`}>{value}</span>
            {suffix && <span className={`text-[9px] sm:text-[10px] font-bold ${titleColor} truncate`}>{suffix}</span>}
          </div>
          <p className={`text-[10px] sm:text-[11px] font-medium mt-1.5 ${subColor} truncate`}>{sub}</p>
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
      className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-[12px] font-bold border flex items-center gap-1.5 transition-colors shadow-sm shrink-0 whitespace-nowrap ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented({ value, onChange, options }: any) {
  return (
    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner overflow-x-auto scrollbar-hide w-full sm:w-auto">
      {options.map((o: any) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`flex-1 sm:flex-none px-3 sm:px-4 h-7 sm:h-8 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors whitespace-nowrap ${value === o.v ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
      className={`relative w-8 sm:w-9 h-4 sm:h-5 rounded-full shrink-0 transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

function Th({ children, sortable, active, dir, onClick, className = "" }: any) {
  const content = (
    <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${active ? "text-slate-900" : "text-slate-400"}`}>
      {children}
      {sortable && active && (dir === "asc" ? <ArrowUp className="w-3 h-3 shrink-0" /> : <ArrowDown className="w-3 h-3 shrink-0" />)}
    </span>
  );
  return (
    <th className={`py-3 pr-3 sm:pr-4 font-normal ${className}`}>
      {sortable ? (
        <button onClick={onClick} className="hover:text-slate-900 transition-colors text-left">
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
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors ${danger ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
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
      className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[11px] sm:text-[12px] font-bold transition-colors ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}
      {children}
    </button>
  );
}