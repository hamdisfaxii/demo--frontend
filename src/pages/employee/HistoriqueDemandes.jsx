import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
import FiltresDemandes from "../../components/employee/FiltresDemandes";
import StatutBadge from "../../components/employee/StatutBadge";
import ModalConfirmation from "../../components/commun/ModalConfirmation";
import Spinner from "../../components/commun/Spinner";
import { formaterDate } from "../../utils/calculJours";
import { libelleAffichageTypeConge } from "../../utils/country";

const normalizeForStatus = (statut) => {
  const raw = String(statut ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return raw.replace(/\s+/g, "_");
};

const isAttente = (statut) => {
  const n = normalizeForStatus(statut);
  return n === "attente" || n === "en_attente" || n === "enattente";
};

const pickId = (demande) => demande?.id ?? demande?._id ?? demande?.ID;

export default function HistoriqueDemandes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { demandes, loading, error, fetchDemandes, annulerDemande } =
    useDemandes();

  const statusFromQuery = useMemo(() => {
    const q = new URLSearchParams(location.search).get("statut");
    const allowed = new Set(["tous", "attente", "validee", "refusée", "annulée"]);
    return allowed.has(q) ? q : "tous";
  }, [location.search]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2024;
    const end = current + 2;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  const [filters, setFilters] = useState({
    annee: String(new Date().getFullYear()),
    statut: statusFromQuery,
  });

  const [page, setPage] = useState(1);
  const perPage = 10;

  const [modal, setModal] = useState({
    isOpen: false,
    demandeId: null,
    titre: "",
  });

  const totalPages = Math.max(1, Math.ceil(demandes.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const slice = demandes.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const handleSearch = (nextFilters) => {
    setPage(1);
    setFilters({
      annee: nextFilters?.annee ?? String(new Date().getFullYear()),
      statut: nextFilters?.statut ?? "tous",
    });
  };

  useEffect(() => {
    fetchDemandes({
      annee: filters.annee,
      statut: filters.statut,
    }).catch(() => {});
  }, [filters, fetchDemandes]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      statut: statusFromQuery,
    }));
    setPage(1);
  }, [statusFromQuery]);

  const handleCancel = (demande) => {
    const id = pickId(demande);
    setModal({
      isOpen: true,
      demandeId: id,
      titre: demande?.titre ?? demande?.type ?? "demande",
    });
  };

  const handleConfirmCancel = async () => {
    try {
      if (!modal.demandeId) return;
      await annulerDemande(modal.demandeId);
      setModal({ isOpen: false, demandeId: null, titre: "" });
      await fetchDemandes({ annee: filters.annee, statut: filters.statut });
    } catch {
      // error already handled by hook
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Mes demandes de congés
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/employee/dashboard")}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
          >
            Accueil
          </button>
        </div>

        <div className="mt-6">
          <FiltresDemandes
            years={years}
            initialAnnee={filters.annee}
            initialStatut={filters.statut}
            onSearch={handleSearch}
            onReset={() => {}}
          />
        </div>

        {loading && demandes.length === 0 ? (
          <div className="mt-6">
            <Spinner />
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-0.5">⚠️</div>
                  <div className="text-sm font-medium text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden fade-in-up">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-slate-700">
                      <th className="p-4 font-semibold text-slate-900">
                        Date début
                      </th>
                      <th className="p-4 font-semibold text-slate-900">
                        Date fin
                      </th>
                      <th className="p-4 font-semibold text-slate-900">
                        Nb jours
                      </th>
                      <th className="p-4 font-semibold text-slate-900">État</th>
                      <th className="p-4 font-semibold text-slate-900">
                        Titre
                      </th>
                      <th className="p-4 font-semibold text-slate-900">
                        Annuler
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-slate-500 text-center"
                        >
                          Aucune demande trouvée.
                        </td>
                      </tr>
                    ) : (
                      slice.map((demande) => {
                        const id = pickId(demande);
                        const etat = demande?.statut ?? demande?.status;
                        const jours =
                          demande?.nbJours ??
                          demande?.nombreJours ??
                          demande?.jours ??
                          demande?.nb_days;
                        const titre = demande?.titre ?? demande?.type;

                        return (
                          <tr
                            key={id}
                            className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/employee/demande/${id}`)}
                          >
                            <td className="p-4 text-slate-700">
                              {formaterDate(
                                demande?.dateDebut ?? demande?.debut,
                              )}
                            </td>
                            <td className="p-4 text-slate-700">
                              {formaterDate(demande?.dateFin ?? demande?.fin)}
                            </td>
                            <td className="p-4 text-slate-700">
                              {typeof jours === "number" ? jours : "--"}
                            </td>
                            <td className="p-4">
                              <StatutBadge statut={etat} />
                            </td>
                            <td className="p-4 text-slate-700">
                              {(() => {
                                const raw =
                                  titre ??
                                  demande?.typeConge ??
                                  demande?.type;
                                if (raw == null || String(raw).trim() === "") {
                                  return "--";
                                }
                                return libelleAffichageTypeConge(raw);
                              })()}
                            </td>
                            <td className="p-4">
                              {isAttente(etat) ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel(demande);
                                  }}
                                  className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 transition-all"
                                >
                                  Annuler
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-all"
                >
                  Précédent
                </button>
                <div className="text-sm font-medium text-slate-600">
                  Page {pageSafe} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-all"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ModalConfirmation
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, demandeId: null, titre: "" })}
        onConfirm={handleConfirmCancel}
        titre="Confirmer l'annulation"
        message={`Voulez-vous vraiment annuler votre demande ?`}
      />
    </div>
  );
}
