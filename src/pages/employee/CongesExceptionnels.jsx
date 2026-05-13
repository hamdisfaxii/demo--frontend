import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../../components/commun/Spinner";
import useDemandes from "../../hooks/useDemandes";
import api from "../../utils/api";

export default function CongesExceptionnels() {
  const navigate = useNavigate();
  const { creerDemande } = useDemandes();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [selectedId, setSelectedId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const selected = useMemo(
    () => items.find((i) => String(i.id) === String(selectedId)) || null,
    [items, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/exceptional-leaves/available");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      setError("Impossible de charger les congés exceptionnels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setSuccess("");
    if (!selectedId) {
      setError("Veuillez sélectionner un congé exceptionnel.");
      return;
    }
    if (!dateDebut || !dateFin) {
      setError("Veuillez sélectionner une période.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const demande = await creerDemande({
        titre: "Congé exceptionnel",
        dateDebut,
        dateFin,
        commentaire: motif,
        exceptionalLeaveConfigId: Number(selectedId),
      });

      if (file && demande?.id) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/conge/${demande.id}/attachments`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSuccess("Demande créée avec succès.");
      setMotif("");
      setFile(null);
      setDateDebut("");
      setDateFin("");
      setSelectedId("");
      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        (typeof e?.response?.data === "string" ? e.response.data : null);
      setError(msg || "Impossible de créer la demande.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-4xl font-bold text-slate-900">Congés exceptionnels</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Retour
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="text-sm font-medium text-red-700">{error}</div>
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">{success}</div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-sky-700">Disponibles pour votre pays</h2>
            {loading ? (
              <div className="mt-6">
                <Spinner />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{it.label}</div>
                      <div className="text-xs text-slate-600">
                        Quota annuel: {it.daysPerYear ?? 0} j — Restant: {it.remainingDays ?? "—"} j
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(String(it.id))}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Choisir
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Aucun congé exceptionnel n'est configuré pour votre pays.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-sky-700">Nouvelle demande</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Type
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner —</option>
                  {items.map((it) => (
                    <option key={it.id} value={String(it.id)}>
                      {it.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Date début
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Date fin
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700">
                Motif (optionnel)
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Justificatif (optionnel)
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm text-slate-700"
                />
              </label>

              <button
                type="button"
                onClick={submit}
                disabled={saving || !selected}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Envoi..." : "Soumettre la demande"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

