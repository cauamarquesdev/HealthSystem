"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Upload, Columns2, Download, Trash2, Check, Loader2, AlertTriangle, X, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  API,
  patch,
  post,
  del,
  errMsg,
  fileToDataUrl,
  labelCls,
  inputCls,
  btnDark,
  btnLight,
  Chip,
  Dialog,
  ConfirmDialog,
  EmptyState,
  formatDate,
  toLocalInput,
  type Media,
  type TabProps,
} from "../lib/api";

type Cat = Media["category"];
const CATS: { id: Cat; label: string; tone: string }[] = [
  { id: "ANTES", label: "Antes", tone: "bg-slate-900 text-white" },
  { id: "DEPOIS", label: "Depois", tone: "bg-blue-600 text-white" },
  { id: "EXAME", label: "Exame", tone: "bg-amber-500 text-white" },
  { id: "REFERENCIA", label: "Referência", tone: "bg-violet-600 text-white" },
  { id: "OUTRO", label: "Outra", tone: "bg-slate-500 text-white" },
];
const catOf = (c: Cat) => CATS.find((x) => x.id === c) ?? CATS[4];
const REGIONS = ["Rosto (frontal)", "Perfil direito", "Perfil esquerdo", "Testa", "Olhos", "Lábios", "Mandíbula", "Pescoço", "Corpo", "Capilar"];
const src = (id: string) => `${API}/records/media/${id}/file`;

type PhotosTabProps = TabProps & {
  pendingNew?: boolean;
  consumeNew?: () => void;
};

export default function PhotosTab({ patient, record, reload, go, pendingNew, consumeNew }: PhotosTabProps) {
  const [filter, setFilter] = useState<Cat | "TODAS">("TODAS");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[] | null>(null);
  const [lightbox, setLightbox] = useState<Media | null>(null);
  const [compare, setCompare] = useState<[Media, Media] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaList = useMemo(() => record?.media ?? [], [record?.media]);
  const docsList = useMemo(() => record?.documents ?? [], [record?.documents]);

  const hasImageConsent = docsList.some(
    (d) => d.type === "TERMO_IMAGEM" && Boolean(d.signedAt)
  );

  useEffect(() => {
    if (pendingNew) {
      inputRef.current?.click();
      consumeNew?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNew]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { TODAS: mediaList.length };
    mediaList.forEach((p) => {
      m[p.category] = (m[p.category] ?? 0) + 1;
    });
    return m;
  }, [mediaList]);

  const groups = useMemo(() => {
    const list = mediaList.filter((m) => filter === "TODAS" || m.category === filter);
    const map = new Map<string, Media[]>();
    list.forEach((m) => {
      const key = new Date(m.takenAt).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), m]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [mediaList, filter]);

  const toggleSelect = (m: Media) =>
    setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : s.length >= 2 ? [s[1], m.id] : [...s, m.id]));

  const openCompare = (a: Media, b: Media) => {
    // sempre mostra a foto mais antiga à esquerda
    const [first, second] = new Date(a.takenAt) <= new Date(b.takenAt) ? [a, b] : [b, a];
    setCompare([first, second]);
  };

  const quickCompare = () => {
    const before = [...mediaList].filter((m) => m.category === "ANTES").sort((a, b) => +new Date(a.takenAt) - +new Date(b.takenAt))[0];
    const after = [...mediaList].filter((m) => m.category === "DEPOIS").sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt))[0];
    if (!before || !after) {
      toast?.message?.("Para comparar automaticamente, envie ao menos uma foto “Antes” e uma “Depois”.");
      return;
    }
    openCompare(before, after);
  };

  const pickedMedia = selected.map((id) => mediaList.find((m) => m.id === id)).filter(Boolean) as Media[];

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Fotos clínicas</h2>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5">Documentação visual do tratamento, vinculada ao prontuário.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={quickCompare} className={btnLight}><SplitSquareHorizontal className="w-4 h-4 text-slate-400" /> Antes × Depois</button>
          <button
            onClick={() => { setSelectMode((v) => !v); setSelected([]); }}
            className={`${btnLight} ${selectMode ? "!border-blue-500 !text-blue-700 !bg-blue-50" : ""}`}
          >
            <Columns2 className="w-4 h-4 text-slate-400" /> {selectMode ? "Cancelar seleção" : "Comparar fotos"}
          </button>
          <button onClick={() => inputRef.current?.click()} className={btnDark}><Upload className="w-4 h-4" /> Enviar fotos</button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            hidden
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length) setFiles(list);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {!hasImageConsent && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[12px] font-medium text-amber-900 flex-1">Este paciente não tem o <strong>termo de uso de imagem</strong> assinado. Colete a autorização antes de registrar fotos.</p>
          <button onClick={() => go("documentos", "new")} className="text-[12px] font-bold text-amber-800 hover:underline shrink-0">Coletar termo</button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Chip active={filter === "TODAS"} onClick={() => setFilter("TODAS")}>Todas <span className="opacity-60 tabular-nums ml-1">{counts.TODAS ?? 0}</span></Chip>
        {CATS.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.label} <span className="opacity-60 tabular-nums ml-1">{counts[c.id] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {selectMode && (
        <div className="rounded-2xl bg-[#0B0F19] text-white px-5 py-3.5 flex items-center justify-between gap-4">
          <p className="text-[13px] font-bold">{selected.length === 0 ? "Selecione duas fotos para comparar" : selected.length === 1 ? "Selecione mais uma foto" : "Duas fotos selecionadas"}</p>
          <button disabled={selected.length !== 2} onClick={() => { openCompare(pickedMedia[0], pickedMedia[1]); setSelectMode(false); setSelected([]); }} className="h-9 px-4 rounded-xl text-[12px] font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Abrir comparação
          </button>
        </div>
      )}

      {mediaList.length === 0 ? (
        <EmptyState
          icon={<Camera className="w-6 h-6" />}
          title="Nenhuma foto registrada"
          text="Registre fotos de antes e depois para acompanhar a evolução. As imagens ficam protegidas contra exclusão após 24h."
          action={<button onClick={() => inputRef.current?.click()} className={btnDark}><Upload className="w-4 h-4" /> Enviar primeira foto</button>}
        />
      ) : groups.length === 0 ? (
        <p className="text-[13px] font-medium text-slate-500 py-10 text-center">Nenhuma foto nesta categoria.</p>
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {formatDate(day + "T12:00:00")} <span className="text-slate-300">• {items.length} foto{items.length > 1 ? "s" : ""}</span>
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((m) => {
                const on = selected.includes(m.id);
                const cat = catOf(m.category);
                return (
                  <button
                    key={m.id}
                    onClick={() => (selectMode ? toggleSelect(m) : setLightbox(m))}
                    className={`group relative text-left rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all ${on ? "border-blue-500 ring-4 ring-blue-500/20" : "border-slate-200"}`}
                  >
                    <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
                      <img src={src(m.id)} alt={m.description ?? `Foto ${cat.label}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                    </div>
                    <span className={`absolute top-2.5 left-2.5 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${cat.tone}`}>{cat.label}</span>
                    {selectMode && (
                      <span className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${on ? "bg-blue-600 border-blue-600" : "bg-white/80 border-white"}`}>
                        {on && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                    )}
                    <div className="px-3 py-2.5">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{m.region || "Sem região"}</p>
                      <p className="text-[11px] font-medium text-slate-400 truncate">{m.description || formatDate(m.takenAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      <UploadDialog files={files} patientId={patient?.id} onClose={() => setFiles(null)} onDone={async () => { setFiles(null); await reload(); }} />
      <Lightbox media={lightbox} onClose={() => setLightbox(null)} onChanged={async () => { setLightbox(null); await reload(); }} />
      <Dialog open={!!compare} onClose={() => setCompare(null)} title="Comparação" maxWidth={820} icon={<SplitSquareHorizontal className="w-5 h-5 text-slate-500" />}>
        {compare && <CompareView a={compare[0]} b={compare[1]} />}
      </Dialog>
    </div>
  );
}

/* ============================================================
 *  UPLOAD
 * ============================================================ */
function UploadDialog({ files, patientId, onClose, onDone }: { files: File[] | null; patientId: string; onClose: () => void; onDone: () => void }) {
  const [category, setCategory] = useState<Cat>("ANTES");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [takenAt, setTakenAt] = useState(toLocalInput());
  const [progress, setProgress] = useState<number | null>(null);
  const previews = useMemo(() => (files ?? []).map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const send = async () => {
    if (!files || !patientId) return;
    setProgress(0);
    let ok = 0;
    for (const f of files) {
      try {
        const dataUrl = await fileToDataUrl(f);
        await post(`/records/patients/${patientId}/media`, { dataUrl, category, region, description, takenAt: new Date(takenAt).toISOString() });
        ok++;
      } catch (e) {
        toast?.error(`${f.name}: ${errMsg(e)}`);
      }
      setProgress((p) => (p ?? 0) + 1);
    }
    if (ok) toast?.success(`${ok} foto${ok > 1 ? "s enviadas" : " enviada"}.`);
    setProgress(null);
    if (ok) onDone();
  };

  const busy = progress !== null;
  return (
    <Dialog
      open={!!files}
      onClose={() => !busy && onClose()}
      title={`Enviar ${files?.length ?? 0} foto${(files?.length ?? 0) > 1 ? "s" : ""}`}
      icon={<Upload className="w-5 h-5 text-slate-500" />}
      maxWidth={560}
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button disabled={busy} onClick={send} className={btnDark}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {busy ? `Enviando ${progress}/${files?.length}` : "Enviar"}
          </button>
        </>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {previews.map((u) => (
          <img key={u} src={u} alt="" className="w-20 h-24 rounded-xl object-cover border border-slate-200 shrink-0" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelCls}>Categoria</label>
          <div className="flex flex-wrap gap-1.5">{CATS.map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className={labelCls}>Região / ângulo</label>
            <input list="photo-regions" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex.: Rosto (frontal)" className={inputCls} />
            <datalist id="photo-regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Data da foto</label>
            <input type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Descrição (opcional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Ex.: 15 dias após toxina" className={inputCls} />
        </div>
        <p className="text-[11px] font-medium text-slate-400">As imagens são otimizadas (até 1600 px) antes do envio. Depois de 24h não podem ser excluídas.</p>
      </div>
    </Dialog>
  );
}

/* ============================================================
 *  LIGHTBOX
 * ============================================================ */
function Lightbox({ media, onClose, onChanged }: { media: Media | null; onClose: () => void; onChanged: () => void }) {
  const [category, setCategory] = useState<Cat>("OUTRO");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (media) {
      setCategory(media.category);
      setRegion(media.region ?? "");
      setDescription(media.description ?? "");
    }
  }, [media]);

  if (!media) return null;
  const dirty = category !== media.category || region !== (media.region ?? "") || description !== (media.description ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await patch(`/records/media/${media.id}`, { category, region, description });
      toast?.success("Foto atualizada.");
      onChanged();
    } catch (e) {
      toast?.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await del(`/records/media/${media.id}`);
      toast?.success("Foto excluída.");
      setConfirmDelete(false);
      onChanged();
    } catch (e) {
      toast?.error(errMsg(e));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const download = async () => {
    try {
      const blob = await (await fetch(src(media.id))).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `foto-${formatDate(media.takenAt).replace(/\//g, "-")}-${media.id.slice(0, 6)}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast?.error("Não foi possível baixar a imagem.");
    }
  };

  return (
    <>
      <Dialog open onClose={onClose} title={`Foto • ${formatDate(media.takenAt)}`} maxWidth={940}>
        <div className="grid grid-cols-[1fr_300px] gap-6">
          <div className="rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center max-h-[68vh]">
            <img src={src(media.id)} alt={media.description ?? "Foto clínica"} className="max-h-[68vh] w-auto object-contain" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={labelCls}>Categoria</label>
              <div className="flex flex-wrap gap-1.5">{CATS.map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}</div>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Região / ângulo</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Descrição</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={!dirty || saving} className={`${btnDark} flex-1 justify-center`}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar
              </button>
              <button onClick={download} aria-label="Baixar" title="Baixar" className={btnLight}><Download className="w-4 h-4" /></button>
              <button onClick={() => setConfirmDelete(true)} aria-label="Excluir" title="Excluir" className="h-10 w-10 rounded-xl text-rose-600 border border-rose-100 hover:bg-rose-50 flex items-center justify-center transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] font-medium text-slate-400">A imagem original não pode ser substituída. Exclusão só é possível até 24h após o envio.</p>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog open={confirmDelete} title="Excluir foto?" text="Essa ação não pode ser desfeita." confirmLabel="Excluir" danger busy={deleting} onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </>
  );
}

/* ============================================================
 *  COMPARAÇÃO
 * ============================================================ */
function CompareView({ a, b }: { a: Media; b: Media }) {
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const days = Math.round((+new Date(b.takenAt) - +new Date(a.takenAt)) / 86400000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-slate-700">
          {formatDate(a.takenAt)} <span className="text-slate-300 mx-1">→</span> {formatDate(b.takenAt)}{" "}
          <span className="text-slate-400 font-medium">• {days} dia{days === 1 ? "" : "s"} de intervalo</span>
        </p>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {([["slider", "Deslizar"], ["side", "Lado a lado"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} className={`px-3 h-7 rounded-md text-[12px] font-bold transition-colors ${mode === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>
      </div>

      {mode === "slider" ? (
        <div className="relative mx-auto aspect-[4/5] max-h-[62vh] rounded-2xl overflow-hidden bg-slate-900 select-none">
          <img src={src(b.id)} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <img src={src(a.id)} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-black/60 text-white rounded px-2 py-1">{formatDate(a.takenAt)}</span>
          <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest bg-black/60 text-white rounded px-2 py-1">{formatDate(b.takenAt)}</span>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] pointer-events-none" style={{ left: `${pos}%` }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-0 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
              <Columns2 className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Posição da comparação" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map((m) => (
            <figure key={m.id} className="space-y-2">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900"><img src={src(m.id)} alt="" className="w-full h-full object-cover" /></div>
              <figcaption className="text-[12px] font-bold text-slate-600 text-center">{formatDate(m.takenAt)} • {catOf(m.category).label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}