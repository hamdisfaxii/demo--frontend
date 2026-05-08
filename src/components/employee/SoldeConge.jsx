import React from "react";
import { isFranceSortieCourteEligible } from "../../utils/country";

function formatRttFranceJours(val) {
  if (val == null || !Number.isFinite(Number(val))) return "—";
  const n = Number(val);
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function SoldeConge({ soldeSummary, solde, employeeCountry }) {
  const showFranceSortieCourte = isFranceSortieCourteEligible(employeeCountry);

  if (soldeSummary) {
    const { congesPayes, permission, maladie, franceRtt } = soldeSummary;

    const malNum = Number(maladie);
    const joursMal = Number.isFinite(malNum) ? Math.max(0, malNum) : 0;

    const showShortLeaveCardFrance = showFranceSortieCourte;
    const shortNonFrMax = soldeSummary.autorisationsCourtesMoisMaximum;
    const shortNonFrRest = soldeSummary.autorisationsCourtesMoisRestantes;
    const showShortLeaveCardIntl =
      !showFranceSortieCourte &&
      shortNonFrRest != null &&
      shortNonFrMax != null;

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

    const gridCols =
      showShortLeaveCardFrance || showShortLeaveCardIntl
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

    return (
      <div>
        <div className={`grid gap-4 ${gridCols}`}>
          {bloc("Congés payés", Number(congesPayes) || 0, null)}
          {showShortLeaveCardFrance ? (
            franceRtt && typeof franceRtt === "object" ? (
              <div
                key="rt"
                className="bg-white rounded-2xl shadow-md border-l-4 border-violet-600 p-5 flex flex-col gap-3 fade-in-up"
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  RTT (France)
                </div>
                {franceRtt.contractSuspended ? (
                  <p className="text-sm text-slate-600">Contrat suspendu</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center sm:text-left sm:grid-cols-1">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">
                          Total
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {formatRttFranceJours(franceRtt.total)}{" "}
                          <span className="text-sm font-semibold text-slate-600">j</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">
                          Pris
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {formatRttFranceJours(franceRtt.used)}{" "}
                          <span className="text-sm font-semibold text-slate-600">j</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">
                          Restant
                        </div>
                        <div className="text-lg font-bold text-emerald-800">
                          {formatRttFranceJours(franceRtt.remaining)}{" "}
                          <span className="text-sm font-semibold text-slate-600">j</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              bloc("RTT / sortie courte", Number(permission) || 0, null, "border-violet-600")
            )
          ) : showShortLeaveCardIntl
              ? bloc(
                  "Autorisations 2 h (mois)",
                  `${shortNonFrRest}/${shortNonFrMax}`,
                  null,
                  "border-amber-600",
                )
              : null}
          {bloc("Congé maladie", joursMal, null, "border-teal-600")}
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
