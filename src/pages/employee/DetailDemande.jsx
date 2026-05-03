import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useDemandes from "../../hooks/useDemandes";
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

export default function DetailDemande() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { demandeDetail, loading, error, fetchDemandeById, annulerDemande } =
    useDemandes();

  const [modal, setModal] = useState({ isOpen: false, demandeId: null });

  useEffect(() => {
    if (id) fetchDemandeById(id).catch(() => {});
  }, [id, fetchDemandeById]);

  const statut = useMemo(() => {
    return demandeDetail?.statut ?? demandeDetail?.status;
  }, [demandeDetail]);

  const canAnnuler = isAttente(statut);

  const handleConfirmCancel = async () => {
    try {
      if (!modal.demandeId) return;
      await annulerDemande(modal.demandeId);
      setModal({ isOpen: false, demandeId: null });
      navigate("/employee/historique");
    } catch {
      // hook already sets error
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/employee/historique")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all"
          >
            &lt; Retour
          </button>
        </div>

        <h1 className="text-4xl font-bold text-slate-900">
          Détail de la demande
        </h1>

        {loading && !demandeDetail ? (
          <div className="mt-8">
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

            {demandeDetail ? (
              <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      Titre
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {libelleAffichageTypeConge(
                        demandeDetail?.titre ??
                          demandeDetail?.typeConge ??
                          demandeDetail?.type,
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <StatutBadge statut={statut} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date début
                    </div>
                    <div className="font-semibold text-slate-900 mt-1">
                      {formaterDate(
                        demandeDetail?.dateDebut ?? demandeDetail?.debut,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date fin
                    </div>
                    <div className="font-semibold text-slate-900 mt-1">
                      {formaterDate(
                        demandeDetail?.dateFin ?? demandeDetail?.fin,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Nombre de jours
                    </div>
                    <div className="font-semibold text-slate-900 mt-1">
                      {demandeDetail?.nbJours ??
                        demandeDetail?.nombreJours ??
                        demandeDetail?.jours ??
                        "--"}{" "}
                      jours
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Commentaire
                    </div>
                    <div className="text-slate-700 mt-1">
                      {demandeDetail?.commentaire ?? "--"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date de soumission
                    </div>
                    <div className="font-semibold text-slate-900 mt-1">
                      {formaterDate(
                        demandeDetail?.dateSoumission ??
                          demandeDetail?.createdAt ??
                          demandeDetail?.soumisLe,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date de réponse
                    </div>
                    <div className="font-semibold text-slate-900 mt-1">
                      {canAnnuler
                        ? "--"
                        : formaterDate(
                            demandeDetail?.dateReponse ??
                              demandeDetail?.reponseAt ??
                              demandeDetail?.validatedAt,
                          )}
                    </div>
                  </div>
                </div>

                {canAnnuler && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          isOpen: true,
                          demandeId: pickId(demandeDetail),
                        })
                      }
                      className="px-4 py-3 rounded-lg bg-red-100 text-sm font-semibold text-red-700 hover:bg-red-200 transition-all"
                    >
                      Annuler la demande
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-slate-600 font-medium">
                Demande introuvable.
              </div>
            )}
          </>
        )}

        <ModalConfirmation
          isOpen={modal.isOpen}
          onClose={() => setModal({ isOpen: false, demandeId: null })}
          onConfirm={handleConfirmCancel}
          titre="Confirmer l'annulation"
          message="Voulez-vous vraiment annuler cette demande ?"
        />
      </div>
    </div>
  );
}
