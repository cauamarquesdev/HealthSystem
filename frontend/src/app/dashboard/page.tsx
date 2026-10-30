"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Kanban,
  Settings,
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
  Download,
  Sparkles,
  TrendingUp,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  Gift,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  UserCircle,
  HelpCircle,
  Briefcase,
  Loader2,
  AlertTriangle,
  X,
  CreditCard,
  User,
  Camera,
  LogOut,
  CircleDollarSign,
  Receipt,
  Wallet
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADOS DOS FILTROS E MODAIS
  const [dateFilter, setDateFilter] = useState("Hoje");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isEligibleOpen, setIsEligibleOpen] = useState(false);

  // ESTADOS DO NOVO SHELL (USER PROFILE)
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/150?img=5");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BUSCA OS DADOS REAIS DO NESTJS COM BASE NO FILTRO
  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/dashboard/metrics?filter=${dateFilter}`);
        if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
        // PLANO B: Se a API falhar, carrega a tela com dados zerados em vez de travar no loading
        setMetrics({
          faturamentoHoje: "0,00",
          agendamentosHoje: 0,
          pacientesAtendidos: 0,
          ticketMedio: "0,00",
          taxaComparecimento: "0%",
          conversaoAvaliacoes: "0%",
          ocupacaoAgenda: "0%",
          recorrencia: "0%",
          agenda: [],
          crm: [],
          alerts: [],
          mixChart: []
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetrics();
  }, [dateFilter]);

  // EFEITO DO DROPDOWN DE USUÁRIO (SHELL)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTriggerClick = () => setIsOpen(!isOpen);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);
    setIsOpen(false);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Simula tempo de upload
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Upload concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload da imagem", error);
      setAvatar("https://i.pravatar.cc/150?img=5");
    } finally {
      setIsUploading(false);
    }
  };

  // FUNÇÃO PARA EXPORTAR RELATÓRIO PARA EXCEL (CSV)
  const handleExportExcel = () => {
    const csvRows = [
      ["Relatorio de Performance Clinica", `Filtro: ${dateFilter}`],
      [""],
      ["Metrica", "Valor"],
      ["Faturamento", `R$ ${metrics?.faturamentoHoje || "0"}`],
      ["Agendamentos", metrics?.agendamentosHoje || "0"],
      ["Pacientes Atendidos", metrics?.pacientesAtendidos || "0"],
      ["Ticket Medio", `R$ ${metrics?.ticketMedio || "0"}`],
      ["Taxa de Comparecimento", metrics?.taxaComparecimento || "0%"],
      ["Conversao de Avaliacoes", metrics?.conversaoAvaliacoes || "0%"],
      ["Recorrencia", metrics?.recorrencia || "0%"]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Dashboard_${dateFilter.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-40 flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* ==================== SIDEBAR ÚNICA (NOVO SHELL) ==================== */}
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
          <Group title="Visão Geral">
            <Item icon={LayoutDashboard} label="Dashboard" href="/dashboard" active />
            <Item icon={Bell} label="Central de Notificações" href="/notificacoes" />
          </Group>
          <Group title="Operação">
            <Item icon={Calendar} label="Agenda da Dra. Joana" href="/" />
            <Item icon={Users} label="Clientes" href="/pacientes" />
            <Item icon={Kanban} label="CRM Kanban" href="/crm" />
            <Item icon={Stethoscope} label="Procedimentos" href="/procedimentos" />
            <Item icon={DoorOpen} label="Recursos" href="/recursos" />
          </Group>
          <Group title="Financeiro">
            <Item icon={CircleDollarSign} label="Visão Geral" href="/financeiro" />
          </Group>
          <Group title="Gestão Clínica">
            <Item icon={FileText} label="Prontuários" href="/prontuarios" />
            <Item icon={Star} label="Avaliações Estéticas" href="/avaliacoes" />
            <Item icon={BookOpen} label="Protocolos" href="/protocolos" />
            <Item icon={ImageIcon} label="Fotos Clínicas" href="/fotos" />
            <Item icon={FileSignature} label="Termos & Documentos" href="/documentos" />
          </Group>
        </div>

        {/* BOTTOM USER PROFILE MENU (NOVO SHELL) */}
        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white" ref={menuRef}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
            />
            {isOpen && (
                <div className="absolute bottom-24 left-4 mb-4 w-[228px] rounded-xl border border-gray-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
                    <div className="px-3 py-2 pb-3 mb-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Dra. Joana Oliveira</p>
                        <p className="text-xs text-gray-500">Diretora Médica & Sócia</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                            <User size={16} />
                            Meu Perfil
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Camera size={16} />
                            Alterar Foto
                        </button>
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                            <Settings size={16} />
                            Configurações
                        </button>
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2">
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                            <LogOut size={16} />
                            Sair do sistema
                        </button>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 overflow-hidden rounded-full border border-slate-200 shrink-0 bg-gray-100">
                    {isUploading ? (
                        <div className="flex h-full w-full items-center justify-center bg-black/40">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                    ) : (
                        <img src={avatar} alt="User" className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">Dra. Joana Oliveira</span>
                    <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Diretora Médica & Sócia</span>
                </div>
                <Settings 
                    onClick={handleTriggerClick}
                    className={`w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600 transition-transform duration-300 ${isOpen ? 'text-gray-700 rotate-90' : ''}`} 
                />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Plano Enterprise</span>
                <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5" /> Suporte
                </button>
            </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc]">
        {/* HEADER (NOVO SHELL MANTENDO SEUS BOTÕES DE AÇÃO) */}
        <header className="h-[72px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 shrink-0">
              <span>Visão Geral</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-bold">Dashboard Executivo</span>
            </div>
            
            <div className="h-6 w-px bg-slate-200 shrink-0"></div>
            
            <div className="relative w-[340px] shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">/</kbd>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 ml-2 shrink-0">
              <MapPin className="w-4 h-4" /> Unidade Av Saudade (Matriz)
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button onClick={() => setIsNewSaleOpen(true)} className="h-9 px-4 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Nova Venda
            </button>
            <button onClick={() => setIsNewAppointmentOpen(true)} className="h-9 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Agendamento
            </button>
            
            <div className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm ml-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </div>
            
            <img
              src={avatar} // Sincronizado com o state local do arquivo!
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-slate-200 ml-2 cursor-pointer object-cover shadow-sm"
            />
          </div>
        </header>

        {/* DASHBOARD BODY (CONTEÚDO ORIGINAL INTACTO) */}
        <div className="flex-1 min-h-0 flex">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-bold text-slate-600">Calculando inteligência de dados...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="max-w-[1400px] mx-auto space-y-6">
                
                {/* GREETING & FILTERS */}
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      Unidade Av Saudade - Operação em Tempo Real
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                      Bom dia, Dra. Joana!
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      Resumo executivo, performance clínica e inteligência
                      financeira da Ellevare Estética Avançada {dateFilter.toLowerCase()}.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                      {["Hoje", "Esta semana", "Este mês"].map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setDateFilter(t)}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${dateFilter === t ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          {t}
                        </button>
                      ))}
                      <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-slate-500 flex items-center gap-2 border-l border-slate-200 ml-1 pl-3">
                        <Calendar className="w-3.5 h-3.5" /> {dateFilter === "Hoje" ? "24 Out" : dateFilter}
                      </button>
                    </div>
                    <button onClick={handleExportExcel} className="h-9 px-4 rounded-xl font-bold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                      <Download className="w-3.5 h-3.5" /> Exportar Relatório
                    </button>
                  </div>
                </div>

                {/* INTELLIGENCE BANNER */}
                <div className="bg-[#0f172a] rounded-3xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                  <div className="relative z-10 flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        HealthSystem Intelligence
                      </span>
                      <h3 className="text-white font-bold text-lg leading-tight mt-1 mb-2">
                        OPORTUNIDADE CLÍNICA ATIVA •{" "}
                        <span className="text-emerald-400">
                          R$ 58.400,00 estimado
                        </span>
                      </h3>
                      <p className="text-sm font-medium text-slate-300 max-w-2xl leading-relaxed mb-3">
                        Identificamos 14 clientes com ciclo de Toxina Botulínica e
                        Bioestimuladores realizados há 120+ dias sem consulta de
                        preservação tecidual programada.
                      </p>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />{" "}
                          84% de conversão histórica no recall D-120
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>{" "}
                          Ácido Hialurônico Ultra Deep (Lote #4092) : 3 ampolas
                          restantes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col gap-2 shrink-0">
                    <button className="h-11 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                      Disparar WhatsApp Personalizado
                    </button>
                    <button onClick={() => setIsEligibleOpen(true)} className="h-11 px-6 rounded-xl font-bold text-sm text-blue-300 hover:bg-slate-800 transition-colors border border-blue-500/30 flex items-center justify-center gap-2">
                      Ver Elegíveis (14) <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* KPI GRID */}
                <div className="grid grid-cols-4 gap-5">
                  <KPICard
                    title="Faturamento Hoje"
                    value={`R$ ${metrics?.faturamentoHoje || "0"}`}
                    decimal=",00"
                    trend="+14.2%"
                    trendText="Meta 105% atingida"
                    isPositive
                    color="emerald"
                  />
                  <KPICard
                    title="Agendamentos Hoje"
                    value={metrics?.agendamentosHoje || "0"}
                    subtitle="atend"
                    customVisual={
                      <div className="flex h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div className="w-[70%] bg-blue-500 rounded-full"></div>
                        <div className="w-[20%] bg-amber-400 rounded-full"></div>
                        <div className="w-[10%] bg-rose-400 rounded-full"></div>
                      </div>
                    }
                    textVisual={`${metrics?.pacientesAtendidos || "0"} confirmados • ${metrics?.agendamentosHoje || "0"} na grade`}
                    color="blue"
                  />
                  <KPICard
                    title="Pacientes Atendidas"
                    value={metrics?.pacientesAtendidos || "0"}
                    subtitle={`/ ${metrics?.agendamentosHoje || "0"}`}
                    trend="Pontualidade 95.0%"
                    trendText="No prazo"
                    isPositive={false}
                    neutral
                    color="blue"
                  />
                  <KPICard
                    title="Taxa de Comparecimento"
                    value={metrics?.taxaComparecimento || "0%"}
                    trend="+3.2%"
                    trendText="Zero no-shows matinal"
                    isPositive
                    color="emerald"
                  />
                  <KPICard
                    title="Ticket Médio Geral"
                    value={`R$ ${metrics?.ticketMedio || "0"}`}
                    trend="+8.5%"
                    trendText="Mix Premium injetáveis"
                    isPositive
                    color="emerald"
                  />
                  <KPICard
                    title="Conversão Avaliações"
                    value={metrics?.conversaoAvaliacoes || "0%"}
                    trend="+5.1%"
                    trendText="13 orçamentos fechados"
                    isPositive
                    color="emerald"
                  />
                  <KPICard
                    title="Ocupação da Agenda"
                    value={metrics?.ocupacaoAgenda || "0%"}
                    trend="Salas 1, 2 e 3 a 100%"
                    trendText="5 salas ativas"
                    neutral
                    color="amber"
                  />
                  <KPICard
                    title="Recorrência Pacientes"
                    value={metrics?.recorrencia || "0%"}
                    trend="+4.0%"
                    trendText="Planos anuais"
                    isPositive
                    color="emerald"
                  />
                </div>

                {/* CHARTS ROW */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Fluxo Line Chart */}
                  <div className="col-span-2 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          Fluxo de Faturamento & Receitas por Horário
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Comparativo de performance horária. Realizado vs Projetado
                          na Unidade Av Saudade (Matriz)
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <div className="w-2.5 h-2.5 rounded-sm bg-blue-600"></div>{" "}
                          Realizado (R$ {metrics?.faturamentoHoje || "0"})
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-sm border-2 border-slate-300 border-dashed"></div>{" "}
                          Projetado (R$ 56.000)
                        </span>
                      </div>
                    </div>

                    <div className="h-64 w-full relative mt-4">
                      <svg
                        viewBox="0 0 800 200"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,150 L800,150 M0,100 L800,100 M0,50 L800,50 M0,0 L800,0"
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <path
                          d="M0,160 Q 100,140 200,120 T 400,60 T 600,100 T 800,90"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="2"
                          strokeDasharray="6 6"
                        />
                        <path
                          d="M0,170 Q 100,150 200,140 T 400,10 T 550,60 T 600,130 T 700,90 T 800,100 L800,200 L0,200 Z"
                          fill="url(#fillBlue)"
                        />
                        <path
                          d="M0,170 Q 100,150 200,140 T 400,10 T 550,60 T 600,130 T 700,90 T 800,100"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                        />
                        <circle
                          cx="400"
                          cy="10"
                          r="5"
                          fill="#fff"
                          stroke="#2563eb"
                          strokeWidth="3"
                          className="drop-shadow-md"
                        />
                      </svg>

                      <div className="absolute left-[50%] top-[-10px] -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg">
                        Pico R$ 14.800
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                      </div>

                      <div className="absolute bottom-0 translate-y-6 w-full flex justify-between text-[10px] font-bold text-slate-400">
                        <span>09:00</span>
                        <span>10:00</span>
                        <span>12:00</span>
                        <span>14:00 (Pico)</span>
                        <span>16:00</span>
                        <span>18:00</span>
                        <span>20:00</span>
                      </div>
                    </div>

                    <div className="mt-10 bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Maior conversão do dia:
                        Sessão das 14h somou 4 procedimentos Full Face.
                      </span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                        Projeção diária final: R$ 56.400
                      </span>
                    </div>
                  </div>

                  {/* Mix Donut Chart */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          Mix por Categoria
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Distribuição percentual da receita
                        </p>
                      </div>
                      <MoreVertical className="w-5 h-5 text-slate-400 cursor-pointer" />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative w-48 h-48">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full -rotate-90 drop-shadow-xl"
                        >
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#94a3b8" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="226.08" />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38bdf8" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="190.912" className="origin-center rotate-[36deg]" />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e40af" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="130.624" className="origin-center rotate-[86.4deg]" />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#2563eb" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="120.576" className="origin-center rotate-[172.8deg]" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Total Geral
                          </span>
                          <span className="text-xl font-black text-slate-900 leading-none mt-1">
                            R$ {metrics?.faturamentoHoje || "0"}
                          </span>
                        </div>
                      </div>

                      <div className="w-full mt-6 space-y-3">
                        {metrics?.mixChart && metrics.mixChart.length > 0 ? (
                          metrics.mixChart.map((item: any, idx: number) => (
                            <LegendItem
                              key={idx}
                              color={item.color}
                              label={item.label}
                              pct={item.pct}
                              val={item.val}
                            />
                          ))
                        ) : (
                          <>
                            <LegendItem color="bg-blue-600" label="Injetáveis & Harmonização" pct="52%" val="R$ 25.298" />
                            <LegendItem color="bg-indigo-800" label="Tecnologias & Lasers" pct="24%" val="R$ 11.622" />
                            <LegendItem color="bg-sky-400" label="Peelings & Estética Facial" pct="14%" val="R$ 6.811" />
                            <LegendItem color="bg-slate-400" label="Dermocosméticos Home Care" pct="10%" val="R$ 4.919" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM LISTS ROW */}
                <div className="grid grid-cols-3 gap-6 pb-10">
                  {/* Agenda Col */}
                  <div className="col-span-2 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                          Agenda Cirúrgica & Procedimentos
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">
                            {metrics?.agenda?.length || 0} Hoje
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Linha do tempo e prontuários do dia em andamento
                        </p>
                      </div>
                      <div className="flex gap-4 border-b border-slate-100">
                        <Tab active label={`Todos (${metrics?.agenda?.length || 0})`} />
                        <Tab label="Em Curso (0)" />
                        <Tab label="A Confirmar (0)" />
                        <Tab label="Concluídos (0)" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {metrics?.agenda && metrics.agenda.length > 0 ? (
                        metrics.agenda.map((item: any, idx: number) => (
                          <AgendaItem
                            key={idx}
                            time={item.time}
                            duration={item.duration}
                            status={item.status}
                            statusColor={item.statusColor}
                            name={item.name}
                            room={item.room}
                            doc={item.doc}
                            procedure={item.procedure}
                            val={item.val}
                            buttonLabel="Detalhes"
                            active={item.active}
                            ghost={item.ghost}
                          />
                        ))
                      ) : (
                        <div className="py-8 text-center flex flex-col items-center gap-2 text-slate-400">
                          <Calendar className="w-6 h-6 opacity-50" />
                          <span className="text-xs font-bold">Nenhum agendamento para hoje no banco de dados.</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors">
                      <span>Ver grade completa de horários →</span>
                      <span className="text-slate-400 font-medium">
                        Atualizado há 2 min
                      </span>
                    </div>
                  </div>

                  {/* CRM & Alertas Col */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                            Negociações no CRM
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-lg font-bold">
                              R$ 0,00
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Leads qualificados aguardando fechamento hoje
                          </p>
                        </div>
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="space-y-4">
                        {metrics?.crm && metrics.crm.length > 0 ? (
                          metrics.crm.map((item: any, idx: number) => (
                            <CRMItem
                              key={idx}
                              name={item.name}
                              status={item.status}
                              statusColor={item.statusColor}
                              proc={item.proc}
                              follow={item.follow}
                              val={item.val}
                              action={item.action}
                            />
                          ))
                        ) : (
                          <div className="py-4 text-center flex flex-col items-center gap-2 text-slate-400">
                            <Kanban className="w-6 h-6 opacity-50" />
                            <span className="text-xs font-bold">Sem negociações pendentes no CRM.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 text-sm">
                        <Gift className="w-4 h-4 text-[#8b5cf6]" /> Aniversariantes
                        & Alertas
                      </h3>
                      <div className="space-y-3">
                        {metrics?.alerts && metrics.alerts.length > 0 ? (
                          metrics.alerts.map((item: any, idx: number) => (
                            <AlertItem
                              key={idx}
                              iconName={item.iconName}
                              color={item.color}
                              title={item.title}
                              sub={item.sub}
                              action={item.action}
                              noBtn={item.noBtn}
                            />
                          ))
                        ) : (
                          <div className="py-2 text-center text-slate-400">
                            <span className="text-xs font-bold">Sem alertas por agora.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MODAIS ==================== */}

      {/* MODAL NOVA VENDA */}
      <AnimatePresence>
        {isNewSaleOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewSaleOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Lançar Nova Venda</h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">Registre um novo contrato ou procedimento pago.</p>
                </div>
                <button onClick={() => setIsNewSaleOpen(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paciente</label>
                  <input type="text" placeholder="Buscar paciente..." className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimento / Plano</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] text-slate-700 focus:outline-none focus:border-blue-500">
                    <option>Selecione...</option>
                    <option>Harmonização Full Face</option>
                    <option>Toxina Botulínica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500">
                      <input type="radio" name="payment" className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-[12px] font-bold text-slate-700">Cartão de Crédito</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500">
                      <input type="radio" name="payment" className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-[12px] font-bold text-slate-700">PIX</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsNewSaleOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Confirmar Venda</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL NOVO AGENDAMENTO */}
      <AnimatePresence>
        {isNewAppointmentOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewAppointmentOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Novo Agendamento Clínico</h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">Reserve um horário na agenda inteligente.</p>
                </div>
                <button onClick={() => setIsNewAppointmentOpen(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="space-y-4 col-span-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selecione o Paciente</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Buscar por nome ou CPF..." className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profissional</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] text-slate-700 focus:outline-none focus:border-blue-500">
                    <option>Dra. Joana Oliveira</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimento</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] text-slate-700 focus:outline-none focus:border-blue-500">
                    <option>Avaliação Estética</option>
                    <option>Harmonização Facial</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</label>
                  <input type="date" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Horário</label>
                  <input type="time" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsNewAppointmentOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Reservar Horário</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ELEGÍVEIS (INTELIGÊNCIA) */}
      <AnimatePresence>
        {isEligibleOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEligibleOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600"/> Pacientes Elegíveis (14)</h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">Ciclo de Toxina & Bioestimuladores ({'>'}120 dias).</p>
                </div>
                <button onClick={() => setIsEligibleOpen(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-5 h-5 text-slate-500"/></div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900">Paciente VIP 0{i}</h4>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Última visita: há {120 + (i * 10)} dias</span>
                      </div>
                    </div>
                    <button className="bg-[#128C7E] text-white p-2 rounded-lg shadow-sm hover:bg-[#075E54] transition-colors"><MessageCircle className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Estimativa: R$ 58.400,00</span>
                <button className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Disparar WhatsApp em Massa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- SUBCOMPONENTES DO MENU LATERAL (SHELL) ---
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">{title}</span>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  );
}

function Item({ icon: Icon, label, active, href }: any) {
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

// --- COMPONENTES DO DASHBOARD (CARDS, LISTAS) ---
function KPICard({
  title,
  value,
  subtitle,
  decimal,
  trend,
  trendText,
  isPositive,
  neutral,
  customVisual,
  textVisual,
  color,
}: any) {
  const trendColor = neutral
    ? "text-amber-500 bg-amber-50"
    : isPositive
      ? "text-emerald-600 bg-emerald-50"
      : "text-rose-600 bg-rose-50";
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between group hover:border-slate-300 transition-colors">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {title}
          </span>
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
            <Activity className="w-3 h-3 text-blue-600" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900">{value}</span>
          {decimal && (
            <span className="text-sm font-bold text-slate-400">{decimal}</span>
          )}
          {subtitle && (
            <span className="text-xs font-bold text-slate-400">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        {trend && (
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trendColor}`}
            >
              {trend}
            </span>
            <span className="text-[10px] font-bold text-slate-400 truncate">
              {trendText}
            </span>
          </div>
        )}
        {textVisual && (
          <span className="text-[10px] font-bold text-slate-500">
            {textVisual}
          </span>
        )}
      </div>
      {customVisual}
    </div>
  );
}

function LegendItem({ color, label, pct, val }: any) {
  return (
    <div className="flex items-center justify-between text-xs font-bold">
      <div className="flex items-center gap-2 text-slate-600">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{pct}</span>
        <span className="text-slate-900">{val}</span>
      </div>
    </div>
  );
}

function Tab({ label, active }: any) {
  return (
    <button
      className={`pb-3 text-xs font-bold transition-all border-b-2 ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
    >
      {label}
    </button>
  );
}

function AgendaItem({
  time,
  duration,
  status,
  statusColor,
  name,
  room,
  doc,
  procedure,
  val,
  buttonLabel,
  active,
  ghost,
}: any) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center w-10 shrink-0">
        <span className="text-xs font-black text-slate-900">{time}</span>
        <span className="text-[10px] font-bold text-slate-400">{duration}</span>
      </div>
      <div
        className={`flex-1 rounded-2xl p-4 transition-all ${active ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" : "bg-white border border-slate-100"}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${statusColor}`}
            >
              {status}
            </span>
            <span
              className={`text-[10px] font-bold ${active ? "text-slate-400" : "text-slate-400"}`}
            >
              {room}
            </span>
          </div>
          <button
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 ${active ? "bg-white/10 text-white hover:bg-white/20" : ghost ? "text-slate-500 hover:bg-slate-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {active && <FileText className="w-3 h-3" />} {buttonLabel}
          </button>
        </div>
        <h4
          className={`font-black text-sm mb-1 ${active ? "text-white" : "text-slate-900"}`}
        >
          {name}
        </h4>
        <div
          className={`text-xs font-medium space-y-0.5 ${active ? "text-slate-400" : "text-slate-500"}`}
        >
          <p className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> {procedure}
          </p>
          <p className="flex items-center gap-1.5">
            <Stethoscope className="w-3 h-3" /> {doc} {val && <span>• {val}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function CRMItem({
  name,
  status,
  statusColor,
  proc,
  follow,
  val,
  action,
}: any) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-bold text-sm text-slate-900">{name}</h4>
          <span
            className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest ${statusColor}`}
          >
            {status}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium truncate w-48">
          {proc}
        </p>
        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" /> {follow}
        </p>
      </div>
      <div className="text-right">
        <span className="block font-black text-sm text-slate-900 mb-1">
          {val}
        </span>
        <button className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
          {action}
        </button>
      </div>
    </div>
  );
}

function AlertItem({ iconName, color, title, sub, action, noBtn }: any) {
  const icons: any = { Gift, Clock, AlertTriangle, Bell };
  const IconComponent = icons[iconName] || Bell;

  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-[11px] text-slate-900">{title}</h4>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>
        </div>
      </div>
      {!noBtn ? (
        <button className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
          {action}
        </button>
      ) : (
        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {action}
        </span>
      )}
    </div>
  );
}
