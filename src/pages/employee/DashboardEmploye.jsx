import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import SoldeConge from "../../components/employee/SoldeConge";
import CarteAction from "../../components/employee/CarteAction";
import Spinner from "../../components/commun/Spinner";

export default function DashboardEmploye() {
  const { solde, loading, error, fetchSolde } = useDemandes();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSolde().catch(() => {});
  }, [fetchSolde]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 animate-fadeIn">
          Bienvenue dans votre espace privé
        </h1>

        <div className="mt-8">
          {loading && !solde ? <Spinner /> : <SoldeConge solde={solde} />}
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
              titre="Je demande un congé"
              description="Créez une nouvelle demande de congé en quelques secondes."
              boutonTexte="Nouvelle demande"
              icone={<div className="text-2xl">📅</div>}
              onClick={() => navigate("/employee/conge/new")}
            />
          </div>

          <div className="w-full sm:w-80">
            <CarteAction
              titre="permission de courte durée"
              description="Demandez une permission (1 à 2 heures) pendant la journée de travail."
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
      </div>
      );
    </div>
  );
}
