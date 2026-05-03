import React, { useEffect, useMemo, useState } from "react";
import {
  buildMonthGrid,
  endOfMonth,
  endOfWeek,
  longDateLabelFr,
  monthTitleFr,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  WEEKDAY_LABELS_FR_SHORT,
} from "../../utils/calendarGrid";
import {
  COUNTRY_META,
  HR_COUNTRY_LIST,
  calendarEventClassesForCountry,
  normalizeCountryIsoForHr,
} from "../../utils/country";
import { getCalendarEvents } from "../../utils/rhApi";

const weekDaysShort = WEEKDAY_LABELS_FR_SHORT;

const CARD_BADGE = {
  TN: "bg-green-500 text-white",
  FR: "bg-blue-500 text-white",
  MA: "bg-amber-400 text-slate-900",
};

const LIST_BORDER = {
  TN: "border-l-4 border-l-green-500",
  FR: "border-l-4 border-l-blue-500",
  MA: "border-l-4 border-l-amber-500",
};

function parseIsoLocal(iso) {
  const s = String(iso || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function overlapsCalendarYear(sd, ed, year) {
  const s = String(sd || "").trim();
  const eStr = ed != null && String(ed).trim() !== "" ? String(ed).trim() : s;
  if (!s) return false;
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  return s <= yEnd && eStr >= yStart;
}

function countryStatsFromEvents(yearEvents, year) {
  return HR_COUNTRY_LIST.map(({ code, label, flag }) => {
    const forCountry = yearEvents.filter((e) => normalizeCountryIsoForHr(e.country) === code);

    const holidayDates = new Set();
    const leaveRows = [];

    forCountry.forEach((e) => {
      if (!overlapsCalendarYear(e.startDate, e.endDate, year)) return;
      if (e.eventType === "HOLIDAY") holidayDates.add(String(e.startDate));
      else if (e.eventType === "APPROVED_LEAVE" || e.eventType === "MY_LEAVE_PENDING") {
        leaveRows.push(e);
      }
    });

    const uniqueEmployees = new Set(leaveRows.map((r) => r.userId).filter((id) => id != null));

    return {
      code,
      label,
      flag,
      holidays: holidayDates.size,
      employeesViaDemandes: uniqueEmployees.size,
      congesViaDemandes: leaveRows.length,
    };
  });
}

/** Synthèse annuelle pour une vue employé (fériés pays RH + vos congés). */
function employeeOverviewFromEvents(events, year, countryIso, employeeId) {
  const cc = normalizeCountryIsoForHr(countryIso) || "TN";
  const holidays = new Set();
  let valid = [];
  let pending = [];
  events.forEach((e) => {
    if (!overlapsCalendarYear(e.startDate, e.endDate, year)) return;
    if (e.eventType === "HOLIDAY" && normalizeCountryIsoForHr(e.country) === cc) {
      holidays.add(String(e.startDate));
    }
    const mine = employeeId != null && String(e.userId) === String(employeeId);
    if (mine) {
      if (e.eventType === "APPROVED_LEAVE") valid.push(e);
      else if (e.eventType === "MY_LEAVE_PENDING") pending.push(e);
    }
  });
  const meta = COUNTRY_META[cc] || COUNTRY_META.TN;
  return {
    ...meta,
    holidays: holidays.size,
    mesCongesValides: valid.length,
    demandesEnAttente: pending.length,
  };
}

export function eventDisplayLine(event, code) {
  if (event.eventType === "HOLIDAY") {
    const t = event.title || "Jour férié";
    return `${code} — ${t}`;
  }
  return event.title || `${event.employeeName || "Employé"} — ${event.leaveType || "Congé"}`;
}

/**
 * @param {{ variant?: 'rh' | 'employee', employeeId?: number, employeeCountryIso?: string, topSlot?: React.ReactNode }} props
 */
export default function GlobalWorkCalendar({
  variant = "rh",
  employeeId,
  employeeCountryIso = "TN",
  topSlot = null,
}) {
  const isEmployee = variant === "employee";

  const [viewMode, setViewMode] = useState("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [popoverIso, setPopoverIso] = useState(null);

  const calendarYear = cursorDate.getFullYear();
  const lockedCountry = useMemo(() => normalizeCountryIsoForHr(employeeCountryIso) || "TN", [employeeCountryIso]);

  const filteredEvents = useMemo(() => {
    if (isEmployee) return events;
    return events.filter((ev) => {
      if (countryFilter === "ALL") return true;
      return normalizeCountryIsoForHr(ev.country) === countryFilter;
    });
  }, [events, countryFilter, isEmployee]);

  const rhEventBarClass = (event) =>
    `rounded px-1.5 py-0.5 text-[10px] leading-tight truncate shadow-sm cursor-pointer hover:brightness-105 ${calendarEventClassesForCountry(event.country)}`;

  const listRowBorderClass = (cc) => {
    const u = normalizeCountryIsoForHr(cc) || "";
    return LIST_BORDER[u] || "border-l-4 border-l-slate-300";
  };

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
        label: weekDaysShort[idx],
      };
    });
  }, [cursorDate]);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const startDate = `${calendarYear}-01-01`;
        const endDate = `${calendarYear}-12-31`;
        const params = { startDate, endDate };
        if (isEmployee) {
          if (employeeId == null) {
            setEvents([]);
            setLoading(false);
            return;
          }
          params.employeeId = employeeId;
          params.country = lockedCountry;
        }
        const data = await getCalendarEvents(params);
        setEvents(Array.isArray(data) ? data : []);
      } catch {
        setEvents([]);
        setError("Impossible de charger les événements du calendrier.");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [calendarYear, isEmployee, employeeId, lockedCountry]);

  const statsByCountry = useMemo(
    () => countryStatsFromEvents(events, calendarYear),
    [events, calendarYear],
  );

  const employeeOverview = useMemo(
    () => employeeOverviewFromEvents(events, calendarYear, lockedCountry, employeeId),
    [events, calendarYear, lockedCountry, employeeId],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const rawStart = String(event.startDate || "");
      const rawEnd = String(event.endDate || event.startDate || "");
      if (!rawStart) return;

      const start = parseIsoLocal(rawStart);
      const end = parseIsoLocal(rawEnd);
      if (!start || !end) return;

      const loop = new Date(start);
      const safeEnd = end < start ? start : end;
      while (loop <= safeEnd) {
        const yr = loop.getFullYear();
        if (yr !== calendarYear) {
          loop.setDate(loop.getDate() + 1);
          continue;
        }
        const key = toIsoDate(loop);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(event);
        loop.setDate(loop.getDate() + 1);
      }
    });
    return map;
  }, [filteredEvents, calendarYear]);

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
  const popoverEvents = popoverIso ? eventsByDate.get(popoverIso) || [] : [];
  const popoverDate = popoverIso ? parseIsoLocal(popoverIso) : null;

  const listEvents = useMemo(
    () =>
      [...filteredEvents].sort((a, b) =>
        String(a.startDate || "").localeCompare(String(b.startDate || "")),
      ),
    [filteredEvents],
  );

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, i) => y - 3 + i);
  }, []);

  const segmentedBtn = (active, onClick, label) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
        active ? "bg-zinc-950 text-white shadow-inner" : "text-white/90 hover:bg-zinc-700/90"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </button>
  );

  const selectCls =
    "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const centerTitle =
    viewMode === "day"
      ? longDateLabelFr(cursorDate).replace(/^\w/, (c) => c.toUpperCase())
      : viewMode === "week"
        ? `${new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
          }).format(rangeStart)} – ${new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(rangeEnd)}`
        : monthTitleFr(cursorDate);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-5 sm:py-6">
        {topSlot ? <div className="mb-4">{topSlot}</div> : null}

        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEmployee ? "Mon calendrier" : "Calendrier RH global"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xl leading-snug">
              {isEmployee
                ? `Jours fériés appliqués par le RH pour ${employeeOverview.flag} ${employeeOverview.label}, et vos demandes de congés (validées ou en attente).`
                : "Jours fériés multi-pays, employés par pays et statistiques par pays."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center shrink-0">
            <select
              className={selectCls}
              value={calendarYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setCursorDate((d) => new Date(y, d.getMonth(), Math.min(d.getDate(), 28)));
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {!isEmployee && (
              <select
                className={`${selectCls} min-w-[148px] max-w-[200px]`}
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="ALL">Tous les pays</option>
                {HR_COUNTRY_LIST.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            )}
            {isEmployee && (
              <div
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                title="Pays utilisé pour les jours fériés et le filtrage RH"
              >
                <span aria-hidden>{employeeOverview.flag}</span>{" "}
                <span className="font-semibold">{lockedCountry}</span> {employeeOverview.label}
              </div>
            )}
          </div>
        </div>

        {isEmployee ? (
          <div className="grid grid-cols-1 gap-2.5 mb-5 max-w-md">
            <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`inline-flex max-w-[90%] items-center gap-1.5 truncate rounded px-2 py-0.5 text-[10px] font-semibold tracking-tight ${CARD_BADGE[lockedCountry] ?? "bg-slate-500 text-white"}`}
                >
                  <span aria-hidden className="shrink-0 text-[11px]">
                    {employeeOverview.flag}
                  </span>
                  <span className="shrink-0 font-bold">{lockedCountry}</span>
                  <span className="truncate font-medium">{employeeOverview.label}</span>
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">Année {calendarYear}</span>
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-slate-500">Jours fériés RH (votre pays)</dt>
                <dd className="text-right font-semibold text-slate-900 tabular-nums">
                  {employeeOverview.holidays}
                </dd>
                <dt className="text-slate-500">Congés validés</dt>
                <dd className="text-right font-semibold text-slate-900 tabular-nums">
                  {employeeOverview.mesCongesValides}
                </dd>
                <dt className="text-slate-500">Demandes en attente</dt>
                <dd className="text-right font-semibold text-slate-900 tabular-nums">
                  {employeeOverview.demandesEnAttente}
                </dd>
              </dl>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
            {statsByCountry.map((row) => (
              <div
                key={row.code}
                className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex max-w-[85%] items-center gap-1.5 truncate rounded px-2 py-0.5 text-[10px] font-semibold tracking-tight ${CARD_BADGE[row.code] ?? "bg-slate-500 text-white"}`}
                  >
                    <span aria-hidden className="shrink-0 text-[11px]">
                      {row.flag}
                    </span>
                    <span className="shrink-0 font-bold">{row.code}</span>
                    <span className="truncate font-medium">{row.label}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">Année {calendarYear}</span>
                </div>
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
                  <dt className="text-slate-500">Jours fériés</dt>
                  <dd className="text-right font-semibold text-slate-900 tabular-nums">{row.holidays}</dd>
                  <dt className="text-slate-500">Employés (demandes)</dt>
                  <dd className="text-right font-semibold text-slate-900 tabular-nums">{row.employeesViaDemandes}</dd>
                  <dt className="text-slate-500">Congés (demandes)</dt>
                  <dd className="text-right font-semibold text-slate-900 tabular-nums">{row.congesViaDemandes}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-3 sm:px-4 py-3 bg-white border-b border-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-2">
              <div className="flex flex-wrap items-center gap-1.5 order-2 sm:order-none">
                <div className="inline-flex rounded-md bg-zinc-800 p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="px-2 py-1.5 text-white/90 hover:bg-zinc-700 rounded text-xs transition-colors min-w-[2rem]"
                    aria-label="Période précédente"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="px-2 py-1.5 text-white/90 hover:bg-zinc-700 rounded text-xs transition-colors min-w-[2rem]"
                    aria-label="Période suivante"
                  >
                    ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-900 transition-colors"
                >
                  Aujourd&apos;hui
                </button>
              </div>

              <div className="text-sm sm:text-[15px] font-semibold text-slate-800 capitalize shrink-0 text-center order-1 sm:order-none px-1 sm:flex-1">
                {centerTitle}
              </div>

              <div className="inline-flex flex-wrap justify-center sm:justify-end rounded-md bg-zinc-800 p-0.5 shadow-sm gap-0.5 order-3 sm:order-none w-full sm:w-auto">
                {segmentedBtn(viewMode === "list", () => setViewMode("list"), "Vue liste")}
                {segmentedBtn(viewMode === "month", () => setViewMode("month"), "Vue mois")}
                {segmentedBtn(viewMode === "week", () => setViewMode("week"), "Vue semaine")}
                {segmentedBtn(viewMode === "day", () => setViewMode("day"), "Vue jour")}
              </div>
            </div>

            {!loading && !error && (
              <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                {isEmployee
                  ? `${filteredEvents.length} événement(s) dans votre calendrier pour ${calendarYear}.`
                  : `${filteredEvents.length} événement(s) filtrés — ${events.length} chargés pour ${calendarYear}.`}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="w-full">
              {viewMode === "month" && (
                <>
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90 min-w-0">
                    {weekDaysShort.map((day) => (
                      <div
                        key={day}
                        className="min-w-0 border-r border-slate-200 px-1 py-1.5 text-[10px] font-medium lowercase text-slate-500 last:border-r-0 truncate text-center sm:text-[11px] sm:px-1.5"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {weeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-cols-7 min-w-0">
                      {week.map((cell, dayIndex) => {
                        const cellEvents = eventsByDate.get(cell.iso) || [];
                        const visible = cellEvents.slice(0, 2);
                        const hiddenCount = cellEvents.length - visible.length;
                        const isToday = cell.iso === todayIso;
                        const codeFor = (e) => normalizeCountryIsoForHr(e.country);

                        return (
                          <button
                            type="button"
                            key={`${weekIndex}-${dayIndex}`}
                            onClick={() => cellEvents.length > 0 && setPopoverIso(cell.iso)}
                            className={`relative min-h-[5.5rem] sm:min-h-[6rem] min-w-0 border-r border-b border-slate-200 p-1 sm:p-1.5 text-left align-top transition-colors hover:bg-slate-50/80 last:border-r-0 ${
                              cell.inCurrentMonth ? "bg-white" : "bg-slate-100"
                            } ${cellEvents.length > 0 ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <div className="flex justify-end mb-1">
                              <span
                                className={`tabular-nums text-[11px] sm:text-xs ${
                                  isToday
                                    ? "font-bold text-blue-600"
                                    : cell.inCurrentMonth
                                      ? "text-slate-800"
                                      : "text-slate-400"
                                }`}
                              >
                                {cell.date.getDate()}
                              </span>
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                              {visible.map((event, idx) => (
                                <div
                                  key={`${cell.iso}-${idx}-${event.demandeId ?? event.title}-${idx}`}
                                  className={rhEventBarClass(event)}
                                  title={eventDisplayLine(event, codeFor(event))}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setPopoverIso(cell.iso);
                                  }}
                                  role="presentation"
                                >
                                  {eventDisplayLine(event, codeFor(event))}
                                </div>
                              ))}
                              {hiddenCount > 0 && (
                                <button
                                  type="button"
                                  className="w-full text-left px-1 py-0 text-[10px] font-semibold text-slate-600 hover:text-slate-900 truncate"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setPopoverIso(cell.iso);
                                  }}
                                >
                                  +{hiddenCount} autres
                                </button>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {viewMode === "week" && (
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 min-w-0">
                  {weekCells.map((cell) => {
                    const cellEvents = eventsByDate.get(cell.iso) || [];
                    const isTodayCell = cell.iso === todayIso;
                    return (
                      <div
                        key={cell.iso}
                        className="min-h-[220px] sm:min-h-[260px] min-w-0 border-r border-slate-200 bg-white p-1.5 last:border-r-0"
                      >
                        <div className="mb-0.5 text-[10px] font-medium lowercase text-slate-500 truncate">
                          {cell.label}
                        </div>
                        <div className="flex justify-end mb-1">
                          <span
                            className={`tabular-nums text-[11px] ${
                              isTodayCell ? "font-bold text-blue-600" : "text-slate-800"
                            }`}
                          >
                            {cell.date.getDate()}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {cellEvents.length === 0 && (
                            <div className="text-[10px] text-slate-400">Aucun événement</div>
                          )}
                          {cellEvents.map((event, idx) => {
                            const c = normalizeCountryIsoForHr(event.country);
                            return (
                              <div key={`${cell.iso}-w-${idx}`} className={rhEventBarClass(event)}>
                                {eventDisplayLine(event, c)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "day" && (
                <div className="border-b border-slate-200 bg-white p-3">
                  <div className="mb-3 text-xs font-semibold text-slate-700">
                    {new Intl.DateTimeFormat("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }).format(cursorDate)}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.length === 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Aucun événement pour cette date.
                      </div>
                    )}
                    {dayEvents.map((event, idx) => (
                      <div
                        key={`${dayIso}-d-${idx}`}
                        className={`rounded-md px-2.5 py-1.5 text-xs ${calendarEventClassesForCountry(event.country)}`}
                      >
                        {eventDisplayLine(event, normalizeCountryIsoForHr(event.country))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === "list" && (
                <div className="border-b border-slate-200 bg-white p-3">
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="min-w-full text-[11px] sm:text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Date</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Type</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Titre</th>
                          {isEmployee ? null : (
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Pays</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {listEvents.length === 0 && (
                          <tr>
                            <td colSpan={isEmployee ? 3 : 4} className="px-2 py-3 text-center text-slate-500">
                              Aucun événement.
                            </td>
                          </tr>
                        )}
                        {listEvents.map((event, idx) => (
                          <tr
                            key={`l-${idx}`}
                            className={`border-t border-slate-100 pl-0 ${listRowBorderClass(event.country)}`}
                          >
                            <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">
                              {event.startDate || "-"}
                            </td>
                            <td className="px-2 py-1.5 text-slate-700">{event.eventType || "-"}</td>
                            <td className="px-2 py-1.5 text-slate-700 max-w-[200px] truncate sm:max-w-xs">
                              {eventDisplayLine(event, normalizeCountryIsoForHr(event.country))}
                            </td>
                            {!isEmployee ? (
                              <td className="px-2 py-1.5 text-slate-700">{event.country || "-"}</td>
                            ) : null}
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
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>
      </div>

      {popoverIso && popoverDate && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end sm:pt-[10vh] sm:pr-6 p-4 sm:p-6 bg-black/25 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-pop-title"
          onClick={() => setPopoverIso(null)}
        >
          <div
            className="relative w-full max-w-[20rem] rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 id="cal-pop-title" className="text-sm font-semibold text-slate-900 capitalize">
                {popoverDate ? longDateLabelFr(popoverDate) : ""}
              </h2>
              <button
                type="button"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fermer"
                onClick={() => setPopoverIso(null)}
              >
                ×
              </button>
            </div>
            <div className="max-h-[min(42vh,20rem)] space-y-1.5 overflow-y-auto pr-0.5">
              {popoverEvents.length === 0 ? (
                <p className="text-xs text-slate-500">Aucun événement pour ce jour.</p>
              ) : (
                popoverEvents.map((event, idx) => (
                  <div
                    key={`pop-${popoverIso}-${idx}-${event.demandeId}-${event.title}`}
                    className={`rounded-md px-2 py-1.5 text-[11px] leading-snug break-words ${calendarEventClassesForCountry(event.country)}`}
                  >
                    {eventDisplayLine(event, normalizeCountryIsoForHr(event.country))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
