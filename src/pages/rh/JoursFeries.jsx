import React, { useEffect, useMemo, useState } from "react";
import {
  applyPublicHoliday,
  createPublicHoliday,
  deletePublicHoliday,
  getPublicHolidays,
} from "../../utils/rhApi";
import Spinner from "../../components/commun/Spinner";

const COUNTRIES = [
  { code: "TN", label: "Tunisie", flag: "🇹🇳" },
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "MA", label: "Maroc", flag: "🇲🇦" },
];

export default function JoursFeries() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeCountry, setActiveCountry] = useState("TN");
  const [holidays, setHolidays] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHolidayLabel, setNewHolidayLabel] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const activeCountryInfo = useMemo(
    () => COUNTRIES.find((c) => c.code === activeCountry) || COUNTRIES[0],
    [activeCountry],
  );

  const loadHolidays = async (countryCode = activeCountry, selectedYear = year) => {
    setLoading(true);
    setError("");
    try {
      setHolidays(await getPublicHolidays(countryCode, selectedYear));
    } catch {
      setHolidays([]);
      setError("Impossible de charger les jours fériés.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays(activeCountry, year);
  }, [activeCountry, year]);

  const handleCreateHoliday = async () => {
    if (!newHolidayLabel.trim() || !newHolidayDate) {
      setError("Veuillez saisir le libellé et la date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPublicHoliday({
        countryCode: activeCountry,
        libelle: newHolidayLabel.trim(),
        dateJour: newHolidayDate,
      });
      setShowAddForm(false);
      setNewHolidayLabel("");
      setNewHolidayDate("");
      await loadHolidays(activeCountry, year);
    } catch {
      setError("Ajout du jour férié impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (row) => {
    setSaving(true);
    setError("");
    try {
      await applyPublicHoliday(row.id, !row.active);
      await loadHolidays(activeCountry, year);
    } catch {
      setError("Impossible de changer l'état du jour férié.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    setSaving(true);
    setError("");
    try {
      await deletePublicHoliday(row.id);
      await loadHolidays(activeCountry, year);
    } catch {
      setError("Impossible de supprimer ce jour férié.");
    } finally {
      setSaving(false);
    }
  };

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
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setError("");
                if (!newHolidayDate) {
                  setNewHolidayDate(`${year}-01-01`);
                }
              }}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              + Nouveau Jour Férié
            </button>
          </div>

          {showAddForm && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  value={newHolidayLabel}
                  onChange={(e) => setNewHolidayLabel(e.target.value)}
                  placeholder="Libellé (ex: Aïd El Fitr)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateHoliday}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all disabled:opacity-60"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Année :</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[year - 1, year, year + 1, year + 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-0">
            {COUNTRIES.map((country) => {
              const active = country.code === activeCountry;
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => setActiveCountry(country.code)}
                  className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span className="mr-2">{country.flag}</span>
                  {country.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm font-medium text-red-700">{error}</div>
              </div>
            </div>
          )}

          {loading && holidays.length === 0 ? (
            <div className="mt-8">
              <Spinner size={3} />
            </div>
          ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              {activeCountryInfo.flag} {activeCountryInfo.label}
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
                {(loading || saving) && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                )}
                {!loading &&
                  !saving &&
                  holidays.map((h) => (
                    <tr key={h.id ?? `${h.libelle}-${h.dateJour}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-700">{h.libelle}</td>
                      <td className="p-4 text-slate-700">
                        {h.dateJour ? new Date(h.dateJour).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(h)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </td>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={Boolean(h.active)}
                          onChange={() => handleApply(h)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                {!loading && !saving && holidays.length === 0 && (
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
