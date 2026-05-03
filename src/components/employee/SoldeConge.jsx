import React from "react";

/**
 * Affiche une synthèse des soldes (congés payés, permission, maladie) si disponible ;
 * sinon le nombre unique `solde` (compat anciens backends).
 */
export default function SoldeConge({ soldeSummary, solde }) {
  if (soldeSummary) {
    const {
      congesPayes,
      permission,
      maladie,
      maladieNonDecompte,
      maladieMessage,
      hintCongesPayes,
      soldeTotalTousTypes,
    } = soldeSummary;

    const maladieSousTexte =
      maladieNonDecompte &&
      typeof maladieMessage === "string" &&
      maladieMessage.trim()
        ? maladieMessage
        : maladieNonDecompte
          ? "Géré hors quota (justification ou règle interne)."
          : null;

    const bloc = (title, valeurOuTexte, sousTitre, borderClassName = "border-blue-600") => (
      <div
        key={title}
        className={`bg-white rounded-2xl shadow-md border-l-4 ${borderClassName} p-5 flex flex-col gap-1 fade-in-up`}
      >
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {valeurOuTexte}
          {typeof valeurOuTexte === "number" && (
            <span className="text-base text-slate-600 font-semibold ml-1">jours</span>
          )}
        </div>
        {sousTitre && (
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{sousTitre}</p>
        )}
      </div>
    );

    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-3">
          {bloc("Congés payés", Number(congesPayes) || 0, null)}
          {bloc(
            "Permissions (courte durée) — RTT",
            Number(permission) || 0,
            "Dont « Permission / courte durée » au Maroc (même bloc technique RTT au mock).",
            "border-violet-600",
          )}
          {bloc(
            "Congé maladie",
            maladieNonDecompte ? "Non décompté" : (maladie ?? 0),
            maladieSousTexte,
            "border-teal-600",
          )}
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-600 leading-relaxed">
          <p>
            {hintCongesPayes ||
              "Le solde principal affiché pour les demandes « congé payé » = congés payés uniquement. Les permissions (RTT), parental et maladie suivent d’autres compteurs ou règles."}
          </p>
            {typeof soldeTotalTousTypes === "number" && Number.isFinite(soldeTotalTousTypes) ? (
              <p className="mt-2 text-slate-500">
                Indicateur agrégé (optionnel / debug) tous types avec quota positif environ{" "}
                <strong>{soldeTotalTousTypes}</strong> jours au total — à ne pas confondre avec le
                bloc « Congés payés ».
              </p>
            ) : null}
        </div>
      </div>
    );
  }

  const safeSolde =
    typeof solde === "number"
      ? solde
      : Number.isFinite(Number(solde))
        ? Number(solde)
        : 0;

  return (
    <div className="bg-white rounded-2xl shadow-md border-l-4 border-blue-600 p-6 flex items-center gap-5 fade-in-up">
      <div className="w-14 h-14 rounded-xl bg-blue-100 grid place-items-center flex-shrink-0">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 4h10a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2Z"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 2v4M15 2v4"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 11h8M8 15h5"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Solde de congés
        </div>
        <div className="text-3xl font-bold text-slate-900 mt-1">
          {safeSolde}{" "}
          <span className="text-lg text-slate-600 font-semibold">jours</span>
        </div>
      </div>
    </div>
  );
}
