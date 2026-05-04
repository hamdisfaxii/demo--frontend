import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import { calculerJoursOuvres } from "../../utils/calculJours";
import { useAuth } from "../../context/authcontext";
import { isFranceSortieCourteEligible } from "../../utils/country";

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
  const [titre, setTitre] = useState("Congé payé");
  const [commentaire, setCommentaire] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSolde().catch(() => {});
  }, [fetchSolde]);

  const nbJours = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (end <= start) return 0;
    return calculerJoursOuvres(dateDebut, dateFin, user?.country || "");
  }, [dateDebut, dateFin, user?.country]);

  const titreInfo = useMemo(() => {
    const t = String(titre || "").toLowerCase();
    if (t.includes("maladie")) {
      return {
        variant: "maladie",
        text: "Congé maladie : vérifiez le solde « maladie » sur votre tableau de bord ; il est distinct des congés payés ci-dessus.",
      };
    }
    if (t.includes("sans solde")) {
      return {
        variant: "sans",
        text: "Congé sans solde : aucune vérification sur vos congés payés.",
      };
    }
    if (t.includes("payé")) {
      return {
        variant: "paye",
        text: "Seul ce type vérifie le bandeau « congés payés » avant envoi.",
      };
    }
    return null;
  }, [titre]);

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

    if (nbJours <= 0) {
      setFormError("Le nombre de jours doit être supérieur à 0.");
      return;
    }

    if (!titre) {
      setFormError("Veuillez sélectionner le type de congé.");
      return;
    }

    const titreNormalise = String(titre || "").toLowerCase();
    const doitVerifierSoldePaye =
      titreNormalise.includes("payé") && !titreNormalise.includes("sans solde");

    if (
      doitVerifierSoldePaye &&
      typeof soldeCongesPayes === "number" &&
      nbJours > soldeCongesPayes
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
      });
      navigate("/employee/historique");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        (typeof err?.message === "string" ? err.message : null);
      setFormError(apiMsg || error || "Erreur lors de l'ajout de la demande.");
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
          Nouvelle demande de congé
        </h1>

        <div className="mt-6">
          <div className="bg-blue-100 rounded-xl border border-blue-200 p-5 fade-in-up">
            <div className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
              Solde disponible
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-900">
              {typeof soldeCongesPayes === "number"
                ? `${soldeCongesPayes} jours`
                : "—"}
              <span className="block text-sm font-semibold text-blue-800/90 mt-2">
                (Congés payés uniquement — maladie / sans solde : pas le même quota)
              </span>
              {isFranceSortieCourteEligible(user?.country) &&
              soldeSummary &&
              typeof soldeSummary.permission === "number" ? (
                <span className="block text-xs text-blue-800/85 mt-2 leading-relaxed">
                  RTT / sorties courtes (France) : environ{" "}
                  <strong>{soldeSummary.permission} jour(s)</strong> — uniquement depuis l’écran «
                  Sortie courte durée » (menu employé).
                </span>
              ) : !isFranceSortieCourteEligible(user?.country) &&
                soldeSummary &&
                typeof soldeSummary.autorisationsCourtesMoisRestantes === "number" ? (
                <span className="block text-xs text-blue-800/85 mt-2 leading-relaxed">
                  Autorisations 2&nbsp;h (mois en cours) :{" "}
                  <strong>{soldeSummary.autorisationsCourtesMoisRestantes}</strong> créneau(x) possible(s)
                  sur {soldeSummary.autorisationsCourtesMoisMaximum ?? 2} — écran « Sortie courte
                  durée ».
                </span>
              ) : null}
            </div>
          </div>
        </div>

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
                Titre du congé
              </label>
              <select
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="Congé payé">Congé payé</option>
                <option value="Congé sans solde">Sans solde</option>
                <option value="Congé maladie">Maladie</option>
              </select>
              {titreInfo && (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                    titreInfo.variant === "paye"
                      ? "border-blue-200 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {titreInfo.text}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Date début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Nombre de jours (ouvrés)
              </label>
              <div>
                <input
                  type="text"
                  value={nbJours}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-700 font-medium"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Calcul automatique selon vos jours ouvrés (TN / FR / MA : week-ends exclus et jours fériés
                nationaux selon votre pays RH ; sinon week-ends seulement si le pays n’est pas encore
                défini).
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full min-h-[120px] resize-y border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ajoutez un commentaire..."
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
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
