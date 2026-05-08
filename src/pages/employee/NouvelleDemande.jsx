import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import { calculerJoursOuvres } from "../../utils/calculJours";
import { useAuth } from "../../context/authcontext";
import { getSuperAdmins } from "../../utils/rhApi";

export default function NouvelleDemande() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { solde, soldeSummary, loading, error, fetchSolde, creerDemande } =
    useDemandes();

  const soldeCongesPayes =
    typeof soldeSummary?.congesPayes === "number"
      ? soldeSummary.congesPayes
      : typeof solde === "number"
        ? solde
        : 0;

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [startHalfDay, setStartHalfDay] = useState("");
  const [endHalfDay, setEndHalfDay] = useState("");
  const [titre, setTitre] = useState("Congé payé");
  const [commentaire, setCommentaire] = useState("");
  const [approvedByAdminId, setApprovedByAdminId] = useState("");
  const [admins, setAdmins] = useState([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSolde().catch(() => {});
  }, [fetchSolde]);

  useEffect(() => {
    getSuperAdmins()
      .then((rows) => setAdmins(Array.isArray(rows) ? rows : []))
      .catch(() => setAdmins([]));
  }, []);

  const nbJours = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (end <= start) return 0;
    return calculerJoursOuvres(dateDebut, dateFin, user?.country || "");
  }, [dateDebut, dateFin, user?.country]);

  const nbJoursExact = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    const base = nbJours;
    if (base <= 0) return 0;
    const sameDay = String(dateDebut) === String(dateFin);
    if (sameDay) {
      const s = startHalfDay || "MORNING";
      const e = endHalfDay || "AFTERNOON";
      if (s === "AFTERNOON" && e === "MORNING") return 0;
      if (s === e) return 0.5;
      return 1;
    }
    let exact = base;
    if (startHalfDay) exact -= 0.5;
    if (endHalfDay) exact -= 0.5;
    return Math.max(0, exact);
  }, [dateDebut, dateFin, endHalfDay, nbJours, startHalfDay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!dateDebut || !dateFin) {
      setFormError("Veuillez renseigner les dates.");
      return;
    }

    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    if (end <= start) {
      setFormError("La date de fin doit être supérieure à la date de début.");
      return;
    }

    if (nbJoursExact <= 0) {
      setFormError("Le nombre de jours doit être supérieur à 0.");
      return;
    }

    if (!titre) {
      setFormError("Veuillez sélectionner le type de congé.");
      return;
    }

    if (admins.length > 0 && !approvedByAdminId) {
      setFormError("Veuillez sélectionner « Approuvé par ».");
      return;
    }

    const titreNormalise = String(titre || "").toLowerCase();
    const doitVerifierSoldePaye =
      titreNormalise.includes("payé") && !titreNormalise.includes("sans solde");

    if (
      doitVerifierSoldePaye &&
      typeof soldeCongesPayes === "number" &&
      nbJoursExact > soldeCongesPayes
    ) {
      setFormError("Vous n'avez pas assez de jours de congés payés disponibles.");
      return;
    }

    if (
      titre === "Congé maladie" &&
      Date.now() - new Date(dateDebut) > 1000 * 60 * 60 * 48
    ) {
      setFormError(
        "Le congé maladie doit être déclaré dans les 48h suivant le début du congé.",
      );
      return;
    } //  la congé maladie doit être déclaré dans les 48h suivant le début du congé (travaille avec melie seconde pour faire le calcul )
    try {
      setSubmitting(true);
      await creerDemande({
        dateDebut,
        dateFin,
        titre,
        commentaire: commentaire || undefined,
        approvedByAdminId: approvedByAdminId ? Number(approvedByAdminId) : undefined,
        startHalfDay: startHalfDay || undefined,
        endHalfDay: endHalfDay || undefined,
      });
      navigate("/employee/historique");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.message === "string" ? err.message : null);
      setFormError(apiMsg || error || "Erreur lors de l'ajout de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const fld =
    "w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const lbl = "text-xs font-semibold text-slate-700 block mb-1";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-5 sm:px-5 sm:py-6">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/employee/dashboard")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all"
          >
            &lt; Retour
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Nouvelle demande de congé
        </h1>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-md ring-1 ring-slate-900/5 fade-in-up">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Utilisateur
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-semibold text-slate-900">
              {[user?.prenom, user?.nom].filter(Boolean).join(" ").trim() || user?.email || "—"}
            </span>
            {user?.email ? (
              <span className="text-xs text-slate-500 truncate max-w-full">{user.email}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 fade-in-up">
            <div className="text-[10px] font-semibold text-blue-900 uppercase tracking-wide">
              Solde disponible
            </div>
            <div className="mt-0.5 text-lg font-bold text-blue-900 tabular-nums">
              {typeof soldeCongesPayes === "number"
                ? `${soldeCongesPayes} jours`
                : "—"}
            </div>
          </div>
        </div>

        {(loading || submitting) && (
          <div className="mt-2 text-xs font-medium text-slate-600">
            Chargement...
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="text-red-500 text-sm mt-0.5">⚠️</div>
              <div className="text-xs font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-5 bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5 fade-in-up"
        >
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={lbl}>
                Type
              </label>
              <select
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className={fld}
                required
              >
                <option value="Congé payé">Congé payé</option>
                <option value="Congé sans solde">Sans solde</option>
                <option value="Congé maladie">Maladie</option>
              </select>
            </div>

            <div>
              <label className={lbl}>
                Date début
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className={`${fld} sm:flex-1 min-w-[9rem]`}
                  required
                />
                <select
                  value={startHalfDay}
                  onChange={(e) => setStartHalfDay(e.target.value)}
                  className={`${fld} sm:w-36 shrink-0`}
                  aria-label="Période début (matin ou après-midi)"
                >
                  <option value="">Journée complète</option>
                  <option value="MORNING">Matin</option>
                  <option value="AFTERNOON">Après-midi</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>
                Date fin
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className={`${fld} sm:flex-1 min-w-[9rem]`}
                  required
                />
                <select
                  value={endHalfDay}
                  onChange={(e) => setEndHalfDay(e.target.value)}
                  className={`${fld} sm:w-36 shrink-0`}
                  aria-label="Période fin (matin ou après-midi)"
                >
                  <option value="">Journée complète</option>
                  <option value="MORNING">Matin</option>
                  <option value="AFTERNOON">Après-midi</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>
                Nombre de jours (ouvrés)
              </label>
              <input
                type="text"
                value={nbJours}
                readOnly
                className={`${fld} bg-slate-50 font-medium tabular-nums`}
              />
            </div>

            <div>
              <label className={lbl}>
                Sera approuvé par {admins.length > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={approvedByAdminId}
                onChange={(e) => setApprovedByAdminId(e.target.value)}
                className={fld}
              >
                <option value="">
                  {admins.length > 0 ? "Sélectionner un validateur" : "Validateurs indisponibles (mode compat)"}
                </option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || a.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>
                Description
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className={`${fld} min-h-[96px] resize-y`}
              />
            </div>
          </div>

          {formError && (
            <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="text-red-500 text-sm mt-0.5">⚠️</div>
                <div className="text-xs font-medium text-red-700">
                  {formError}
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => navigate("/employee/dashboard")}
              className="px-4 py-2 rounded-md text-sm bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
