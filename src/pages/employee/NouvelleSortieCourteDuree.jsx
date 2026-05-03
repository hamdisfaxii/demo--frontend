import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import { useAuth } from "../../context/authcontext";
import { isFranceSortieCourteEligible } from "../../utils/country";

const NON_FR_CAP = 3;
const FIXED_MINUTES = 120;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function addMinutesToTimeString(hhmm, deltaMin) {
  if (!hhmm || typeof hhmm !== "string") return "";
  const [ha, ma] = hhmm.split(":").map(Number);
  if (!Number.isFinite(ha) || !Number.isFinite(ma)) return "";
  let t = ha * 60 + ma + deltaMin;
  if (t < 0) t = 0;
  if (t >= 24 * 60) t = 24 * 60 - 1;
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

function minutesDelta(hd, hf) {
  if (!hd || !hf) return NaN;
  const [h1, m1] = hd.split(":").map(Number);
  const [h2, m2] = hf.split(":").map(Number);
  if (![h1, m1, h2, m2].every(Number.isFinite)) return NaN;
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

export default function NouvelleSortieCourteDuree() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading, error, fetchSolde, soldeSummary, creerDemande } = useDemandes();

  const fr = isFranceSortieCourteEligible(user?.country);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [motif, setMotif] = useState("");
  const [motifCategorie, setMotifCategorie] = useState("rendez_vous");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const restantes =
    typeof soldeSummary?.autorisationsCourtesMoisRestantes === "number"
      ? soldeSummary.autorisationsCourtesMoisRestantes
      : null;
  const utilisees =
    typeof soldeSummary?.autorisationsCourtesMoisUtilisees === "number"
      ? soldeSummary.autorisationsCourtesMoisUtilisees
      : null;
  const maxMois =
    typeof soldeSummary?.autorisationsCourtesMoisMaximum === "number"
      ? soldeSummary.autorisationsCourtesMoisMaximum
      : NON_FR_CAP;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateDebut(today);
    setDateFin(today);
  }, []);

  useEffect(() => {
    fetchSolde().catch(() => {});
  }, [fetchSolde]);

  useEffect(() => {
    if (!fr && heureDebut) {
      setHeureFin(addMinutesToTimeString(heureDebut, FIXED_MINUTES));
    }
  }, [fr, heureDebut]);

  const motifComplet = useMemo(() => {
    if (fr) return motif.trim();
    const labels = {
      rendez_vous: "2h rendez-vous",
      urgence: "2h urgence",
      autorisation: "2h autorisation",
    };
    const prefix = labels[motifCategorie] || "2h autorisation";
    const detail = motif.trim();
    return detail ? `${prefix} — ${detail}` : prefix;
  }, [fr, motif, motifCategorie]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
        Chargement…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const dDeb = dateDebut;
    const dFin = fr ? dateFin : dateDebut;

    if (!dDeb) {
      setFormError("Veuillez renseigner la date.");
      return;
    }
    if (fr && !dFin) {
      setFormError("Veuillez renseigner la date de fin.");
      return;
    }

    const start = new Date(dDeb);
    if (Number.isNaN(start.getTime())) {
      setFormError("La date de début n'est pas valide.");
      return;
    }
    if (fr) {
      const end = new Date(dFin);
      if (Number.isNaN(end.getTime())) {
        setFormError("La date de fin n'est pas valide.");
        return;
      }
      if (end < start) {
        setFormError("La date de fin doit être après ou égale au début.");
        return;
      }
    }

    if (!heureDebut) {
      setFormError("Veuillez renseigner l'heure de début.");
      return;
    }

    if (!heureFin) {
      setFormError("Veuillez renseigner l'heure de fin.");
      return;
    }

    if (!fr && !motifComplet.trim()) {
      setFormError("Veuillez compléter le motif.");
      return;
    }

    if (fr && !motif.trim()) {
      setFormError("Veuillez renseigner le motif.");
      return;
    }

    if (!fr) {
      const capRest =
        typeof restantes === "number" ? restantes : maxMois;
      if (capRest <= 0) {
        setFormError(
          "Limite mensuelle de 3 autorisations courtes atteinte.",
        );
        return;
      }
      const md = minutesDelta(heureDebut, heureFin);
      if (md !== FIXED_MINUTES) {
        setFormError(
          "La durée doit être exactement 2 heures (autorisations hors France).",
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await creerDemande({
        type: "sortie",
        dateSortie: dDeb,
        dateDebut: dDeb,
        dateFin: dFin,
        heureDebut,
        heureFin,
        motif: fr ? motif.trim() : motifComplet.trim(),
      });
      navigate("/employee/historique");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        (typeof err?.message === "string" ? err.message : null);
      setFormError(
        apiMsg ||
          error ||
          "Erreur lors de l'ajout de la demande de sortie.",
      );
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
          {fr ? "Sortie courte durée (France — RTT)" : "Autorisation courte (2 h)"}
        </h1>

        <p className="mt-3 text-slate-600">
          {fr
            ? "RTT journée, demi-journée ou plage horaire : la durée en jours ouvrés est calculée côté serveur à partir des dates et décomptée de votre solde RTT."
            : `Jusqu’à ${maxMois} autorisations de 2 h par mois calendaire (créées ou en attente). La 4ᵉ est refusée.`}
        </p>

        <div
          className={`mt-6 rounded-xl border px-5 py-4 ${
            fr
              ? "border-violet-200 bg-violet-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-wide ${
              fr ? "text-violet-900" : "text-amber-900"
            }`}
          >
            {fr ? "Solde RTT / sortie courte (jours)" : "Autorisations 2 h ce mois-ci"}
          </div>
          <div
            className={`mt-1 text-xl font-bold ${
              fr ? "text-violet-950" : "text-amber-950"
            }`}
          >
            {fr ? (
              <>
                {soldeSummary
                  ? `${soldeSummary.permission} jour(s)`
                  : "—"}
              </>
            ) : (
              <>
                {typeof utilisees === "number" && typeof restantes === "number" ? (
                  <>
                    {utilisees} / {maxMois} utilisée(s) —{" "}
                    <span className="text-emerald-800">{restantes} restante(s)</span>
                  </>
                ) : (
                  <span className="text-sm font-medium">
                    Solde du mois : chargez la page ou reconnectez-vous pour afficher le compteur.
                  </span>
                )}
              </>
            )}
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
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                {fr ? "Date début" : "Date"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  const v = e.target.value;
                  setDateDebut(v);
                  if (!fr) return;
                  setDateFin((prev) => (prev < v ? v : prev));
                }}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {fr ? (
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateFin}
                  min={dateDebut}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={motifCategorie}
                  onChange={(e) => setMotifCategorie(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rendez_vous">2h rendez-vous</option>
                  <option value="urgence">2h urgence</option>
                  <option value="autorisation">2h autorisation</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Heure début <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Heure fin <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={heureFin}
                readOnly={!fr}
                onChange={(e) => fr && setHeureFin(e.target.value)}
                className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  !fr ? "bg-slate-50 text-slate-700" : ""
                }`}
                required
              />
              {!fr ? (
                <p className="mt-1 text-xs text-slate-500">
                  Calculée automatiquement : début + 2 h (règle métier).
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                {fr ? "Motif" : "Précision (optionnel)"}{" "}
                {fr ? <span className="text-red-500">*</span> : null}
              </label>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full min-h-[120px] resize-y border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={
                  fr
                    ? "Ex. RTT journée, départ anticipé, etc."
                    : "Détail libre (ex. motif du rendez-vous)"
                }
                required={fr}
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
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
