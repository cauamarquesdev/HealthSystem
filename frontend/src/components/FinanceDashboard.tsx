"use client";

import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Wallet,
  Building2,
  Smartphone,
  ArrowRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import clsx from "clsx";

// Dados mockados simulando a estrutura da sua imagem (saídas como valores negativos)
const data = [
  {
    date: "9 Abr",
    entradas: 163,
    entradasPrev: 0,
    saidas: 0,
    saidasPrev: 0,
    saldo: 1400,
  },
  {
    date: "10 Abr",
    entradas: 250,
    entradasPrev: 50,
    saidas: -120,
    saidasPrev: 0,
    saldo: 1530,
  },
  {
    date: "11 Abr",
    entradas: 180,
    entradasPrev: 0,
    saidas: -300,
    saidasPrev: -50,
    saldo: 1410,
  },
  {
    date: "12 Abr",
    entradas: 0,
    entradasPrev: 0,
    saidas: -50,
    saidasPrev: 0,
    saldo: 1360,
  },
  {
    date: "13 Abr",
    entradas: 400,
    entradasPrev: 0,
    saidas: -100,
    saidasPrev: 0,
    saldo: 1660,
  },
  {
    date: "14 Abr",
    entradas: 0,
    entradasPrev: 100,
    saidas: 0,
    saidasPrev: -200,
    saldo: 1660,
  },
  {
    date: "15 Abr",
    entradas: 800,
    entradasPrev: 0,
    saidas: -150,
    saidasPrev: 0,
    saldo: 2310,
  },
  {
    date: "16 Abr",
    entradas: 0,
    entradasPrev: 0,
    saidas: -800,
    saidasPrev: 0,
    saldo: 1510,
  },
  {
    date: "17 Abr",
    entradas: 1200,
    entradasPrev: 0,
    saidas: -100,
    saidasPrev: 0,
    saldo: 2610,
  },
  {
    date: "18 Abr",
    entradas: 500,
    entradasPrev: 300,
    saidas: -50,
    saidasPrev: 0,
    saldo: 3060,
  },
];

// Componente do Tooltip idêntico ao da imagem
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-zinc-100 min-w-[200px]">
        <p className="font-semibold text-zinc-800 mb-3 text-sm">
          {label} de 2026
        </p>
        <div className="space-y-2 text-xs font-medium">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex justify-between items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-zinc-500 capitalize">{entry.name}</span>
              </div>
              <span className="text-zinc-900">
                R${" "}
                {Math.abs(entry.value).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function FinanceDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("Diária");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted)
    return (
      <div className="h-full w-full bg-zinc-50/50 animate-pulse rounded-3xl" />
    );

  return (
    <div className="flex flex-col gap-6">
      {/* LINHA SUPERIOR: Gráfico (Esquerda) + Contas (Direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Painel do Gráfico (Ocupa 2/3 do espaço) */}
        <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col min-h-[450px]">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Fluxo de caixa
              </h3>
            </div>

            {/* Abas de Filtro da Imagem */}
            <div className="flex gap-4 text-sm font-medium">
              {["Diária", "Semanal", "Mensal", "Anual"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "transition-colors",
                    activeTab === tab
                      ? "text-purple-600"
                      : "text-zinc-400 hover:text-zinc-600",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 0, left: -20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f4f4f5"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }}
                  dy={15}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "transparent" }}
                />

                {/* Linha do Zero (Referência) */}
                <ReferenceLine y={0} stroke="#e4e4e7" />

                {/* Legenda Customizada via Recharts (Omitida para usar a visual idêntica do tooltip) */}

                {/* Barras e Linhas */}
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill="#22c55e"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={12}
                />
                <Bar
                  dataKey="entradasPrev"
                  name="Entradas previstas"
                  fill="#86efac"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={12}
                />

                <Bar
                  dataKey="saidas"
                  name="Saídas"
                  fill="#ef4444"
                  radius={[0, 0, 2, 2]}
                  maxBarSize={12}
                />
                <Bar
                  dataKey="saidasPrev"
                  name="Saídas previstas"
                  fill="#fca5a5"
                  radius={[0, 0, 2, 2]}
                  maxBarSize={12}
                />

                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda manual no rodapé do gráfico */}
          <div className="flex justify-center gap-6 mt-4 text-[11px] font-medium text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-sm" /> Entradas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-300 rounded-sm" /> Entradas
              previstas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-sm" /> Saídas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-300 rounded-sm" /> Saídas previstas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full" /> Saldo
            </div>
          </div>
        </div>

        {/* Painel de Contas Financeiras (Ocupa 1/3 do espaço) */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
              Contas financeiras
            </h3>
            <button className="text-purple-600 text-sm font-medium hover:text-purple-700">
              Ver todas
            </button>
          </div>

          <div className="flex flex-col gap-5 flex-1">
            {/* Item: Caixinha */}
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-purple-600 transition-colors">
                    Caixinha
                  </p>
                  <p className="text-xs text-zinc-500">Caixa</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                R$ 1.446,25
              </span>
            </div>

            {/* Item: Caixa Geral */}
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-purple-600 transition-colors">
                    Caixa geral
                  </p>
                  <p className="text-xs text-zinc-500">Cofre</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                R$ 257.407,34
              </span>
            </div>

            {/* Item: Safra Pix */}
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-purple-600 transition-colors">
                    Safra pix
                  </p>
                  <p className="text-xs text-zinc-500">Conta de Recebimento</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                R$ 7.750,87
              </span>
            </div>

            {/* Item: Nubank Pix */}
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-purple-600 transition-colors">
                    Nubank Pix
                  </p>
                  <p className="text-xs text-zinc-500">Conta de Recebimento</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                R$ 124.611,51
              </span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-zinc-100 flex justify-between items-center">
            <span className="text-sm text-zinc-500">Saldo total:</span>
            <span className="text-lg font-bold text-zinc-900 tracking-tight">
              R$ 460.138,07
            </span>
          </div>
        </div>
      </div>

      {/* LINHA INFERIOR: A Receber | A Pagar | Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* A Receber */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
              A receber
            </h3>
            <button className="text-purple-600 text-sm font-medium hover:text-purple-700">
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500">
                Inadimplência
              </span>
              <span className="text-sm font-semibold text-emerald-500">
                R$ 996.982,80
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500">
                Para hoje
              </span>
              <span className="text-sm font-semibold text-emerald-500">
                R$ 97,41
              </span>
            </div>
          </div>
        </div>

        {/* A Pagar */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
              A pagar
            </h3>
            <button className="text-purple-600 text-sm font-medium hover:text-purple-700">
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500">
                Em atraso
              </span>
              <span className="text-sm font-semibold text-red-500">
                R$ 232.488,55
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500">
                Para hoje
              </span>
              <span className="text-sm font-semibold text-red-500">
                R$ 500,00
              </span>
            </div>
          </div>
        </div>

        {/* Categorias */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight flex items-center gap-1">
              Categorias{" "}
              <span className="text-zinc-400 text-sm cursor-help">ⓘ</span>
            </h3>

            {/* Toggle Switch */}
            <div className="bg-zinc-100 p-1 rounded-lg flex text-xs font-medium">
              <button className="bg-emerald-500 text-white px-3 py-1 rounded-md shadow-sm">
                Receita
              </button>
              <button className="text-zinc-500 px-3 py-1 hover:text-zinc-700">
                Despesa
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10 mt-8">
            <div className="w-24 h-24 rounded-full border-[12px] border-emerald-400 border-r-emerald-100 flex items-center justify-center">
              {/* Simulação do Donut Chart */}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                <div className="w-2 h-2 rounded-sm bg-emerald-400" />{" "}
                Atendimentos
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                <div className="w-2 h-2 rounded-sm bg-emerald-100" /> Produtos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
