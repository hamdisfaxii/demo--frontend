import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import { getSuperAdmins } from "../../utils/rhApi";

export default function NouvelleDemandeRetard() {
  const navigate = useNavigate();
  const { loading, error, creerDemande } = useDemandes();

  const [date, setDate] = useState("");
  const [heureArrivee, setHeureArrivee] = useState("");
  const [motif, setMotif] = useState("");
  const [approvedByAdminId, setApprovedByAdminId] = useState("");
  const [admins, setAdmins] = useState([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSuperAdmins()
      .then((rows) => setAdmins(Array.isArray(rows) ? rows : []))
      .catch(() => setAdmins([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validation des champs obligatoires
    if (!date) {
      setFormError("Veuillez renseigner la date.");
      return;
    }

    if (!heureArrivee) {
      setFormError("Veuillez renseigner l'heure d'arrivée prévue.");
      return;
    }

    // Validation du format de la date
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      setFormError("La date n'est pas valide.");
      return;
    }

    // Validation du format de l'heure (HH:MM)
    const heureRegex = /^\d{2}:\d{2}$/;
    if (!heureRegex.test(heureArrivee)) {
      setFormError("L'heure doit être au format HH:MM.");
      return;
    }

    if (admins.length > 0 && !approvedByAdminId) {
      setFormError("Veuillez sélectionner « Approuvé par ».");
      return;
    }

    try {
      setSubmitting(true);
      await creerDemande({
        type: "retard",
        date,
        heureArrivee,
        motif: motif || undefined,
        approvedByAdminId: approvedByAdminId ? Number(approvedByAdminId) : undefined,
      });
      navigate("/employee/historique");
    } catch {
      setFormError(error || "Erreur lors de l'ajout de la demande de retard.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/employee/dashboard")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all"
          >
            &lt; Retour
          </button>
        </div>

        <h1 className="text-4xl font-bold text-slate-900">
          J'arrive en retard
        </h1>

        <p className="mt-3 text-slate-600">
          Soumettez votre demande de retard selon vos horaires.
        </p>

        {(loading || submitting) && (
          <div className="mt-4 text-sm font-medium text-slate-600">
            Chargement...
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Approuvé par {admins.length > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={approvedByAdminId}
                onChange={(e) => setApprovedByAdminId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">
                  {admins.length > 0 ? "Sélectionner un Super Admin" : "Super Admins indisponibles (mode compat)"}
                </option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || a.email}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Ce champ est requis si la liste des Super Admins est disponible.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Heure d'arrivée prévue <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Motif (optionnel)
              </label>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full min-h-[120px] resize-y border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Expliquez les raisons de votre retard..."
              />
            </div>
          </div>

          {formError && (
            <div className="mt-6 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm font-medium text-red-700">
                  {formError}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate("/employee/dashboard")}
              className="px-6 py-3 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Soumettre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
