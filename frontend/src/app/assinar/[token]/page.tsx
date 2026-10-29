
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  PenLine,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  apiPublico,
  ApiPublicaError,
  DocumentoRender,
  SignaturePad,
  formatarCpf,
  cpfValido,
  fmtDataHora,
} from "@/src/lib/documentos";

import type { SignaturePadHandle } from "@/src/lib/documentos";

type DocumentoPublico = {
  titulo: string;
  conteudo: string;
  clinica: string;
  assinante: string | { nome?: string; name?: string } | null;
  expiraEm?: string | null;
  exigeCpf?: boolean;
};

type ResultadoAssinatura = {
  ok: boolean;
  clinica?: string;
};

function mensagemErro(error: unknown) {
  if (error instanceof ApiPublicaError) {
    if (error.status === 404 || error.status === 410) {
      return "Este link não está mais disponível. Ele pode ter expirado, sido cancelado ou o documento já ter sido assinado.";
    }

    return error.message;
  }

  return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
}

export default function AssinarDocumentoPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token)
    ? params.token[0]
    : params.token;

  const assinaturaRef = useRef<SignaturePadHandle>(null);

  const [documento, setDocumento] = useState<DocumentoPublico | null>(
    null,
  );
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [aceite, setAceite] = useState(false);
  const [temAssinatura, setTemAssinatura] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const carregarDocumento = useCallback(async () => {
    if (!token) {
      setErro("O link de assinatura não é válido.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const data = await apiPublico<DocumentoPublico>(
        `/api/documentos/publico/${encodeURIComponent(token)}`,
        { method: "GET" },
      );

      if (!data || typeof data.conteudo !== "string") {
        throw new Error("O servidor retornou um documento inválido.");
      }

      setDocumento(data);

      const assinante =
        typeof data.assinante === "string"
          ? data.assinante
          : data.assinante?.nome ?? data.assinante?.name ?? "";

      setNome(assinante);
    } catch (error) {
      setErro(mensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    void carregarDocumento();
  }, [carregarDocumento]);

  const enviarAssinatura = async () => {
    setErro("");

    if (!documento) {
      setErro("O documento não está disponível.");
      return;
    }

    if (!nome.trim()) {
      setErro("Informe seu nome completo.");
      return;
    }

    if (documento.exigeCpf && !cpfValido(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }

    if (!aceite) {
      setErro("É necessário confirmar a leitura e a concordância com o documento.");
      return;
    }

    const assinatura = assinaturaRef.current?.dataUrl();

    if (!assinatura) {
      setErro("Faça sua assinatura no campo indicado antes de continuar.");
      return;
    }

    setEnviando(true);

    try {
      const resultado = await apiPublico<ResultadoAssinatura>(
        `/api/documentos/publico/${encodeURIComponent(token)}/assinar`,
        {
          method: "POST",
          body: JSON.stringify({
            aceite: true,
            signerName: nome.trim(),
            ...(documento.exigeCpf
              ? { signerCpf: cpf.replace(/\D/g, "") }
              : {}),
            signatureData: assinatura,
          }),
        },
      );

      if (!resultado?.ok) {
        throw new Error("O servidor não confirmou a assinatura.");
      }

      setSucesso(true);
      setDocumento((atual) =>
        atual
          ? {
              ...atual,
              clinica: resultado.clinica || atual.clinica,
            }
          : atual,
      );
    } catch (error) {
      setErro(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="h-screen overflow-y-auto bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <FileCheck2 size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight">
                HealthSystem
              </p>
              <p className="text-xs text-slate-500">
                Assinatura eletrônica de documentos
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
            <ShieldCheck size={15} />
            Acesso seguro por link
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {carregando ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
            <Loader2 size={34} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500">
              Carregando documento...
            </p>
          </div>
        ) : erro && !documento ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle size={30} />
            </div>

            <h1 className="text-xl font-extrabold">
              Não foi possível abrir o documento
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {erro}
            </p>

            <button
              type="button"
              onClick={() => void carregarDocumento()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Tentar novamente
            </button>
          </section>
        ) : sucesso ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm sm:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={44} />
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Assinatura confirmada
            </p>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Documento assinado com sucesso!
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">
              Sua assinatura foi recebida e o servidor confirmou o registro.
              Você já pode fechar esta página.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Documento
              </p>
              <p className="mt-1 font-bold">
                {documento?.titulo}
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assinante
              </p>
              <p className="mt-1 text-sm font-semibold">{nome}</p>

              {documento?.clinica && (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clínica
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {documento.clinica}
                  </p>
                </>
              )}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              A confirmação exibida corresponde à resposta recebida do
              servidor. A data e as evidências oficiais devem ser consultadas
              no registro do documento no sistema.
            </p>
          </section>
        ) : documento ? (
          <>
            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
                <FileText size={15} />
                Documento para assinatura
              </div>

              <h1 className="max-w-3xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                {documento.titulo}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Leia o documento completo e preencha os dados para registrar
                sua assinatura.
              </p>

              {documento.expiraEm && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  <Clock3 size={14} />
                  Validade do link: {fmtDataHora(documento.expiraEm)}
                </p>
              )}
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <FileText size={20} />
                  </div>

                  <div>
                    <h2 className="text-sm font-extrabold">
                      Conteúdo do documento
                    </h2>
                    <p className="text-xs text-slate-500">
                      Leia antes de assinar
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-8">
                  {documento.clinica && (
                    <p className="mb-5 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">
                      {documento.clinica}
                    </p>
                  )}

                  <DocumentoRender
                    texto={documento.conteudo}
                    className="break-words"
                  />
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                    <ShieldCheck
                      size={15}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    A assinatura será encaminhada ao sistema para registro.
                    Confira os dados antes de concluir.
                  </p>
                </div>
              </section>

              <aside className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <PenLine size={19} />
                    </div>

                    <div>
                      <h2 className="font-extrabold">Sua assinatura</h2>
                      <p className="text-xs text-slate-500">
                        Preencha e assine abaixo
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="nome-assinante"
                        className="mb-1.5 block text-xs font-bold text-slate-700"
                      >
                        Nome completo *
                      </label>

                      <input
                        id="nome-assinante"
                        autoComplete="name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Digite seu nome completo"
                        maxLength={150}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    {documento.exigeCpf && (
                      <div>
                        <label
                          htmlFor="cpf-assinante"
                          className="mb-1.5 block text-xs font-bold text-slate-700"
                        >
                          CPF *
                        </label>

                        <input
                          id="cpf-assinante"
                          inputMode="numeric"
                          autoComplete="off"
                          value={cpf}
                          onChange={(e) =>
                            setCpf(formatarCpf(e.target.value))
                          }
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-slate-700">
                          Assinatura manuscrita *
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            assinaturaRef.current?.limpar();
                            setTemAssinatura(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                          Limpar
                        </button>
                      </div>

                      <SignaturePad
                        ref={assinaturaRef}
                        onChange={setTemAssinatura}
                      />

                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        Use o dedo na tela ou o mouse para desenhar sua
                        assinatura.
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <input
                        type="checkbox"
                        checked={aceite}
                        onChange={(e) => setAceite(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                      />

                      <span className="text-xs leading-relaxed text-slate-700">
                        Declaro que li o documento apresentado, compreendi seu
                        conteúdo e concordo com os termos nele descritos.
                      </span>
                    </label>

                    {erro && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-medium leading-relaxed text-rose-700"
                      >
                        <AlertCircle
                          size={16}
                          className="mt-0.5 shrink-0"
                        />
                        {erro}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void enviarAssinatura()}
                      disabled={enviando}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {enviando ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Registrando assinatura...
                        </>
                      ) : (
                        <>
                          <Check size={17} />
                          Confirmar e assinar
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] leading-relaxed text-slate-400">
                      O registro depende da validação do servidor. Não
                      atualize nem feche a página enquanto a assinatura
                      estiver sendo enviada.
                    </p>
                  </div>
                </section>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Assinatura por link
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Você não precisa entrar na área administrativa da
                      clínica para acessar este documento.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : null}

        <footer className="py-8 text-center">
          <p className="text-[11px] font-medium text-slate-400">
            HealthSystem · Gestão Premium
          </p>
        </footer>
      </div>
    </main>
  );
}
