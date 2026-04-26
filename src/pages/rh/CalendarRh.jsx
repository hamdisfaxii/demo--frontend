import React, { useEffect, useMemo, useState } from "react";
import { getCalendarEvents } from "../../utils/rhApi";

const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const monthLabel = (date) =>
  new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date);

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfWeek = (date) => {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
};

const buildMonthGrid = (cursor) => {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const firstDayIndex = (monthStart.getDay() + 6) % 7; // Lundi=0 ... Dimanche=6
  const totalCells = Math.ceil((firstDayIndex + monthEnd.getDate()) / 7) * 7;
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - firstDayIndex);

  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    cells.push({
      date: day,
      iso: toIsoDate(day),
      inCurrentMonth: day.getMonth() === cursor.getMonth(),
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

export default function CalendarRh() {
  const [viewMode, setViewMode] = useState("month"); // month | week | day | list
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rangeStart = useMemo(() => {
    if (viewMode === "day") return new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate());
    if (viewMode === "week") return startOfWeek(cursorDate);
    return startOfMonth(cursorDate);
  }, [cursorDate, viewMode]);

  const rangeEnd = useMemo(() => {
    if (viewMode === "day") return new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate());
    if (viewMode === "week") return endOfWeek(cursorDate);
    return endOfMonth(cursorDate);
  }, [cursorDate, viewMode]);

  const weeks = useMemo(() => buildMonthGrid(cursorDate), [cursorDate]);
  const weekCells = useMemo(() => {
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return {
        date: d,
        iso: toIsoDate(d),
        label: weekDays[idx],
      };
    });
  }, [cursorDate]);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getCalendarEvents({
          startDate: toIsoDate(rangeStart),
          endDate: toIsoDate(rangeEnd),
        });
        setEvents(Array.isArray(data) ? data : []);
      } catch {
        setEvents([]);
        setError("Impossible de charger les événements du calendrier.");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [rangeStart, rangeEnd]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const rawStart = String(event.startDate || "");
      const rawEnd = String(event.endDate || event.startDate || "");
      if (!rawStart) return;

      const start = new Date(rawStart);
      const end = new Date(rawEnd);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const loop = new Date(start);
      const safeEnd = end < start ? start : end;
      while (loop <= safeEnd) {
        const key = toIsoDate(loop);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(event);
        loop.setDate(loop.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const goToday = () => setCursorDate(new Date());
  const goPrev = () =>
    setCursorDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month" || viewMode === "list") d.setMonth(d.getMonth() - 1);
      else if (viewMode === "week") d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  const goNext = () =>
    setCursorDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month" || viewMode === "list") d.setMonth(d.getMonth() + 1);
      else if (viewMode === "week") d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });

  const todayIso = toIsoDate(new Date());
  const dayIso = toIsoDate(cursorDate);
  const dayEvents = eventsByDate.get(dayIso) || [];
  const listEvents = useMemo(
    () =>
      [...events].sort((a, b) =>
        String(a.startDate || "").localeCompare(String(b.startDate || "")),
      ),
    [events],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-slate-700">Agenda</span>
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" disabled />
                <span>Calendrier par défaut</span>
              </label>
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" disabled />
                <span>Congés</span>
              </label>
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" disabled />
                <span>Anniversaires des contacts</span>
              </label>
            </div>
          </div>

          <div className="border-b border-slate-200 px-4 py-3 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded border px-3 py-1 text-xs ${
                    viewMode === "list"
                      ? "border-slate-400 bg-slate-100 font-semibold text-slate-700"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Vue liste
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`rounded border px-3 py-1 text-xs ${
                    viewMode === "month"
                      ? "border-slate-400 bg-slate-100 font-semibold text-slate-700"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Vue mois
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`rounded border px-3 py-1 text-xs ${
                    viewMode === "week"
                      ? "border-slate-400 bg-slate-100 font-semibold text-slate-700"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Vue semaine
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("day")}
                  className={`rounded border px-3 py-1 text-xs ${
                    viewMode === "day"
                      ? "border-slate-400 bg-slate-100 font-semibold text-slate-700"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Vue jour
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                  onClick={goToday}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                >
                  {">"}
                </button>
              </div>
              <div className="text-sm font-semibold text-slate-700 capitalize">
                {viewMode === "day"
                  ? new Intl.DateTimeFormat("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(cursorDate)
                  : viewMode === "week"
                    ? `${new Intl.DateTimeFormat("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      }).format(rangeStart)} - ${new Intl.DateTimeFormat("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(rangeEnd)}`
                    : monthLabel(cursorDate)}
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {loading ? "Chargement..." : `${events.length} événement(s) trouvé(s)`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              {viewMode === "month" && (
                <>
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 last:border-r-0"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {weeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-cols-7">
                      {week.map((cell, dayIndex) => {
                        const cellEvents = eventsByDate.get(cell.iso) || [];
                        const visible = cellEvents.slice(0, 3);
                        const hiddenCount = cellEvents.length - visible.length;
                        const isToday = cell.iso === todayIso;

                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className={`relative h-28 border-r border-b border-slate-200 p-2 last:border-r-0 ${
                              cell.inCurrentMonth ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <div
                              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs ${
                                isToday
                                  ? "bg-blue-600 text-white"
                                  : cell.inCurrentMonth
                                    ? "text-slate-700"
                                    : "text-slate-400"
                              }`}
                            >
                              {cell.date.getDate()}
                            </div>

                            <div className="mt-2 space-y-1">
                              {visible.map((event, idx) => (
                                <div
                                  key={`${cell.iso}-${idx}`}
                                  className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-700 truncate"
                                  title={event.title || event.leaveType || "Événement"}
                                >
                                  {event.title || event.leaveType || "Événement"}
                                </div>
                              ))}
                              {hiddenCount > 0 && (
                                <div className="px-1 text-[10px] text-slate-500">
                                  +{hiddenCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {viewMode === "week" && (
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {weekCells.map((cell) => {
                    const cellEvents = eventsByDate.get(cell.iso) || [];
                    const isToday = cell.iso === todayIso;
                    return (
                      <div
                        key={cell.iso}
                        className="min-h-[420px] border-r border-slate-200 bg-white p-2 last:border-r-0"
                      >
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {cell.label}
                        </div>
                        <div
                          className={`mb-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs ${
                            isToday ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {cell.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {cellEvents.length === 0 && (
                            <div className="text-[11px] text-slate-400">Aucun événement</div>
                          )}
                          {cellEvents.map((event, idx) => (
                            <div
                              key={`${cell.iso}-w-${idx}`}
                              className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-700"
                            >
                              {event.title || event.leaveType || "Événement"}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "day" && (
                <div className="border-b border-slate-200 bg-white p-4">
                  <div className="mb-4 text-sm font-semibold text-slate-700">
                    {new Intl.DateTimeFormat("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }).format(cursorDate)}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.length === 0 && (
                      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Aucun événement pour cette date.
                      </div>
                    )}
                    {dayEvents.map((event, idx) => (
                      <div
                        key={`${dayIso}-d-${idx}`}
                        className="rounded border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800"
                      >
                        {event.title || event.leaveType || "Événement"}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === "list" && (
                <div className="border-b border-slate-200 bg-white p-4">
                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-700">Date</th>
                          <th className="px-3 py-2 text-left text-slate-700">Type</th>
                          <th className="px-3 py-2 text-left text-slate-700">Titre</th>
                          <th className="px-3 py-2 text-left text-slate-700">Pays</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listEvents.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                              Aucun événement.
                            </td>
                          </tr>
                        )}
                        {listEvents.map((event, idx) => (
                          <tr key={`l-${idx}`} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{event.startDate || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{event.eventType || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {event.title || event.leaveType || "Événement"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{event.country || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          {loading && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              Chargement des événements...
            </div>
          )}
          {!loading && error && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
