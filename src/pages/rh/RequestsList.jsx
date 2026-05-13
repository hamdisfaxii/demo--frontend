import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getHrRequests } from "../../utils/rhApi";
import { downloadHistoriqueDemandesCsv } from "../../utils/exportHistoriqueRhCsv";
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

export default function RequestsList() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: "ALL",
    employee: "",
    country: "",
    department: "",
    startDate: "",
    endDate: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHrRequests(filters);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Impossible de charger l'historique des demandes.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial seulement
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 fade-in-up">
          Historique des demandes
        </h1>
        <p
          className="mt-3 text-sm text-slate-600 fade-in-up max-w-3xl leading-relaxed"
          style={{ animationDelay: "0.05s" }}
        >
          Toutes les demandes (en attente, approuvées, rejetées). Filtrez par
          statut ou période, puis exportez au format tableur CSV pour Excel
          (séparateur ; , encodage UTF-8 avec BOM).
        </p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm fade-in-up">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Rejeté</option>
            </select>
            <input
              value={filters.employee}
              onChange={(e) =>
                setFilters((p) => ({ ...p, employee: e.target.value }))
              }
              placeholder="Employé"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.country}
              onChange={(e) =>
                setFilters((p) => ({ ...p, country: e.target.value }))
              }
              placeholder="Pays"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.department}
              onChange={(e) =>
                setFilters((p) => ({ ...p, department: e.target.value }))
              }
              placeholder="Département"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, startDate: e.target.value }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, endDate: e.target.value }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-60"
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              disabled={loading || rows.length === 0}
              onClick={() => downloadHistoriqueDemandesCsv(rows)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Exporter (Excel CSV)
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="mt-8">
            <Spinner size={3} />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm fade-in-up">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-900">Employé</th>
                  <th className="p-4 font-semibold text-slate-900">Type</th>
                  <th className="p-4 font-semibold text-slate-900">Période</th>
                  <th className="p-4 font-semibold text-slate-900">Durée</th>
                  <th className="p-4 font-semibold text-slate-900">Statut</th>
                  <th className="p-4 font-semibold text-slate-900">Détails</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 text-slate-700">
                        {r.employe?.prenom} {r.employe?.nom}
                      </td>
                      <td className="p-4 text-slate-700">
                        {libelleAffichageTypeConge(r.typeConge)}
                      </td>
                      <td className="p-4 text-slate-700">
                        {r.dateDebut} → {r.dateFin}
                      </td>
                      <td className="p-4 text-slate-700">
                        {(() => {
                          const exact = r?.nombreJoursExact ?? null;
                          const raw = r?.nombreJours ?? null;
                          const n =
                            typeof exact === "number"
                              ? exact
                              : typeof raw === "number"
                                ? raw
                                : Number(raw);
                          const val = Number.isFinite(n) ? n : null;
                          const sh = String(
                            r?.startHalfDay ?? "",
                          ).toUpperCase();
                          const eh = String(r?.endHalfDay ?? "").toUpperCase();
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
                            : `${formatDecimalFr(val)} j${halfInfo}`;
                        })()}
                      </td>
                      <td className="p-4">
                        <StatutBadge statut={r.statut} />
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/rh/requests/${r.id}`}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all"
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Aucun résultat pour ces critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
