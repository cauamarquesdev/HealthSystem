"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Activity, Star, Search, Plus, Download, Network, Tag, Palette, Sparkles, ShieldCheck, TrendingUp, Clock, MessageCircle, CheckCircle2, ChevronDown, ChevronLeft, Edit3, CreditCard, CheckSquare, X, Camera, Phone, Mail, AlertTriangle, Loader2, Trash2, UserCircle, Calendar, Briefcase
} from "lucide-react";

import { AppShell } from "../../components/AppShell"; // Ajuste o caminho se necessário

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ClientesPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // ESTADOS DOS MODAIS
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  // ESTADOS DE FILTRO E SELEÇÃO
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [checkedPatients, setCheckedPatients] = useState<string[]>([]);

  // ESTADOS DO FORMULÁRIO (NOVO OU EDIÇÃO)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", cpf: "", birthDate: "", phone: "", email: "", hasWhatsapp: true,
    tags: [] as string[], fototipo: "", skinTendency: "", allergies: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  // TAGS DISPONÍVEIS
  const AVAILABLE_TAGS = [
    "VIP PRIME", "LEAD QUENTE", "BOTOX PREVENTIVO", 
    "HARMONIZAÇÃO", "LASER / FOTONA", "MELASMA", "RETORNO"
  ];

  const FOTOTIPOS = [
    "Fitzpatrick I (Pele muito clara)", "Fitzpatrick II (Pele clara)", 
    "Fitzpatrick III (Pele morena clara)", "Fitzpatrick IV (Pele morena moderada)", 
    "Fitzpatrick V (Pele morena escura)", "Fitzpatrick VI (Pele negra)"
  ];

  // FUNÇÃO PARA ALTERNAR TAGS
  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  // BUSCAR DADOS DO BANCO (GET)
  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/patients`);
      if (!res.ok) throw new Error("Falha ao carregar o banco de dados.");
      const data = await res.json();
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (error) {
      console.warn("API offline, carregando dados de demonstração (Mock).", error);
      // MOCK FALLBACK: Evita que a tela quebre se a API estiver desligada
      const mockData = [
        { id: "1", pacId: "PAC-001", name: "Maria Carolina Silva", cpf: "111.222.333-44", phone: "(11) 99999-9999", tags: ["VIP PRIME", "BOTOX PREVENTIVO"], ltv: "12500.00", contracts: "3 contratos", lastVisit: "12/10/2026", lastProc: "Toxina Botulínica", fototipo: "Fitzpatrick II", skinTendency: "Oleosa", allergies: "Nenhuma", avatar: "https://i.pravatar.cc/150?img=1", hasWhatsapp: true, email: "maria@exemplo.com" },
        { id: "2", pacId: "PAC-002", name: "Ana Beatriz Gomes", cpf: "222.333.444-55", phone: "(11) 98888-8888", tags: ["MELASMA"], ltv: "3200.00", contracts: "1 contrato", lastVisit: "05/11/2026", lastProc: "Peeling Químico", fototipo: "Fitzpatrick III", skinTendency: "Seca", allergies: "Ácido Glicólico", avatar: "https://i.pravatar.cc/150?img=2", hasWhatsapp: true, email: "ana@exemplo.com" },
        { id: "3", pacId: "PAC-003", name: "Juliana Martins", cpf: "333.444.555-66", phone: "(11) 97777-7777", tags: ["HARMONIZAÇÃO", "RETORNO"], ltv: "8900.00", contracts: "2 contratos", lastVisit: "20/10/2026", lastProc: "Preenchimento Labial", fototipo: "Fitzpatrick IV", skinTendency: "Mista", allergies: "Nenhuma", avatar: "https://i.pravatar.cc/150?img=3", hasWhatsapp: true, email: "juliana@exemplo.com" }
      ];
      setPatients(mockData);
      if (!selectedPatientId) setSelectedPatientId(mockData[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // ABRIR MODAL PARA NOVO PACIENTE (Limpa os campos)
  const handleOpenNewPatient = () => {
    setEditingPatientId(null);
    setFormData({ name: "", cpf: "", birthDate: "", phone: "", email: "", hasWhatsapp: true, tags: [], fototipo: "", skinTendency: "", allergies: "" });
    setIsNewPatientModalOpen(true);
  };

  // ABRIR MODAL PARA EDIÇÃO (Preenche os campos)
  const handleEditPatient = (e: React.MouseEvent, patient: any) => {
    e.stopPropagation();
    setEditingPatientId(patient.id);
    
    let formattedDate = "";
    if (patient.birthDate) {
      const d = new Date(patient.birthDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    setFormData({
      name: patient.name || "",
      cpf: patient.cpf || "",
      birthDate: formattedDate,
      phone: patient.phone || "",
      email: patient.email || "",
      hasWhatsapp: patient.hasWhatsapp ?? true,
      tags: patient.tags || [],
      fototipo: patient.fototipo || "",
      skinTendency: patient.skinTendency || "",
      allergies: patient.allergies || ""
    });
    setIsNewPatientModalOpen(true);
  };

  // SALVAR PACIENTE (POST OU PATCH)
  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        cpf: formData.cpf.trim(),
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        hasWhatsapp: formData.hasWhatsapp,
        tags: formData.tags,
        fototipo: formData.fototipo,
        skinTendency: formData.skinTendency.trim(),
        allergies: formData.allergies.trim(),
      };

      const url = editingPatientId 
        ? `${API_URL}/api/patients/${editingPatientId}` 
        : `${API_URL}/api/patients`;
      
      const method = editingPatientId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao salvar paciente.");
      }

      const savedPatient = await res.json();
      
      if (editingPatientId) {
        setPatients(prev => prev.map(p => p.id === editingPatientId ? { ...p, ...savedPatient } : p));
      } else {
        setPatients(prev => [savedPatient, ...prev]);
        setSelectedPatientId(savedPatient.id ?? savedPatient._id ?? null);
      }

      setIsNewPatientModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      alert("Não foi possível salvar o paciente. Verifique os dados e a conexão com a API.");
    } finally {
      setIsSaving(false);
    }
  };

  // DELETAR PACIENTE
  const handleDeletePatient = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este paciente permanentemente?")) return;

    // 1. Atualização Otimista: Remove da tela imediatamente (funciona no Mock também)
    setPatients(prev => prev.filter(p => p.id !== id));
    if (selectedPatientId === id) setSelectedPatientId(null);

    try {
      // 2. Tenta deletar na API. 
      // NOTA: Mudei para o padrão REST normal (/:id). 
      // Se o seu backend REALMENTE exigir a rota /batch, volte para o código anterior do fetch.
      const res = await fetch(`${API_URL}/api/patients/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir na API");
      
    } catch (error) {
      console.warn("API offline ou erro ao excluir no backend.", error);
      // Aqui você poderia recarregar a lista original chamando fetchPatients() 
      // caso quisesse desfazer a exclusão se a API falhar no ambiente de produção.
    }
  };

  // FILTRAGEM DINÂMICA
  const filteredPatients = patients.filter(p => {
    const textMatch = p.name.toLowerCase().includes(busca.toLowerCase()) || 
                      (p.cpf && p.cpf.includes(busca)) || 
                      (p.phone && p.phone.includes(busca));
                      
    if (!textMatch) return false;
    if (activeFilter === "Todos") return true;
    if (activeFilter === "VIP Prime") return (p.tags || []).includes("VIP PRIME");
    if (activeFilter === "Ativos Recentes") return p.active === true || (p.tags || []).includes("ATIVO");
    if (activeFilter === "Inativos") return p.active === false || (p.tags || []).includes("INATIVO");
    return true; 
  });

  // SELEÇÃO MÚLTIPLA
  const handleToggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setCheckedPatients(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // EXPORTAR EXCEL
  const handleExportExcel = () => {
    const csvRows = [
      ["ID", "Nome", "CPF", "Telefone", "E-mail", "LTV Total", "Ultima Visita"],
      ...filteredPatients.map(p => [
        p.pacId || p.id,
        p.name,
        p.cpf || "-",
        p.phone || "-",
        p.email || "-",
        p.ltv || "0",
        p.lastVisit || "-"
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_${activeFilter.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const acoesTopo = (
    <>
      <button onClick={() => setIsNewSaleOpen(true)} className="hidden md:flex h-9 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors items-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap">
        <Plus className="w-4 h-4" /> Nova Venda
      </button>
      <button onClick={handleOpenNewPatient} className="h-9 px-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Paciente</span><span className="sm:hidden">Paciente</span>
      </button>
    </>
  );

  return (
    <AppShell
      trilha={["Operação", "Clientes"]}
      busca={{ valor: busca, onChange: setBusca, placeholder: "Pesquisar por nome ou CPF..." }}
      acoes={acoesTopo}
    >
      {/* Wrapper principal contendo todo o layout com margens (p-4 sm:p-6 lg:p-8) limitadas a max-w-[1600px] */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 gap-5 sm:gap-6 min-h-0">
          
          {/* HEADER DA PÁGINA */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none mb-1.5 sm:mb-2">
                Gestão de Clientes & Base de Pacientes 360º
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 line-clamp-2 lg:line-clamp-1">
                Visão consolidada de relacionamento, segmentação clínica por LTV, histórico de procedimentos e cadastros.
              </p>
            </div>
            <div className="flex flex-row sm:flex-col lg:flex-row gap-2 w-full lg:w-auto">
              <button onClick={handleExportExcel} className="flex-1 lg:flex-none h-9 px-4 rounded-xl font-bold text-[11px] sm:text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap">
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportar Relatório</span><span className="sm:hidden">Exportar</span>
              </button>
              <button className="flex-1 lg:flex-none h-9 px-4 rounded-xl font-bold text-[11px] sm:text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap">
                <Network className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Segmentação RFV / IA</span><span className="sm:hidden">Segmentação</span>
              </button>
            </div>
          </div>

          {/* METRICS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 shrink-0">
            <MetricCard title="TOTAL DE PACIENTES" value={patients.length.toString()} icon={<Users className="w-4 h-4"/>} isPositive />
            <MetricCard title="BASE ATIVA (180D)" value={patients.filter(p => p.active !== false).length} icon={<Activity className="w-4 h-4"/>} />
            <MetricCard title="LTV MÉDIO GERAL" value={`R$ ${Math.round(patients.reduce((sum, p) => sum + (parseFloat(p.ltv?.replace('.','').replace(',','.') || "0")), 0) / Math.max(1, patients.length))}`} icon={<TrendingUp className="w-4 h-4"/>} />
            <MetricCard title="PACIENTES VIP PRIME" value={patients.filter(p => (p.tags||[]).includes("VIP PRIME")).length} icon={<ShieldCheck className="w-4 h-4"/>} isPositive />
            <div className="col-span-2 lg:col-span-1"><MetricCard title="CICLO DE RETOQUE" value="67" icon={<Clock className="w-4 h-4"/>} /></div>
          </div>

          {/* FILTERS */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center w-full pb-1 shrink-0">
            <FilterPill label={`Todos (${patients.length})`} active={activeFilter === "Todos"} onClick={() => setActiveFilter("Todos")} />
            <FilterPill label={`VIP Prime (${patients.filter(p => (p.tags||[]).includes("VIP PRIME")).length})`} active={activeFilter === "VIP Prime"} onClick={() => setActiveFilter("VIP Prime")} />
            <FilterPill label="Ativos Recentes" active={activeFilter === "Ativos Recentes"} onClick={() => setActiveFilter("Ativos Recentes")} />
            <FilterPill label="Inativos" active={activeFilter === "Inativos"} onClick={() => setActiveFilter("Inativos")} />
          </div>

          {/* SPLIT WORKSPACE: LIST + DETAILS */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-[400px]">
            
            {/* LEFT PANE: LISTAGEM */}
            <div className={`flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex-col min-w-0 overflow-hidden ${selectedPatientId ? "hidden lg:flex" : "flex"}`}>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-900 truncate">Listagem de Pacientes</h2>
                  <span className="hidden sm:inline-block text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">{filteredPatients.length} resultados</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[12px] font-bold text-slate-500 whitespace-nowrap">
                  <span>Ordenar por:</span> <span className="text-slate-900 flex items-center gap-1 cursor-pointer">Última Visita <ChevronDown className="w-3.5 h-3.5"/></span>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar flex flex-col min-w-0">
                <div className="min-w-[800px] flex flex-col min-h-full relative">
                  <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    <div className="w-4"></div>
                    <div>PACIENTE & CADASTRO</div>
                    <div>SEGMENTAÇÃO & TAGS</div>
                    <div className="text-right">LTV ACUMULADO</div>
                    <div className="pl-4">ÚLTIMA VISITA</div>
                    <div className="w-16">AÇÕES</div>
                  </div>

                  <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-slate-500 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm font-bold text-slate-600">Sincronizando Banco de Dados...</span>
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <UserCircle className="w-12 h-12 opacity-50" />
                        <span className="text-sm font-bold">Nenhum paciente encontrado.</span>
                      </div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-slate-50 items-center cursor-pointer transition-colors group ${p.id === selectedPatientId ? "bg-blue-50/30" : "hover:bg-slate-50"}`}>
                          <div className="w-4">
                            <input 
                              type="checkbox" 
                              checked={checkedPatients.includes(p.id)} 
                              onChange={() => {}} 
                              onClick={(e) => handleToggleCheck(e, p.id)} 
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" 
                            />
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                            <div className="min-w-0">
                              <h4 className="text-[13px] font-bold text-slate-900 leading-tight truncate">{p.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400">{p.pacId || "-"}</span>
                                <span className="text-slate-300 text-[10px]">•</span>
                                <span className="text-[10px] font-medium text-slate-500 truncate">{p.phone}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(p.tags || []).map((tag: string, i: number) => (
                              <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border ${tag === 'ATIVO' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-blue-600 border-blue-200"}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="text-right">
                            <span className="text-[13px] font-black text-slate-900 block">R$ {p.ltv || "0,00"}</span>
                            <span className="text-[10px] font-medium text-slate-500 mt-0.5 block">{p.contracts || "0 contratos"}</span>
                          </div>
                          <div className="pl-4">
                            <span className="text-[11px] font-bold text-slate-700 block">{p.lastVisit || "-"}</span>
                            <span className="text-[10px] font-medium text-slate-500 truncate block w-32 mt-0.5">{p.lastProc || "-"}</span>
                          </div>
                          {/* Ações de Hover */}
                          <div className="w-16 flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleEditPatient(e, p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={(e) => handleDeletePatient(e, p.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] sm:text-[12px] font-medium text-slate-500 text-center sm:text-left">Mostrando <span className="font-bold text-slate-700">1 a {filteredPatients.length}</span> de {filteredPatients.length} pacientes</span>
                <div className="flex items-center justify-center sm:justify-end gap-5 w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-medium text-slate-500">
                    Itens por página: 
                    <select className="bg-white border border-slate-200 rounded-lg px-2 py-1 sm:py-1.5 outline-none font-bold text-slate-700 shadow-sm">
                      <option>25 por página</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: DETALHES DINÂMICOS (Visão 360) */}
            <div className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex-col overflow-hidden ${selectedPatientId ? "flex" : "hidden lg:flex"}`}>
              {activePatient ? (
                <>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
                    <button className="lg:hidden mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors" onClick={() => setSelectedPatientId(null)}>
                      <ChevronLeft className="w-4 h-4"/> Voltar para lista
                    </button>
                    
                    {/* Header Profiler */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <img src={activePatient.avatar} alt={activePatient.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-slate-200 object-cover shadow-sm" />
                          {(activePatient.tags || []).some((t:string) => t.includes('VIP')) && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white"><Star className="w-3 h-3 fill-current" /></div>
                          )}
                        </div>
                        <div className="pt-1 min-w-0">
                          <h2 className="text-[18px] sm:text-[20px] font-black text-slate-900 flex items-center gap-1.5 leading-tight truncate">{activePatient.name} <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /></h2>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {(activePatient.tags || []).map((tag: string, i: number) => (
                              <span key={i} className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{tag}</span>
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 block mt-2 truncate">{activePatient.pacId || "PAC-000"} {activePatient.age ? `• ${activePatient.age}` : ""}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] sm:text-[14px] font-bold text-slate-800 flex items-center gap-2 truncate"><Phone className="w-4.5 h-4.5 text-slate-400 shrink-0"/> {activePatient.phone}</span>
                        {activePatient.hasWhatsapp && <button className="bg-[#128C7E] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm hover:bg-[#075E54] transition-colors"><MessageCircle className="w-4 h-4"/> WhatsApp</button>}
                      </div>
                      <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600 truncate">
                        <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0"/> <span className="truncate">{activePatient.email || "Sem e-mail"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Perfil Clínico</span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5"/> LGPD OK</span>
                      </div>
                      <div className="grid grid-cols-2 gap-5 border-b border-slate-200/60 pb-5 mb-5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fototipo Cutâneo</span>
                          <span className="text-[13px] font-bold text-slate-800 block truncate">{activePatient.fototipo || "-"}</span>
                          <span className="text-[11px] font-medium text-slate-500 mt-0.5 block truncate">{activePatient.skinTendency || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alergias</span>
                          <span className={`text-[13px] font-bold block truncate ${activePatient.alergias?.includes('Alergia') || activePatient.allergies?.trim() ? 'text-rose-600' : 'text-emerald-600'}`}>{activePatient.alergias || activePatient.allergies || "Nenhuma"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 mb-8">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-4">Financeiro</span>
                      <div className="flex justify-between items-end gap-2">
                        <span className="text-[13px] font-medium text-slate-600 whitespace-nowrap">LTV Total:</span>
                        <span className="text-[22px] font-black text-slate-900 truncate">R$ {activePatient.ltv || activePatient.ltvTotal || "0,00"}</span>
                      </div>
                    </div>

                  </div>

                  {/* Detail Footer Actions */}
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 space-y-4">
                    <button 
                      onClick={() => setIsProntuarioOpen(true)}
                      className="w-full h-11 sm:h-12 bg-[#0B0F19] hover:bg-slate-800 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                      <Briefcase className="w-4 h-4 shrink-0" /> <span className="truncate">Abrir Prontuário Completo</span>
                    </button>
                  </div>
                </>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <UserCircle className="w-12 h-12 opacity-50" />
                    <span className="text-sm font-bold text-slate-500">Selecione um paciente</span>
                 </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ==================== MODAL DE NOVA VENDA ==================== */}
      <AnimatePresence>
        {isNewSaleOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewSaleOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Lançar Nova Venda</h2>
                  <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-0.5">Registre um novo contrato ou procedimento pago.</p>
                </div>
                <button onClick={() => setIsNewSaleOpen(false)} className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sm:gap-3 shrink-0">
                <button onClick={() => setIsNewSaleOpen(false)} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Confirmar Venda</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL NOVO PACIENTE 360º ==================== */}
      <AnimatePresence>
        {isNewPatientModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isSaving && setIsNewPatientModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 30 }} 
              transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
              className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                    <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">Cadastro Clínico 360º</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {editingPatientId ? "Editar Paciente" : "Novo Paciente"}
                    </h2>
                  </div>
                </div>
                <button 
                  disabled={isSaving}
                  onClick={() => setIsNewPatientModalOpen(false)} 
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50 shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row bg-[#f8fafc]">
                
                <div className="w-full md:w-[320px] bg-white border-b md:border-b-0 md:border-r border-slate-100 p-6 sm:p-8 shrink-0 flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center group cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden mb-6 shadow-sm">
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-blue-600 transition-colors z-10 mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center group-hover:text-blue-600">Adicionar<br/>Foto</span>
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5"/> Celular <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        type="text" placeholder="(00) 00000-0000" 
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer group bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                        <input type="checkbox" checked={formData.hasWhatsapp} onChange={(e) => setFormData({...formData, hasWhatsapp: e.target.checked})} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-emerald-300 cursor-pointer shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-700">Número possui WhatsApp</span>
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5"/> E-mail
                      </label>
                      <input 
                        value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                        type="email" placeholder="paciente@email.com" 
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-8">
                  <form id="newPatientForm" onSubmit={handleSavePatient} className="space-y-8 max-w-2xl mx-auto md:mx-0">
                    
                    <div>
                      <h3 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-4 sm:mb-5 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <UserCircle className="w-4 h-4 text-blue-600 shrink-0" /> Dados Pessoais
                      </h3>
                      <div className="space-y-4 sm:space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">Nome Completo <span className="text-rose-500">*</span></label>
                          <input 
                            required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                            type="text" placeholder="Ex: Maria Carolina Silva" 
                            className="w-full h-11 sm:h-12 px-4 rounded-xl border border-slate-200 bg-white text-[13px] sm:text-[14px] font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5"/> CPF</label>
                            <input 
                              value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                              type="text" placeholder="000.000.000-00" 
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Data de Nasc.</label>
                            <input 
                              value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                              type="date" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600 shrink-0" /> Perfil Clínico & Segmentação
                        </h3>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1">Estas informações ajudam a inteligência artificial a personalizar orçamentos.</p>
                      </div>
                      
                      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> Etiquetas Clínicas (Tags)</label>
                          <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                              const isActive = formData.tags.includes(tag);
                              return (
                                <button
                                  key={tag} type="button" onClick={() => toggleTag(tag)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isActive 
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-105" 
                                      : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                  }`}
                                >
                                  {isActive && <CheckCircle2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Palette className="w-3.5 h-3.5"/> Fototipo Cutâneo</label>
                            <select 
                              value={formData.fototipo} onChange={(e) => setFormData({...formData, fototipo: e.target.value})}
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[12px] sm:text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
                            >
                              <option value="">Selecione...</option>
                              {FOTOTIPOS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Tendência da Pele</label>
                            <input 
                              value={formData.skinTendency} onChange={(e) => setFormData({...formData, skinTendency: e.target.value})}
                              type="text" placeholder="Ex: Oleosa, Melasma, Rosácea..." 
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[12px] sm:text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                          <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0"/> Alergias ou Restrições
                          </label>
                          <textarea 
                            value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                            placeholder="Descreva alergias a medicamentos, anestésicos ou componentes..." 
                            className="w-full h-20 p-3 rounded-lg border border-rose-200 bg-white text-[12px] sm:text-[13px] font-medium text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10 resize-none transition-all placeholder:text-rose-300"
                          ></textarea>
                        </div>
                      </div>
                    </div>

                  </form>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex flex-col-reverse sm:flex-row items-center justify-end sm:justify-between gap-3 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <button 
                  type="button" disabled={isSaving} onClick={() => setIsNewPatientModalOpen(false)} 
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  form="newPatientForm" type="submit" disabled={isSaving}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl text-[13px] sm:text-[14px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {isSaving ? "Salvando..." : editingPatientId ? "Salvar Alterações" : "Criar Prontuário"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== DRAWER: PRONTUÁRIO COMPLETO 360º ==================== */}
      <AnimatePresence>
        {isProntuarioOpen && activePatient && (
          <div className="fixed inset-0 z-[1000] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsProntuarioOpen(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" 
            />
            
            <motion.div 
              initial={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }} 
              animate={{ x: 0, boxShadow: "-20px 0 40px rgba(0,0,0,0.15)" }} 
              exit={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }} 
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="relative w-full max-w-[900px] h-full bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/80 flex items-start sm:items-center justify-between shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                  <div className="relative shrink-0">
                    <img src={activePatient.avatar} alt={activePatient.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-md" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-none mb-2 truncate">{activePatient.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">{activePatient.pacId || "-"}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsProntuarioOpen(false)} className="w-10 h-10 sm:w-11 sm:h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm shrink-0">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 sm:p-8 text-center text-slate-400 overflow-y-auto">
                Conteúdo do Prontuário aqui...
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}

// --- SUBCOMPONENTS GERAIS ---
function MetricCard({ title, value, icon, trend, trendText, sub, isPositive }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0 h-full">
      <div>
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">{title}</span>
          <div className="text-blue-600 bg-blue-50 w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
        </div>
        <div className="flex items-end gap-2 mb-2 sm:mb-3">
          <span className="text-2xl sm:text-[28px] font-black text-slate-900 leading-none truncate">{value}</span>
          {trend && (
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500'}`}>
              {trend}
            </span>
          )}
        </div>
      </div>
      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight truncate">
        {trendText || sub}
      </p>
    </div>
  );
}

function FilterPill({ label, active, onClick, color, border, dot }: any) {
  const activeClasses = active ? "text-white bg-slate-900 border-slate-900" : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50";
  return (
    <button onClick={onClick} className={`h-9 sm:h-10 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold rounded-xl border flex items-center gap-1.5 transition-colors shadow-sm shrink-0 whitespace-nowrap ${activeClasses}`}>
      {dot && <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`}></div>}
      {label}
    </button>
  );
}
