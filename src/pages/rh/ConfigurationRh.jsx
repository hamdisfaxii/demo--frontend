import React, { useEffect, useMemo, useState } from "react";
import {
  createExceptionalLeave,
  getExceptionalLeaves,
  getWorkSchedules,
  saveWorkSchedules,
  updateExceptionalLeave,
} from "../../utils/rhApi";
import { useAuth } from "../../context/authcontext";
import Spinner from "../../components/commun/Spinner";
import { HR_COUNTRY_LIST } from "../../utils/country";

const COUNTRIES = HR_COUNTRY_LIST;

const SCHEDULE_TYPES = [
  { code: "NORMAL", label: "Horaire normal" },
  { code: "SUMMER", label: "Horaire été" },
  { code: "RAMADAN", label: "Horaire Ramadan" },
];

const DAYS = [
  { idx: 0, label: "Dimanche" },
  { idx: 1, label: "Lundi" },
  { idx: 2, label: "Mardi" },
  { idx: 3, label: "Mercredi" },
  { idx: 4, label: "Jeudi" },
  { idx: 5, label: "Vendredi" },
  { idx: 6, label: "Samedi" },
];

const toInputTime = (value) => {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 5) return s.slice(0, 5);
  return s;
};

const toExclusiveOptions = (activeType) => ({
  activeType,
  normalEnabled: activeType === "NORMAL",
  summerEnabled: activeType === "SUMMER",
  ramadanEnabled: activeType === "RAMADAN",
});

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
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleType, setScheduleType] = useState("NORMAL");
  const [scheduleOptions, setScheduleOptions] = useState({
    activeType: "NORMAL",
    normalEnabled: true,
    summerEnabled: true,
    ramadanEnabled: true,
  });
  const [scheduleRows, setScheduleRows] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editingTimes, setEditingTimes] = useState({
    start: "",
    end: "",
  });

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

  const loadSchedule = async (country = activeCountry, type = scheduleType) => {
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const data = await getWorkSchedules(country, type);
      const resolvedActiveType = String(data?.activeType || type).toUpperCase();
      setScheduleOptions(toExclusiveOptions(resolvedActiveType));
      const incoming = Array.isArray(data?.rows) ? data.rows : [];
      const byDay = new Map(incoming.map((r) => [r.dayOfWeek, r]));
      const fullRows = DAYS.map((d) => {
        const row = byDay.get(d.idx) || {};
        return {
          dayOfWeek: d.idx,
          firstStart: toInputTime(row.firstStart),
          firstEnd: toInputTime(row.firstEnd),
          secondStart: toInputTime(row.secondStart),
          secondEnd: toInputTime(row.secondEnd),
        };
      });
      setScheduleRows(fullRows);
    } catch {
      setScheduleRows(DAYS.map((d) => ({ dayOfWeek: d.idx, firstStart: "", firstEnd: "", secondStart: "", secondEnd: "" })));
      setScheduleError("Impossible de charger les horaires de travail.");
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule(activeCountry, scheduleType);
    setEditingCell(null);
  }, [activeCountry, scheduleType]);

  const persistSchedule = async (nextRows, nextOptions = scheduleOptions, nextType = scheduleType) => {
    setScheduleSaving(true);
    setScheduleError("");
    try {
      const payload = {
        countryCode: activeCountry,
        scheduleType: nextType,
        activeType: nextOptions.activeType,
        normalEnabled: nextOptions.normalEnabled,
        summerEnabled: nextOptions.summerEnabled,
        ramadanEnabled: nextOptions.ramadanEnabled,
        rows: (nextRows || []).map((row) => ({
          dayOfWeek: row.dayOfWeek,
          firstStart: row.firstStart || null,
          firstEnd: row.firstEnd || null,
          secondStart: row.secondStart || null,
          secondEnd: row.secondEnd || null,
        })),
      };
      const saved = await saveWorkSchedules(payload);
      const resolvedActiveType = String(saved?.activeType || nextType).toUpperCase();
      setScheduleOptions(toExclusiveOptions(resolvedActiveType));
      const incoming = Array.isArray(saved?.rows) ? saved.rows : [];
      const byDay = new Map(incoming.map((r) => [r.dayOfWeek, r]));
      setScheduleRows(
        DAYS.map((d) => {
          const row = byDay.get(d.idx) || {};
          return {
            dayOfWeek: d.idx,
            firstStart: toInputTime(row.firstStart),
            firstEnd: toInputTime(row.firstEnd),
            secondStart: toInputTime(row.secondStart),
            secondEnd: toInputTime(row.secondEnd),
          };
        }),
      );
    } catch {
      setScheduleError("Impossible de sauvegarder les horaires.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const selectSingleSchedule = async (type) => {
    const next = toExclusiveOptions(type);
    setScheduleOptions(next);
    await persistSchedule(scheduleRows, next, scheduleType);
    if (scheduleType !== type) {
      setScheduleType(type);
    }
  };

  const activateTab = (type) => {
    setScheduleType(type);
  };

  const openEditCell = (dayOfWeek, session) => {
    const row = scheduleRows.find((r) => r.dayOfWeek === dayOfWeek);
    if (!row) return;
    const isFirst = session === 1;
    setEditingCell({ dayOfWeek, session });
    setEditingTimes({
      start: isFirst ? row.firstStart : row.secondStart,
      end: isFirst ? row.firstEnd : row.secondEnd,
    });
  };

  const saveCell = async () => {
    if (!editingCell) return;
    const { dayOfWeek, session } = editingCell;
    const nextRows = scheduleRows.map((row) => {
      if (row.dayOfWeek !== dayOfWeek) return row;
      if (session === 1) {
        return { ...row, firstStart: editingTimes.start, firstEnd: editingTimes.end };
      }
      return { ...row, secondStart: editingTimes.start, secondEnd: editingTimes.end };
    });
    setScheduleRows(nextRows);
    setEditingCell(null);
    await persistSchedule(nextRows);
  };

  const handleToggleEnabled = async (row) => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateExceptionalLeave(row.id, {
        countryCode: activeCountry,
        label: row.label,
        daysPerYear: row.daysPerYear,
        enabled: !row.enabled,
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
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
      const updated = await updateExceptionalLeave(row.id, {
        countryCode: activeCountry,
        label: row.label,
        daysPerYear: Number(editingDays || 0),
        enabled: row.enabled,
      });
      setEditingId(null);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
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

          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-sky-700">Horaires de travail</h2>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Horaires :</span>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleOptions.activeType === "NORMAL"}
                    onChange={(e) => e.target.checked && selectSingleSchedule("NORMAL")}
                  />
                  <span>Normal</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleOptions.activeType === "SUMMER"}
                    onChange={(e) => e.target.checked && selectSingleSchedule("SUMMER")}
                  />
                  <span>Été</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleOptions.activeType === "RAMADAN"}
                    onChange={(e) => e.target.checked && selectSingleSchedule("RAMADAN")}
                  />
                  <span>Ramadan</span>
                </label>
              </div>
            </div>

            <div className="mt-4 border-b border-sky-300">
              <div className="flex flex-wrap gap-2">
                {SCHEDULE_TYPES.map((tab) => (
                  <button
                    key={tab.code}
                    type="button"
                    onClick={() => activateTab(tab.code)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${
                      scheduleType === tab.code
                        ? "bg-blue-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleError && (
              <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700">
                {scheduleError}
              </div>
            )}

            {scheduleLoading ? (
              <div className="mt-6">
                <Spinner size={3} />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-900" />
                      <th className="p-3 text-left font-semibold text-slate-900">1ère séance</th>
                      <th className="p-3 text-left font-semibold text-slate-900">2ème séance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => {
                      const row = scheduleRows.find((r) => r.dayOfWeek === day.idx) || {
                        firstStart: "",
                        firstEnd: "",
                        secondStart: "",
                        secondEnd: "",
                      };
                      const firstEdit = editingCell?.dayOfWeek === day.idx && editingCell?.session === 1;
                      const secondEdit = editingCell?.dayOfWeek === day.idx && editingCell?.session === 2;

                      return (
                        <tr key={day.idx} className="border-t border-slate-100">
                          <td className="p-3 text-slate-700">{day.label}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              {firstEdit ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    value={editingTimes.start}
                                    onChange={(e) => setEditingTimes((p) => ({ ...p, start: e.target.value }))}
                                    className="rounded border border-slate-300 px-2 py-1"
                                  />
                                  <span>-</span>
                                  <input
                                    type="time"
                                    value={editingTimes.end}
                                    onChange={(e) => setEditingTimes((p) => ({ ...p, end: e.target.value }))}
                                    className="rounded border border-slate-300 px-2 py-1"
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-600">
                                  {row.firstStart && row.firstEnd ? `${row.firstStart} - ${row.firstEnd}` : "-"}
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={scheduleSaving}
                                onClick={() => (firstEdit ? saveCell() : openEditCell(day.idx, 1))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                              >
                                {firstEdit ? "✓" : "✎"}
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              {secondEdit ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    value={editingTimes.start}
                                    onChange={(e) => setEditingTimes((p) => ({ ...p, start: e.target.value }))}
                                    className="rounded border border-slate-300 px-2 py-1"
                                  />
                                  <span>-</span>
                                  <input
                                    type="time"
                                    value={editingTimes.end}
                                    onChange={(e) => setEditingTimes((p) => ({ ...p, end: e.target.value }))}
                                    className="rounded border border-slate-300 px-2 py-1"
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-600">
                                  {row.secondStart && row.secondEnd ? `${row.secondStart} - ${row.secondEnd}` : "-"}
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={scheduleSaving}
                                onClick={() => (secondEdit ? saveCell() : openEditCell(day.idx, 2))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                              >
                                {secondEdit ? "✓" : "✎"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
