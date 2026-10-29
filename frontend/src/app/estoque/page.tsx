"use client";

import React, { useState } from "react";
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
  Sparkles,
  X,
  Plus,
  Bell,
  ChevronDown,
  ChevronRight,
  UserCircle,
  HelpCircle,
  Briefcase,
  Settings,
  Download,
  Filter,
  MoreVertical,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Edit3,
  Package,
  ScanBarcode,
  FileDigit,
  Box,
  Thermometer,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  Syringe,
} from "lucide-react";

export default function EstoquePage() {
  const [selectedItem, setSelectedItem] = useState(1);

  const INVENTORY = [
    {
      id: 1,
      name: "Juvederm Volux 1.0ml",
      sub: "Ac. Hialurônico Reticulado • Allergan",
      category: "Preenchedores",
      stock: 36,
      min: 2,
      unit: "un.",
      icon: <Box className="w-4 h-4 text-blue-600" />,
      color: "blue",
      selected: true,
    },
    {
      id: 2,
      name: "Botox 50 UI",
      sub: "Toxina Botulínica A • Allergan Aesthetics",
      category: "Toxinas",
      stock: 12,
      min: 2,
      unit: "un.",
      alert: true,
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      color: "rose",
    },
    {
      id: 3,
      name: "Radiesse Duo 1.5ml",
      sub: "Hidroxiapatita de Cálcio • Merz / Galderma",
      category: "Bioestimulador",
      stock: 22,
      min: 1,
      unit: "un.",
      icon: <Box className="w-4 h-4 text-slate-600" />,
      color: "slate",
    },
    {
      id: 4,
      name: "Microcânula Estéril 22G 50mm",
      sub: "Cânula com agulha guia • BD UltraFine",
      category: "Descartáveis",
      stock: 120,
      min: 10,
      unit: "un.",
      icon: <Package className="w-4 h-4 text-slate-600" />,
      color: "slate",
    },
    {
      id: 5,
      name: "Lidocaína 2% c/ Epinefrina",
      sub: "Frasco 20ml 1:200.000 • Cristália",
      category: "Anestésicos",
      stock: 48,
      min: 5,
      unit: "amp.",
      icon: <DropletIcon className="w-4 h-4 text-indigo-600" />,
      color: "indigo",
    },
    {
      id: 6,
      name: "Fios PDO Espiculados 19G 100mm",
      sub: "i-Thread (Box c/ 20un) • Medicos",
      category: "Fios de Sustentação",
      stock: 6,
      min: 1,
      unit: "caixas",
      icon: <Activity className="w-4 h-4 text-emerald-600" />,
      color: "emerald",
    },
    {
      id: 7,
      name: "Sculptra 150mg",
      sub: "Ácido Poli-L-Láctico (PLLA) • Galderma",
      category: "Bioestimulador",
      stock: 18,
      min: 1,
      unit: "frascos",
      icon: <Box className="w-4 h-4 text-slate-600" />,
      color: "slate",
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* ==================== SIDEBAR ==================== */}
      <aside className="w-[260px] min-w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 h-full">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-slate-900">HealthSystem</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">
                Clinical Suite
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between cursor-pointer group">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 mb-0.5">
                Ellevare Estética Avançada
              </span>
              <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                Unidade Av Saudade (Matriz)
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Visão Geral
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" />
              <SidebarItem icon={Bell} label="Central de Notificações" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Operação
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={Calendar} label="Agenda" />
              <SidebarItem icon={Users} label="Clientes" />
              <SidebarItem icon={Stethoscope} label="Procedimentos" />
              <SidebarItem
                icon={Package}
                label="Estoque & Almoxarifado"
                active
              />
              <SidebarItem icon={Kanban} label="CRM Kanban" />
              <SidebarItem icon={DoorOpen} label="Recursos" />
              <SidebarItem icon={ListTodo} label="Lista de Espera" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Gestão Clínica
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={FileText} label="Prontuários" />
              <SidebarItem icon={Star} label="Avaliações Estéticas" />
              <SidebarItem icon={BookOpen} label="Protocolos" />
              <SidebarItem icon={ImageIcon} label="Fotos Clínicas" />
              <SidebarItem icon={FileSignature} label="Termos & Documentos" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Comercial
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={Briefcase} label="Vendas" />
            </nav>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <img
              src="https://i.pravatar.cc/150?img=5"
              alt="User"
              className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">
                Dra. Joana Oliveira
              </span>
              <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                Diretora Médica & Sócia
              </span>
            </div>
            <Settings className="w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200/50">
              Plano Enterprise
            </span>
            <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700">
              <HelpCircle className="w-3.5 h-3.5" /> Suporte
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc]">
        {/* HEADER GLOBAL */}
        <header className="h-[72px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 shrink-0">
              <span>Operação</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Almoxarifado & Estoque</span>
            </div>
            <div className="h-6 w-px bg-slate-200 shrink-0"></div>
            <div className="relative w-[340px] shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 ml-2 shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" /> Unidade Av Saudade
              (Matriz)
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button className="h-10 px-5 rounded-xl font-bold text-[13px] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Entrada de Lote
            </button>
            <button className="h-10 px-6 rounded-xl font-bold text-[13px] text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Agendamento
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </div>
            <HelpCircle className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 ml-1" />
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* TOP CONTROLS (Fixo no topo da tela) */}
          <div className="px-8 pt-6 pb-4 shrink-0 bg-white border-b border-slate-200 z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  Operação <ChevronRight className="w-3 h-3" /> Catálogo Clínico
                  & Insumos <ChevronRight className="w-3 h-3" /> Almoxarifado &
                  Farmácia Clínica
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none">
                    Estoque de Insumos & Medicamentos
                  </h1>
                  <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Farmácia Ativa
                  </span>
                </div>
                <p className="text-[13px] font-medium text-slate-500 max-w-3xl">
                  Controle físico-financeiro de frascos, seringas, cânulas e
                  anestésicos com rastreabilidade ANVISA, gestão de lotes e
                  alerta preditivo de reposição.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <button className="h-9 px-5 rounded-xl font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm justify-center flex-1">
                    <ScanBarcode className="w-3.5 h-3.5" /> Inventário Rápido /
                    Bipagem
                  </button>
                  <button className="h-9 px-5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm justify-center flex-1">
                    <FileDigit className="w-3.5 h-3.5" /> Entrada de NF (XML)
                  </button>
                </div>
                <button className="h-9 px-5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm justify-center w-full">
                  <Plus className="w-3.5 h-3.5" /> Nova Entrada de Estoque
                </button>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <MetricCard
                title="VALOR TOTAL ALMOXARIFADO"
                value="R$ 184.650"
                decimal=",00"
                icon={<Briefcase className="w-4 h-4" />}
                sub="1.280 unidades físicas"
                trend="+4.2% giro"
                isPositive
              />
              <MetricCard
                title="LOTES EM RISCO / VENCIMENTO"
                value="4 Lotes"
                icon={<Box className="w-4 h-4" />}
                sub="< 60 dias (Atenção)"
                link="Ver lotes →"
              />
              <MetricCard
                title="PONTO DE PEDIDO CRÍTICO"
                value="3 Itens"
                icon={<AlertTriangle className="w-4 h-4" />}
                sub="Botox 50 UI (12 un.), Microcânulas, Fios ..."
                alert="Reposição Imediata"
                isAlert
              />
              <MetricCard
                title="CONFORMIDADE ANVISA / SNGPC"
                value="100%"
                icon={<ShieldCheck className="w-4 h-4" />}
                sub="Sincronizado hoje 08:42"
                trend="Auditoria Regular"
                isPositive
              />
              <MetricCard
                title="PREVISÃO RUPTURA (IA)"
                value="4.8 Dias"
                icon={<Sparkles className="w-4 h-4" />}
                sub="Base em 38 procedimentos agendados"
                trend="IA Preditiva"
                color="blue"
              />
            </div>

            {/* TABS */}
            <div className="flex gap-2 border-b border-slate-200 w-full mb-4">
              <Tab label="Catálogo de Procedimentos" count="49" />
              <Tab
                label="Estoque de Insumos & Medicamentos"
                count="68"
                active
              />
              <Tab
                label="Rastreabilidade de Lotes & Validade"
                count="114 lnk"
              />
            </div>

            {/* FILTERS */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative w-64 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por insumo..."
                    className="w-full h-9 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                  />
                </div>

                <button className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                  Todas as Categorias{" "}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                  Todos os Níveis{" "}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                  Todos os Fornecedores{" "}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros{" "}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                  Filtros Ativos:
                </span>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                  Unidade: Av Saudade (Matriz)
                </span>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1">
                  Apenas Ativos ANVISA <X className="w-3 h-3 cursor-pointer" />
                </span>
                <button className="text-[11px] font-bold text-slate-400 hover:text-slate-600 ml-2">
                  Limpar todos
                </button>
              </div>
            </div>
          </div>

          {/* SPLIT WORKSPACE: LIST + DETAILS */}
          <div className="flex-1 flex min-h-0 bg-[#f8fafc] p-6 gap-6">
            {/* LEFT PANE: LISTAGEM DE INSUMOS */}
            <div className="flex-[1.5] flex flex-col min-w-0">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[auto_2fr_1fr_1fr] gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                  <div className="w-4"></div>
                  <div>INSUMO & PRINCÍPIO ATIVO</div>
                  <div>CATEGORIA</div>
                  <div className="text-right pr-4">ESTOQUE / MÍNIMO</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {INVENTORY.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      className={`grid grid-cols-[auto_2fr_1fr_1fr] gap-4 px-5 py-4 border-b border-slate-50 items-center cursor-pointer transition-colors ${item.selected ? "bg-blue-50/40 border-l-4 border-l-blue-600" : "hover:bg-slate-50 border-l-4 border-l-transparent"}`}
                    >
                      <div className="w-4">
                        <input
                          type="checkbox"
                          checked={item.selected || false}
                          readOnly
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-${item.color}-50`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-slate-900 leading-tight truncate flex items-center gap-1.5">
                            {item.name}
                            {item.alert && (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-500 truncate block mt-0.5">
                            {item.sub}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right pr-4 flex items-center justify-end gap-3">
                        <span
                          className={`text-[13px] font-black ${item.alert ? "text-rose-600" : "text-slate-900"}`}
                        >
                          {item.stock} {item.unit}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 w-12 text-left border-l border-slate-200 pl-3">
                          Min: {item.min}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-medium text-slate-500">
                    Mostrando{" "}
                    <span className="font-bold text-slate-700">1 a 7</span> de
                    68 insumos cadastrados
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      Itens por página:
                      <select className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none font-bold text-slate-700">
                        <option>10</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-6 h-6 rounded bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                        1
                      </button>
                      <button className="w-6 h-6 rounded text-slate-600 hover:bg-slate-100 text-[11px] font-bold flex items-center justify-center">
                        2
                      </button>
                      <button className="w-6 h-6 rounded text-slate-600 hover:bg-slate-100 text-[11px] font-bold flex items-center justify-center">
                        3
                      </button>
                      <span className="text-slate-400 text-xs">...</span>
                      <button className="w-6 h-6 rounded text-slate-600 hover:bg-slate-100 text-[11px] font-bold flex items-center justify-center">
                        7
                      </button>
                      <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rastreabilidade Alert */}
              <div className="mt-4 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center shrink-0">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-[11px] font-bold text-indigo-900">
                      Rastreabilidade Sanitária Conforme RDC ANVISA nº 306/2002
                    </h4>
                    <p className="text-[10px] text-indigo-700/80 mt-0.5">
                      Todos os produtos injetáveis possuem registro de lote,
                      acondicionamento e temperatura validados para auditoria
                      sanitária.
                    </p>
                  </div>
                </div>
                <button className="h-9 px-4 rounded-lg font-bold text-[11px] text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm shrink-0">
                  <Download className="w-3 h-3" /> Exportar Livro SNGPC
                  (PDF/XML)
                </button>
              </div>
            </div>

            {/* RIGHT PANE: DETALHES (Visão 360 do Insumo) */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-w-[380px] max-w-[420px]">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {/* Header do Insumo */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Box className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-200">
                          #INS-104
                        </span>
                        <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                          <Thermometer className="w-2.5 h-2.5" /> Termolábil 2°C
                          a 8°C
                        </span>
                      </div>
                      <h2 className="text-[18px] font-black text-slate-900 leading-tight">
                        Juvederm Volux 1.0ml
                      </h2>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">
                        Allergan Aesthetics Brasil
                      </p>
                    </div>
                  </div>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Registro ANVISA
                  </span>
                  <span className="text-[12px] font-bold text-slate-800">
                    80143600112
                  </span>
                </div>

                {/* Cards de Status do Estoque */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      SALDO FÍSICO REAL
                    </span>
                    <span className="text-[15px] font-black text-slate-900 block leading-tight">
                      36 seringas
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 mt-1 block">
                      Em estoque central
                    </span>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-1">
                      RESERVADO HOJE
                    </span>
                    <span className="text-[15px] font-black text-blue-900 block leading-tight">
                      4 seringas
                    </span>
                    <span className="text-[10px] font-medium text-blue-600/70 mt-1 block">
                      2 pacientes ag.
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">
                      DISPONÍVEL IMEDIATO
                    </span>
                    <span className="text-[15px] font-black text-emerald-900 block leading-tight">
                      32 livres
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600/70 mt-1 block">
                      Para agendamento
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      CUSTO MÉDIO UNIT.
                    </span>
                    <span className="text-[15px] font-black text-slate-900 block leading-tight">
                      R$ 740
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 mt-1 block">
                      Últ. NF: R$ 720,...
                    </span>
                  </div>
                </div>

                {/* Lotes no Almoxarifado */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600" /> Lotes no
                      Almoxarifado
                    </span>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700">
                      ver todos (2)
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[12px] font-black text-slate-900">
                          #JVD-9810-BR
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-slate-500 block leading-none">
                            Saldo Principal
                          </span>
                          <span className="text-[14px] font-black text-slate-900">
                            26{" "}
                            <span className="text-[10px] font-bold text-slate-400">
                              un.
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-600">
                          Validade: 08/2026
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 4.2°C Estável
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Refrigerador Farmacêutico
                        02 (Gaveta C)
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-colors opacity-80">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[12px] font-black text-slate-900">
                          #JVD-9640-BR
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-slate-500 block leading-none">
                            Secundário
                          </span>
                          <span className="text-[14px] font-black text-slate-900">
                            10{" "}
                            <span className="text-[10px] font-bold text-slate-400">
                              un.
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-600">
                          Validade: 12/2025
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 4.5°C Estável
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Refrigerador Farmacêutico
                        02 (Gaveta B)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Últimas Movimentações */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />{" "}
                      Últimas Movimentações
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Tempo Real
                    </span>
                  </div>
                  <div className="relative pl-3 space-y-4 before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                    <div className="relative flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-white z-10 mt-1.5 shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-[11px] font-bold text-slate-900">
                            -2 seringas{" "}
                            <span className="text-slate-500 font-medium">
                              (Baixa Clínica)
                            </span>
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0">
                            Hoje 14:15
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                          Atendimento #ATD-4412 • Dra. Joana
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white z-10 mt-1.5 shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-[11px] font-bold text-slate-900">
                            +20 seringas{" "}
                            <span className="text-slate-500 font-medium">
                              (Entrada NF)
                            </span>
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0">
                            Ontem 10:30
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                          NF-e #18.942 • Allergan Distribuidora
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-white z-10 mt-1.5 shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-[11px] font-bold text-slate-900">
                            -1 seringa{" "}
                            <span className="text-slate-500 font-medium">
                              (Baixa Clínica)
                            </span>
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0">
                            22 Out 15:40
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                          Procedimento Mandibular • Mariana P.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Stock Intelligence */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI STOCK INTELLIGENCE
                    </span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      18 Dias de Cobertura
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-blue-900/80 leading-relaxed relative z-10">
                    Consumo médio estimado em{" "}
                    <span className="font-bold">14 seringas/semana</span> com
                    base no histórico dos últimos 60 dias e agenda aberta.
                    Sugerido novo pedido até{" "}
                    <span className="font-bold text-blue-700">
                      04 de Novembro
                    </span>
                    .
                  </p>
                </div>
              </div>

              {/* Detail Footer Actions */}
              <div className="p-5 border-t border-slate-100 bg-white shrink-0 space-y-3 flex flex-col items-center">
                <div className="flex gap-3 w-full">
                  <button className="flex-1 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />{" "}
                    <span className="truncate">Ajuste / Baixa Manual</span>
                  </button>
                  <button className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg">
                    <Package className="w-4 h-4 shrink-0" />{" "}
                    <span className="truncate">Emitir Pedido</span>
                  </button>
                </div>
                <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline">
                  Ver Histórico Completo de Auditoria Fiscal
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function SidebarItem({ icon: Icon, label, active, href }: any) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      <Icon
        className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
      />
      <span className="truncate">{label}</span>
    </a>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  trendText,
  sub,
  isPositive,
  isAlert,
  link,
  decimal,
  alert,
  color,
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-w-0">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
          {title}
        </span>
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isAlert ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1 mb-1">
          <span
            className={`text-2xl font-black leading-none truncate ${isAlert ? "text-rose-600" : "text-slate-900"}`}
          >
            {value}
          </span>
          {decimal && (
            <span className="text-[11px] font-bold text-slate-400">
              {decimal}
            </span>
          )}
        </div>
        {sub && (
          <p className="text-[10px] font-medium text-slate-500 leading-tight mb-2 truncate">
            {sub}
          </p>
        )}
      </div>

      <div className="mt-auto">
        {trend && (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold flex items-center gap-0.5 ${color === "blue" ? "text-blue-600" : isPositive ? "text-emerald-600" : "text-slate-500"}`}
            >
              {trend}
            </span>
            <span className="text-[10px] font-medium text-slate-400 truncate">
              {trendText}
            </span>
          </div>
        )}
        {alert && (
          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {alert}
          </span>
        )}
        {link && (
          <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline">
            {link}
          </button>
        )}
      </div>
    </div>
  );
}

function Tab({ label, count, active }: any) {
  return (
    <button
      className={`pb-3 text-[12px] font-bold transition-all border-b-2 flex items-center gap-2 ${active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
    >
      {label}
      <span
        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
      >
        {count}
      </span>
    </button>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
    </svg>
  );
}
