import React, { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import Spinner from "../../components/commun/Spinner";

export default function JoursFeries() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);

  const filtered = useMemo(() => {
    return holidays.filter((h) => {
      if (!h?.dateJour) return false;
      return new Date(h.dateJour).getFullYear() === Number(year);
    });
  }, [holidays, year]);

  const loadHolidays = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/dolibarr/holidays");
      setHolidays(Array.isArray(data) ? data : []);
    } catch {
      setHolidays([]);
      setError("Impossible de charger les jours fériés.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 fade-in-up">
          <h1 className="text-4xl font-bold text-slate-900">Jours fériés</h1>
          <p className="mt-3 text-sm text-slate-600">
            Gestion des jours fériés par pays et par année.
          </p>

          <div className="mt-6">
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              + Nouveau Jour Férié
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Année :</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm font-medium text-red-700">{error}</div>
              </div>
            </div>
          )}

          {loading && filtered.length === 0 ? (
            <div className="mt-8">
              <Spinner size={3} />
            </div>
          ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              Tunisie
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-900">Libellé</th>
                  <th className="p-4 font-semibold text-slate-900">Date du jour</th>
                  <th className="p-4 font-semibold text-slate-900">Modifier</th>
                  <th className="p-4 font-semibold text-slate-900">Appliquer</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((h) => (
                    <tr key={h.id ?? `${h.libelle}-${h.dateJour}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-700">{h.libelle}</td>
                      <td className="p-4 text-slate-700">
                        {h.dateJour ? new Date(h.dateJour).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="p-4 text-slate-400">✎</td>
                      <td className="p-4 text-blue-600">✓</td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Aucun jour férié trouvé pour {year}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
