import React, { useEffect, useMemo, useState } from "react";
import {
  createExceptionalLeave,
  getExceptionalLeaves,
  updateExceptionalLeave,
} from "../../utils/rhApi";
import { useAuth } from "../../context/authcontext";
import Spinner from "../../components/commun/Spinner";

const COUNTRIES = [
  { code: "TN", label: "Tunisie", flag: "🇹🇳" },
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "MA", label: "Maroc", flag: "🇲🇦" },
];

export default function ConfigurationRh() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeCountry, setActiveCountry] = useState("TN");
  const [rows, setRows] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDays, setNewDays] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editingDays, setEditingDays] = useState(0);

  const activeCountryInfo = useMemo(
    () => COUNTRIES.find((c) => c.code === activeCountry) || COUNTRIES[0],
    [activeCountry],
  );

  const load = async (countryCode = activeCountry) => {
    setLoading(true);
    setError("");
    try {
      setRows(await getExceptionalLeaves(countryCode));
    } catch {
      setRows([]);
      setError("Impossible de charger les congés exceptionnels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeCountry);
    setEditingId(null);
    setShowAddForm(false);
  }, [activeCountry]);

  useEffect(() => {
    const userCountry = String(user?.country ?? "")
      .trim()
      .toUpperCase();
    if (userCountry && COUNTRIES.some((c) => c.code === userCountry) && userCountry !== activeCountry) {
      setActiveCountry(userCountry);
    }
  }, [user?.country]);

  const handleToggleEnabled = async (row) => {
    setSaving(true);
    setError("");
    try {
      await updateExceptionalLeave(row.id, {
        countryCode: activeCountry,
        label: row.label,
        daysPerYear: row.daysPerYear,
        enabled: !row.enabled,
      });
      await load(activeCountry);
    } catch {
      setError("Impossible de mettre à jour l'état du congé.");
    } finally {
      setSaving(false);
    }
  };

  const saveEditedDays = async (row) => {
    setSaving(true);
    setError("");
    try {
      await updateExceptionalLeave(row.id, {
        countryCode: activeCountry,
        label: row.label,
        daysPerYear: Number(editingDays || 0),
        enabled: row.enabled,
      });
      setEditingId(null);
      await load(activeCountry);
    } catch {
      setError("Impossible de sauvegarder le nombre de jours.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      setError("Veuillez saisir un libellé.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createExceptionalLeave({
        countryCode: activeCountry,
        label: newLabel.trim(),
        daysPerYear: Number(newDays || 0),
        enabled: true,
      });
      setNewLabel("");
      setNewDays(0);
      setShowAddForm(false);
      await load(activeCountry);
    } catch {
      setError("Impossible d'ajouter le congé exceptionnel.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 fade-in-up">
          <h1 className="text-4xl font-bold text-sky-600">Congés exceptionnels</h1>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-all shadow-sm"
            >
              + Nouveau Congé Exceptionnel
            </button>
          </div>

          {showAddForm && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Libellé (ex: Mariage)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min={0}
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  placeholder="Nbr jrs/an"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all disabled:opacity-60"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-0">
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

          <div className="mt-5 text-sm font-semibold text-slate-700">
            {activeCountryInfo.flag} {activeCountryInfo.label}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm font-medium text-red-700">{error}</div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-8">
              <Spinner size={3} />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-semibold text-slate-900">Libellé</th>
                    <th className="p-3 font-semibold text-slate-900">Nbr jrs/an</th>
                    <th className="p-3 font-semibold text-slate-900">Modifier</th>
                    <th className="p-3 font-semibold text-slate-900">Appliquer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-700">{row.label}</td>
                      <td className="p-3 text-slate-700">
                        {editingId === row.id ? (
                          <input
                            type="number"
                            min={0}
                            value={editingDays}
                            onChange={(e) => setEditingDays(e.target.value)}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          row.daysPerYear
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === row.id ? (
                          <button
                            type="button"
                            onClick={() => saveEditedDays(row)}
                            disabled={saving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            title="Sauvegarder"
                          >
                            ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setEditingDays(row.daysPerYear);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                            title="Modifier"
                          >
                            ✎
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={Boolean(row.enabled)}
                          onChange={() => handleToggleEnabled(row)}
                          disabled={saving}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        Aucun congé exceptionnel configuré.
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
