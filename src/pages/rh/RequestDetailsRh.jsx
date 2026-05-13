import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { decideHrRequest, getHrRequestById } from "../../utils/rhApi";
import Spinner from "../../components/commun/Spinner";
import StatutBadge from "../../components/employee/StatutBadge";
import { libelleAffichageTypeConge } from "../../utils/country";

/**
 * Formate les nombres décimaux avec virgule française (ex: 7,5 pour 7.5)
 * Affiche les entiers sans décimales (ex: 7 au lieu de 7,00)
 */
const formatDecimalFr = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return "—";
  const n = Number(val);
  // Si c'est un entier, afficher sans décimales
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    return String(Math.round(n));
  }
  // Pour les décimales, afficher avec virgule française
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
};

export default function RequestDetailsRh() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(null);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRequest(await getHrRequestById(id));
    } catch {
      setError("Impossible de charger le détail de la demande.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (action) => {
    setLoading(true);
    setError("");
    try {
      await decideHrRequest(id, action, comment);
      await load();
    } catch {
      setError("Impossible de traiter la décision.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => navigate("/rh/requests")}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
        >
          Retour liste
        </button>

        <h1 className="mt-4 text-4xl font-bold text-slate-900 fade-in-up">
          Détail demande RH
        </h1>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm fade-in-up">
          {loading && !request ? (
            <Spinner size={3} />
          ) : !request ? (
            <div className="text-sm text-slate-500">Demande introuvable.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Employé
                  </div>
                  <div className="text-sm text-slate-900">
                    {request.employe?.prenom} {request.employe?.nom}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Approuvé par
                  </div>
                  <div className="text-sm text-slate-900">
                    {(() => {
                      const ap =
                        request?.approuvePar ?? request?.approvedBy ?? null;
                      const nm = `${ap?.prenom ?? ""} ${ap?.nom ?? ""}`.trim();
                      return nm || ap?.email || "-";
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Statut
                  </div>
                  <div className="text-sm text-slate-900">
                    <StatutBadge statut={request.statut} />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Type
                  </div>
                  <div className="text-sm text-slate-900">
                    {libelleAffichageTypeConge(request.typeConge)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Période
                  </div>
                  <div className="text-sm text-slate-900">
                    {request.dateDebut} → {request.dateFin}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Durée
                  </div>
                  <div className="text-sm text-slate-900">
                    {(() => {
                      const exact = request?.nombreJoursExact ?? null;
                      const raw = request?.nombreJours ?? null;
                      const n =
                        typeof exact === "number"
                          ? exact
                          : typeof raw === "number"
                            ? raw
                            : Number(raw);
                      const val = Number.isFinite(n) ? n : null;
                      const sh = String(
                        request?.startHalfDay ?? "",
                      ).toUpperCase();
                      const eh = String(
                        request?.endHalfDay ?? "",
                      ).toUpperCase();
                      const labelHalf = (h) =>
                        h === "MORNING"
                          ? "Matin"
                          : h === "AFTERNOON"
                            ? "Après-midi"
                            : "";
                      const halfInfo =
                        sh || eh
                          ? ` (${labelHalf(sh) || "Journée"} → ${labelHalf(eh) || "Journée"})`
                          : "";
                      return val == null
                        ? "-"
                        : `${formatDecimalFr(val)} jour(s)${halfInfo}`;
                    })()}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Motif
                  </div>
                  <div className="text-sm text-slate-900">
                    {request.motif || "-"}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-700">
                  Commentaire
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-2 min-h-[100px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Commentaire de validation/rejet"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => decide("APPROVE")}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-70"
                >
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => decide("REJECT")}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 hover:shadow-lg transition-all disabled:opacity-70"
                >
                  Rejeter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
