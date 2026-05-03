import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import SoldeConge from "../../components/employee/SoldeConge";
import CarteAction from "../../components/employee/CarteAction";
import Spinner from "../../components/commun/Spinner";
import { useAuth } from "../../context/authcontext";
import { isFranceSortieCourteEligible, metaForCountry } from "../../utils/country";

export default function DashboardEmploye() {
  const { user } = useAuth();
  const { solde, soldeSummary, loading, error, fetchSolde } = useDemandes();
  const navigate = useNavigate();
  const paysMeta = metaForCountry(user?.country);

  useEffect(() => {
    fetchSolde().catch(() => {});
  }, [fetchSolde]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 animate-fadeIn">
          Bienvenue dans votre espace privé
        </h1>
        {user && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
              title="Pays RH (DOM français regroupés en France pour les quotas)"
            >
              <span className="text-lg" aria-hidden>
                {paysMeta.flag}
              </span>
              <span className="font-semibold text-slate-900">{paysMeta.label}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                ({user.country || "—"})
              </span>
            </span>
            {user.departement ? (
              <span className="text-slate-500">
                Service : <strong className="text-slate-800">{user.departement}</strong>
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-8">
          {loading && soldeSummary == null ? (
            <Spinner />
          ) : (
            <SoldeConge
              soldeSummary={soldeSummary}
              solde={solde}
              employeeCountry={user?.country}
            />
          )}
          {error && (
            <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm font-medium text-red-700">{error}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <div className="w-full sm:w-80">
            <CarteAction
              titre="Mon calendrier"
              description="Vue mois : congés validés ou en attente et jours fériés selon votre pays."
              boutonTexte="Ouvrir le calendrier"
              icone={<div className="text-2xl">📆</div>}
              onClick={() => navigate("/employee/calendar")}
            />
          </div>

          <div className="w-full sm:w-80">
            <CarteAction
              titre="Je demande un congé"
              description="Créez une nouvelle demande de congé en quelques secondes."
              boutonTexte="Nouvelle demande"
              icone={<div className="text-2xl">📅</div>}
              onClick={() => navigate("/employee/conge/new")}
            />
          </div>

          <div className="w-full sm:w-80">
            <CarteAction
              titre={
                isFranceSortieCourteEligible(user?.country)
                  ? "Sortie courte durée (France — RTT)"
                  : "Autorisation courte (2 h)"
              }
              description={
                isFranceSortieCourteEligible(user?.country)
                  ? "RTT en jours ouvrés ou plage horaire : uniquement sur cet écran, pas sur la demande de congé classique."
                  : "Jusqu’à 3 autorisations de 2 h par mois (types : rendez-vous, urgence, autorisation)."
              }
              boutonTexte="Faire une demande"
              icone={<div className="text-2xl">⏰</div>}
              onClick={() => navigate("/employee/sortie/new")}
            />
          </div>
          <div className="w-full sm:w-80">
            <CarteAction
              titre="J'arrive en retard"
              description="Soumettez votre demande de retard selon vos horaires."
              boutonTexte="Faire une demande"
              icone={<div className="text-2xl">⏳</div>}
              onClick={() => navigate("/employee/retard/new")}
            />
          </div>

        </div>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="p-4 font-semibold text-slate-900">Suivi des demandes</th>
                <th className="p-4 font-semibold text-slate-900">Description</th>
                <th className="p-4 font-semibold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-4 text-slate-800 font-medium">Demandes en cours</td>
                <td className="p-4 text-slate-600">
                  Consultez vos demandes en attente de validation.
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => navigate("/employee/historique?statut=attente")}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all"
                  >
                    Ouvrir
                  </button>
                </td>
              </tr>
              <tr className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-4 text-slate-800 font-medium">Historique des demandes</td>
                <td className="p-4 text-slate-600">
                  Voir toutes vos demandes (acceptées, refusées, annulées).
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => navigate("/employee/historique?statut=tous")}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-all"
                  >
                    Ouvrir
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
