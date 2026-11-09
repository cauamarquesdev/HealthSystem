"use client";

/**
 * CONFIGURAÇÕES — acessada pela engrenagem do perfil, em qualquer módulo.
 * Caminho: app/configuracoes/page.tsx
 *
 * Preferências pessoais · Dados da clínica (só administradores editam) · Atalhos.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  Keyboard,
  Loader2,
  Settings,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
// Ajuste os caminhos conforme onde você salvou os arquivos compartilhados.
import { AppShell, useSessao } from "../../components/AppShell";
import type { Usuario } from "../../components/AppShell";
import { api, TIPO_META, useNotificacoes } from "../../lib/notificacoes";
import type { NotifTipo } from "../../lib/notificacoes";

/* ═══════════════════════════════════════════════════════════════
   UI BASE
   ═══════════════════════════════════════════════════════════════ */

const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
const btnBlue =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500";

function Campo({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Interruptor({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${checked ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Aviso({ tipo, children }: { tipo: "ok" | "erro" | "info"; children: React.ReactNode }) {
  const cls = tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tipo === "erro" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${cls}`}>
      {tipo === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

function formatarTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Reduz a logo para no máximo 256 px, mantendo transparência quando possível. */
function reduzirLogo(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error("Use uma imagem JPG, PNG ou WebP."));
    if (file.size > 10 * 1024 * 1024) return rej(new Error("A imagem passa de 10 MB."));
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const r = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * r));
      const h = Math.max(1, Math.round(img.naturalHeight * r));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      if (!g) return rej(new Error("Seu navegador não suporta o processamento de imagens."));
      g.drawImage(img, 0, 0, w, h);
      let out = c.toDataURL("image/png");
      if (out.length > 200_000) {
        // PNG pesado (foto): cai para JPEG com fundo branco
        g.globalCompositeOperation = "destination-over";
        g.fillStyle = "#fff";
        g.fillRect(0, 0, w, h);
        out = c.toDataURL("image/jpeg", 0.85);
      }
      if (out.length > 215_000) return rej(new Error("Logo muito pesada. Use uma imagem mais simples."));
      res(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Não foi possível abrir a imagem."));
    };
    img.src = url;
  });
}

/* ═══════════════════════════════════════════════════════════════
   ABA: PREFERÊNCIAS
   ═══════════════════════════════════════════════════════════════ */

type Preferencia = { tipo: NotifTipo; ativo: boolean };

function AbaPreferencias() {
  const { ativo, config, setConfig, permissao, pedirPermissao, refresh } = useNotificacoes();
  const [prefs, setPrefs] = useState<Preferencia[] | null>(null);
  const [erroPrefs, setErroPrefs] = useState<string | null>(null);
  const [privacidade, setPrivacidade] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "erro" | "info"; s: string } | null>(null);
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    try {
      setPrivacidade(localStorage.getItem("fotos:privacidade") === "1");
    } catch {}
    api<Preferencia[]>("/notificacoes/preferencias")
      .then(setPrefs)
      .catch((e: unknown) => setErroPrefs(e instanceof Error ? e.message : "Não foi possível carregar as categorias."));
  }, []);

  const alternarCategoria = async (tipo: NotifTipo, valor: boolean) => {
    setPrefs((p) => p?.map((x) => (x.tipo === tipo ? { ...x, ativo: valor } : x)) ?? p);
    try {
      await api("/notificacoes/preferencias", { method: "PUT", body: JSON.stringify({ tipo, ativo: valor }) });
    } catch (e) {
      setPrefs((p) => p?.map((x) => (x.tipo === tipo ? { ...x, ativo: !valor } : x)) ?? p);
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível salvar." });
    }
  };

  const avisoNavegador = async (v: boolean) => {
    if (!v) return setConfig({ desktop: false });
    const p = permissao === "granted" ? "granted" : await pedirPermissao();
    if (p === "granted") setConfig({ desktop: true });
    else setMsg({ t: "erro", s: "O navegador bloqueou os avisos. Libere nas configurações do site e tente de novo." });
  };

  const alternarPrivacidade = (v: boolean) => {
    setPrivacidade(v);
    try {
      localStorage.setItem("fotos:privacidade", v ? "1" : "0");
    } catch {}
  };

  const testar = async () => {
    setTestando(true);
    setMsg(null);
    try {
      await api("/notificacoes/teste", { method: "POST" });
      await refresh();
      setMsg({ t: "ok", s: "Notificação de teste enviada. Ela deve aparecer em instantes." });
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível enviar o teste." });
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="space-y-6">
      {!ativo && <Aviso tipo="info">O tempo real das notificações está desligado: falta envolver o app com o NotificacoesProvider no layout raiz.</Aviso>}
      {msg && <Aviso tipo={msg.t}>{msg.s}</Aviso>}

      <section className={`${card} space-y-3 p-5`} aria-label="Notificações neste dispositivo">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Notificações neste dispositivo</h2>
          <p className="text-xs text-slate-500">Valem só para este navegador.</p>
        </div>
        <Interruptor label="Som ao chegar notificação" checked={config.som} onChange={(v) => setConfig({ som: v })} />
        <Interruptor
          label="Aviso do navegador"
          hint={permissao === "unsupported" ? "Seu navegador não suporta." : permissao === "denied" ? "Bloqueado no navegador. Libere nas configurações do site." : "Mostra um aviso quando esta aba estiver em segundo plano."}
          checked={config.desktop && permissao === "granted"}
          onChange={(v) => void avisoNavegador(v)}
          disabled={permissao === "unsupported" || permissao === "denied"}
        />
        <button className={btnGhost} onClick={() => void testar()} disabled={testando}>
          {testando ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Enviar notificação de teste
        </button>
      </section>

      <section className={`${card} space-y-3 p-5`} aria-label="Categorias de notificação">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">O que você quer receber</h2>
          <p className="text-xs text-slate-500">Categorias desativadas deixam de gerar notificações novas para você, em qualquer dispositivo.</p>
        </div>
        {erroPrefs && <Aviso tipo="erro">{erroPrefs}</Aviso>}
        {!prefs && !erroPrefs && <div className="h-12 animate-pulse rounded-xl bg-slate-100" />}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {prefs?.map((p) => (
            <Interruptor key={p.tipo} label={TIPO_META[p.tipo].label} checked={p.ativo} onChange={(v) => void alternarCategoria(p.tipo, v)} />
          ))}
        </div>
      </section>

      <section className={`${card} space-y-3 p-5`} aria-label="Privacidade">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Privacidade das imagens</h2>
          <p className="text-xs text-slate-500">Protege fotos de pacientes quando outras pessoas podem ver a sua tela (recepção, atendimento).</p>
        </div>
        <Interruptor label="Desfocar fotos clínicas por padrão" hint="Você ainda pode revelar cada imagem quando precisar. Também dá para alternar no topo da tela de Fotos Clínicas." checked={privacidade} onChange={alternarPrivacidade} />
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABA: CLÍNICA
   ═══════════════════════════════════════════════════════════════ */

function AbaClinica() {
  const { usuario, atualizarLocal } = useSessao();
  const c = usuario?.clinica;
  const ehAdmin = usuario?.role === "ADMIN";

  const [nome, setNome] = useState(c?.nome ?? "");
  const [unidade, setUnidade] = useState(c?.unidade ?? "");
  const [documento, setDocumento] = useState(c?.documento ?? "");
  const [telefone, setTelefone] = useState(c?.telefone ?? "");
  const [email, setEmail] = useState(c?.email ?? "");
  const [endereco, setEndereco] = useState(c?.endereco ?? "");
  const [horario, setHorario] = useState(c?.horario ?? "");
  const [logo, setLogo] = useState<string | null>(c?.logo ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "erro"; s: string } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  if (!usuario || !c) return <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-slate-300" /></div>;

  const escolherLogo = async (f?: File) => {
    if (!f) return;
    setMsg(null);
    try {
      setLogo(await reduzirLogo(f));
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível usar esta imagem." });
    }
  };

  const salvar = async () => {
    setMsg(null);
    if (nome.trim().length < 2) return setMsg({ t: "erro", s: "Informe o nome da clínica." });
    setBusy(true);
    try {
      const u = await api<Usuario>("/perfil/clinica", {
        method: "PUT",
        body: JSON.stringify({ nome, unidade: unidade || null, documento: documento || null, telefone: telefone || null, email: email || null, endereco: endereco || null, horario: horario || null, logo }),
      });
      atualizarLocal(u);
      setMsg({ t: "ok", s: "Dados da clínica atualizados." });
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!ehAdmin && <Aviso tipo="info">Somente administradores podem alterar os dados da clínica. Você pode apenas consultá-los.</Aviso>}

      <section className={`${card} p-5`} aria-label="Identidade da clínica">
        <h2 className="mb-4 text-sm font-extrabold text-slate-900">Identidade</h2>
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo da clínica" className="h-full w-full object-contain" />
            ) : (
              <Building2 size={30} className="text-slate-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Logo da clínica</p>
            <p className="text-xs text-slate-500">PNG, JPG ou WebP. É reduzida automaticamente e aparece no menu lateral.</p>
            {ehAdmin && (
              <div className="mt-2.5 flex gap-2">
                <button className={btnGhost} onClick={() => arquivo.current?.click()}><Upload size={14} /> {logo ? "Trocar logo" : "Enviar logo"}</button>
                {logo && <button className={`${btnGhost} hover:!text-rose-600`} onClick={() => setLogo(null)}><Trash2 size={14} /> Remover</button>}
              </div>
            )}
            <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void escolherLogo(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
      </section>

      <section className={`${card} p-5`} aria-label="Dados da clínica">
        <h2 className="mb-4 text-sm font-extrabold text-slate-900">Dados</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome da clínica *"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} disabled={!ehAdmin} /></Campo>
          <Campo label="Nome da unidade" hint="Aparece no topo e no menu. Ex.: Unidade Av Saudade (Matriz)"><input className={inputCls} value={unidade} onChange={(e) => setUnidade(e.target.value)} disabled={!ehAdmin} /></Campo>
          <Campo label="CNPJ"><input className={inputCls} value={documento} onChange={(e) => setDocumento(e.target.value)} disabled={!ehAdmin} placeholder="00.000.000/0000-00" /></Campo>
          <Campo label="Telefone"><input className={inputCls} inputMode="tel" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} disabled={!ehAdmin} placeholder="(00) 0000-0000" /></Campo>
          <Campo label="E-mail da clínica"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} disabled={!ehAdmin} /></Campo>
          <Campo label="Horário de funcionamento"><input className={inputCls} value={horario} onChange={(e) => setHorario(e.target.value)} disabled={!ehAdmin} placeholder="Seg–Sex 8h–19h · Sáb 8h–13h" /></Campo>
          <Campo label="Endereço" className="sm:col-span-2"><input className={inputCls} value={endereco} onChange={(e) => setEndereco(e.target.value)} disabled={!ehAdmin} placeholder="Rua, número, bairro, cidade/UF" /></Campo>
        </div>
      </section>

      {msg && <Aviso tipo={msg.t}>{msg.s}</Aviso>}
      {ehAdmin && (
        <button className={btnBlue} onClick={() => void salvar()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar dados da clínica
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABA: ATALHOS
   ═══════════════════════════════════════════════════════════════ */

const ATALHOS: { grupo: string; itens: { teclas: string[]; descricao: string }[] }[] = [
  {
    grupo: "Em todo o sistema",
    itens: [
      { teclas: ["/"], descricao: "Focar na busca do topo (nas telas que têm busca)" },
      { teclas: ["Esc"], descricao: "Fechar janelas, gavetas e menus" },
    ],
  },
  {
    grupo: "Fotos Clínicas — visualizador",
    itens: [
      { teclas: ["←", "→"], descricao: "Foto anterior / próxima" },
      { teclas: ["+", "−"], descricao: "Aumentar / diminuir o zoom" },
      { teclas: ["0"], descricao: "Restaurar o zoom" },
      { teclas: ["F"], descricao: "Favoritar a foto" },
      { teclas: ["duplo clique"], descricao: "Ampliar ou voltar ao tamanho normal" },
    ],
  },
];

function AbaAtalhos() {
  return (
    <div className="space-y-5">
      {ATALHOS.map((g) => (
        <section key={g.grupo} className={`${card} p-5`} aria-label={g.grupo}>
          <h2 className={`${eyebrow} mb-3`}>{g.grupo}</h2>
          <ul className="divide-y divide-slate-100">
            {g.itens.map((i) => (
              <li key={i.descricao} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-slate-700">{i.descricao}</span>
                <span className="flex shrink-0 gap-1.5">
                  {i.teclas.map((t) => <kbd key={t} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600">{t}</kbd>)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA
   ═══════════════════════════════════════════════════════════════ */

const ABAS = [
  { v: "Preferências", icon: <SlidersHorizontal size={15} /> },
  { v: "Clínica", icon: <Building2 size={15} /> },
  { v: "Atalhos", icon: <Keyboard size={15} /> },
] as const;
type Aba = (typeof ABAS)[number]["v"];

function ConfiguracoesConteudo() {
  const [aba, setAba] = useState<Aba>("Preferências");

  return (
    <main className="px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-[900px]">
        <header className="mb-6 flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><Settings size={22} /></span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Configurações</h1>
            <p className="mt-0.5 text-sm text-slate-500">Preferências pessoais e dados da clínica</p>
          </div>
        </header>

        <nav className={`${card} mb-6 flex gap-1 overflow-x-auto p-1.5`} role="tablist" aria-label="Seções de configurações">
          {ABAS.map((a) => (
            <button key={a.v} role="tab" aria-selected={aba === a.v} onClick={() => setAba(a.v)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${aba === a.v ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              {a.icon} {a.v}
            </button>
          ))}
        </nav>

        {aba === "Preferências" && <AbaPreferencias />}
        {aba === "Clínica" && <AbaClinica />}
        {aba === "Atalhos" && <AbaAtalhos />}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
          Para alterar seu nome, foto, senha ou assinatura, abra “Meu Perfil” no menu da engrenagem.
        </footer>
      </div>
    </main>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AppShell trilha={["Sistema", "Configurações"]}>
      <ConfiguracoesConteudo />
    </AppShell>
  );
}