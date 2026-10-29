
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  ChevronDown,
  ClipboardList,
  FileText,
  Images,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { AppShell } from "../../components/Shell";

import AnamneseTab from "./tabs/Anamnesetab";
import EvolutionsTab from "./tabs/Evolutionstab";
import FaceMap from "./tabs/Facemap";
import PhotosTab from "./tabs/Photostab";

import {
  api,
  useProfessional,
} from "./lib/api";

import type {
  PatientSummary,
  RecordData,
  TabId,
} from "./lib/api";

type ProntuarioTab =
  | "anamnese"
  | "evolucoes"
  | "fotos"
  | "facemap";

const EMPTY_RECORD: RecordData = {
  notes: [],
  prescriptions: [],
  documents: [],
  media: [],
  appointments: [],
};

const TABS: {
  id: ProntuarioTab;
  label: string;
  icon: typeof ClipboardList;
}[] = [
  {
    id: "anamnese",
    label: "Anamnese",
    icon: ClipboardList,
  },
  {
    id: "evolucoes",
    label: "Evoluções",
    icon: Activity,
  },
  {
    id: "fotos",
    label: "Fotos clínicas",
    icon: Images,
  },
  {
    id: "facemap",
    label: "Face Map",
    icon: ScanFace,
  },
];

export default function ProntuariosPage() {
  const pro = useProfessional();

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [record, setRecord] = useState<RecordData>(EMPTY_RECORD);

  const [activeTab, setActiveTab] =
    useState<ProntuarioTab>("anamnese");

  const [search, setSearch] = useState("");
  const [patientMenuOpen, setPatientMenuOpen] = useState(false);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [error, setError] = useState("");
  const [signalNumber, setSignalNumber] = useState(0);

  // Busca a lista de pacientes disponível no módulo de prontuários.
  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    setError("");

    try {
      const result = await api<PatientSummary[]>(
        "/records/patients"
      );

      const list = Array.isArray(result) ? result : [];

      setPatients(list);

      // Preserva o paciente selecionado durante a atualização.
      setPatient((current) => {
        if (!current) return null;

        return list.find((p) => p.id === current.id) ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os pacientes."
      );
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  // Carrega todos os dados do prontuário do paciente selecionado.
  const reload = useCallback(async () => {
    if (!patient?.id) {
      setRecord(EMPTY_RECORD);
      return;
    }

    setLoadingRecord(true);
    setError("");

    try {
      const result = await api<RecordData>(
        `/records/patients/${encodeURIComponent(patient.id)}/record`
      );

      setRecord({
        notes: Array.isArray(result?.notes)
          ? result.notes
          : [],
        prescriptions: Array.isArray(result?.prescriptions)
          ? result.prescriptions
          : [],
        documents: Array.isArray(result?.documents)
          ? result.documents
          : [],
        media: Array.isArray(result?.media)
          ? result.media
          : [],
        appointments: Array.isArray(result?.appointments)
          ? result.appointments
          : [],
      });
    } catch (err) {
      setRecord(EMPTY_RECORD);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o prontuário."
      );
    } finally {
      setLoadingRecord(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    if (!patient?.id) {
      setRecord(EMPTY_RECORD);
      return;
    }

    void reload();
  }, [patient?.id, reload]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");

    if (!term) return patients;

    const digits = term.replace(/\D/g, "");

    return patients.filter((p) => {
      const name = (p.name ?? "").toLocaleLowerCase("pt-BR");
      const cpf = (p.cpf ?? "").replace(/\D/g, "");
      const phone = (p.phone ?? "").replace(/\D/g, "");

      return (
        name.includes(term) ||
        (digits.length > 0 && cpf.includes(digits)) ||
        (digits.length > 0 && phone.includes(digits))
      );
    });
  }, [patients, search]);

  const selectPatient = (selected: PatientSummary) => {
    setPatient(selected);
    setPatientMenuOpen(false);
    setSearch("");
    setError("");
    setActiveTab("anamnese");
    setRecord(EMPTY_RECORD);
    setSignalNumber((n) => n + 1);
  };

  const go = useCallback(
    (tab: TabId, action?: "new") => {
      if (
        tab === "anamnese" ||
        tab === "evolucoes" ||
        tab === "fotos"
      ) {
        setActiveTab(tab);
      }

      if (action === "new") {
        setSignalNumber((n) => n + 1);
      }
    },
    []
  );

  const signal = useMemo(
    () => ({
      tab: (
        activeTab === "facemap" ? "fotos" : activeTab
      ) as TabId,
      n: signalNumber,
    }),
    [activeTab, signalNumber]
  );

  const handleRefresh = async () => {
    await loadPatients();

    if (patient?.id) {
      await reload();
    }
  };

  return (
    <AppShell
    active="prontuarios"
   breadcrumb="Prontuários"
   search={{
    value: search,
    onChange: setSearch,
    placeholder: "Buscar paciente...",
    }}
      >
      <div className="h-full min-h-0 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Cabeçalho */}
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                <Activity size={15} />
                Gestão clínica
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Prontuário eletrônico
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Anamnese, evolução clínica e histórico do paciente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loadingPatients || loadingRecord}
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                size={16}
                className={
                  loadingPatients || loadingRecord
                    ? "animate-spin"
                    : ""
                }
              />
              Atualizar
            </button>
          </header>

          {/* Seleção do paciente */}
          <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <UserRound size={18} className="text-teal-700" />
              <h2 className="text-sm font-bold text-slate-800">
                Paciente do prontuário
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setPatientMenuOpen((open) => !open)}
              className="flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/30"
              aria-expanded={patientMenuOpen}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-teal-800">
                {patient?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={patient.avatar}
                    alt={patient.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={22} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">
                  {patient
                    ? "Paciente selecionado"
                    : "Selecione um paciente para começar"}
                </p>

                <p className="mt-1 truncate font-semibold text-slate-900">
                  {patient?.name ?? "Nenhum paciente selecionado"}
                </p>

                {patient && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {patient.cpf
                      ? `CPF: ${patient.cpf}`
                      : "CPF não informado"}
                    {patient.phone
                      ? ` · ${patient.phone}`
                      : ""}
                  </p>
                )}
              </div>

              {patient && (
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    setPatient(null);
                    setRecord(EMPTY_RECORD);
                    setError("");
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Limpar paciente selecionado"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.stopPropagation();
                      setPatient(null);
                      setRecord(EMPTY_RECORD);
                    }
                  }}
                >
                  <X size={17} />
                </span>
              )}

              <ChevronDown
                size={18}
                className={`shrink-0 text-slate-400 transition ${
                  patientMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {patientMenuOpen && (
              <div className="absolute inset-x-4 top-[calc(100%-8px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:inset-x-5">
                <div className="border-b border-slate-100 p-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                    <Search
                      size={17}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      autoFocus
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Buscar por nome, CPF ou telefone..."
                      className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Limpar busca"
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                  {loadingPatients ? (
                    <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Carregando pacientes...
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="p-6 text-center">
                      <UserRound
                        size={25}
                        className="mx-auto mb-2 text-slate-300"
                      />
                      <p className="text-sm font-medium text-slate-700">
                        Nenhum paciente encontrado
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Confira a pesquisa ou atualize a lista.
                      </p>
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-teal-50 ${
                          patient?.id === p.id
                            ? "bg-teal-50"
                            : ""
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-600">
                          {p.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound size={18} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {p.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {p.cpf || "CPF não informado"}
                            {p.phone ? ` · ${p.phone}` : ""}
                          </p>
                        </div>

                        {patient?.id === p.id && (
                          <span className="text-xs font-semibold text-teal-700">
                            Selecionado
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Erros da API */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Não foi possível concluir a operação
                </p>
                <p className="mt-1 break-words">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Fechar mensagem"
                className="rounded p-1 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Indicadores do prontuário */}
          {patient && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Registros clínicos",
                  value: record.notes.length,
                  icon: FileText,
                },
                {
                  label: "Fotos clínicas",
                  value: record.media.length,
                  icon: Images,
                },
                {
                  label: "Prescrições",
                  value: record.prescriptions.length,
                  icon: ClipboardList,
                },
                {
                  label: "Atendimentos",
                  value: record.appointments.length,
                  icon: Activity,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {item.label}
                      </span>
                      <Icon
                        size={17}
                        className="text-teal-700"
                      />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {loadingRecord ? "—" : item.value}
                    </p>
                  </div>
                );
              })}
            </section>
          )}

          {/* Abas */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto border-b border-slate-200 px-3 pt-3 sm:px-5">
              <nav
                className="flex min-w-max gap-1"
                aria-label="Seções do prontuário"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSignalNumber((n) => n + 1);
                      }}
                      disabled={!patient}
                      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? "border-teal-600 text-teal-800"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon size={17} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="min-h-[360px] p-4 sm:p-6">
              {!patient ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <UserRound size={30} />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Selecione um paciente
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Para visualizar o histórico e registrar uma
                    anamnese, selecione um paciente no campo acima.
                    Os dados clínicos serão carregados automaticamente.
                  </p>

                  <button
                    type="button"
                    onClick={() => setPatientMenuOpen(true)}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
                  >
                    <Search size={16} />
                    Selecionar paciente
                  </button>
                </div>
              ) : loadingRecord ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-teal-700"
                  />
                  <p className="text-sm font-medium">
                    Carregando prontuário de {patient.name}...
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "anamnese" && (
                    <AnamneseTab
                      patient={patient}
                      record={record}
                      pro={pro}
                      reload={reload}
                      go={go}
                      signal={signal}
                    />
                  )}

                  {activeTab === "evolucoes" && (
                    <EvolutionsTab
                      patient={patient}
                      record={record}
                      pro={pro}
                      reload={reload}
                      go={go}
                      signal={signal}
                    />
                  )}

                  {activeTab === "fotos" && (
                    <PhotosTab
                      patient={patient}
                      record={record}
                      pro={pro}
                      reload={reload}
                      go={go}
                      signal={signal}
                    />
                  )}

                  {activeTab === "facemap" && (
  <FaceMap
    points={[]}
    onAdd={() => {}}
    onSelect={() => {}}
    activeId={undefined}
  />
)}
                </>
              )}
            </div>
          </section>

          <footer className="pb-2 text-center text-xs text-slate-400">
            Prontuário eletrônico · Dados clínicos vinculados ao paciente selecionado
          </footer>
        </div>
      </div>
    </AppShell>
  );
}
