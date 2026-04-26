import React, { useState } from "react";
import { getCalendarEvents } from "../../utils/rhApi";
import Spinner from "../../components/commun/Spinner";

export default function CalendarRh() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: "",
    country: "",
    department: "",
    startDate: "",
    endDate: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await getCalendarEvents(filters));
    } catch {
      setError("Impossible de charger le calendrier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 fade-in-up">Calendrier RH</h1>
        <p className="mt-3 text-sm text-slate-600 fade-in-up" style={{ animationDelay: "0.05s" }}>
          Congés approuvés et jours fériés avec filtres RH.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm fade-in-up">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={filters.employeeId}
              onChange={(e) => setFilters((p) => ({ ...p, employeeId: e.target.value }))}
              placeholder="ID employé"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.country}
              onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
              placeholder="Pays"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.department}
              onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
              placeholder="Département"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all"
              disabled={loading}
            >
              Charger calendrier
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

        {loading && events.length === 0 ? (
          <div className="mt-8">
            <Spinner size={3} />
          </div>
        ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm fade-in-up">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-900">Type</th>
                <th className="p-4 font-semibold text-slate-900">Titre</th>
                <th className="p-4 font-semibold text-slate-900">Employé</th>
                <th className="p-4 font-semibold text-slate-900">Pays</th>
                <th className="p-4 font-semibold text-slate-900">Période</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading &&
                events.map((e, idx) => (
                  <tr key={`${e.eventType}-${e.demandeId || idx}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-700">{e.eventType}</td>
                    <td className="p-4 text-slate-700">{e.title || "-"}</td>
                    <td className="p-4 text-slate-700">{e.employeeName || "-"}</td>
                    <td className="p-4 text-slate-700">{e.country || "-"}</td>
                    <td className="p-4 text-slate-700">
                      {e.startDate} → {e.endDate}
                    </td>
                  </tr>
                ))}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Aucun événement.
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
