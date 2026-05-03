/** Libellés alignés avec le calendrier RH (semaine commence lundi). */
export const WEEKDAY_LABELS_FR_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

/** Libellés courts type calendrier RH (lun., mar., …). */
export const WEEKDAY_LABELS_FR_SHORT = [
  "lun.",
  "mar.",
  "mer.",
  "jeu.",
  "ven.",
  "sam.",
  "dim.",
];

export const monthLabelFr = (date) =>
  new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date);

/** « mai 2026 » (mois long + année). */
export const monthTitleFr = (date) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date).toLowerCase();

export const longDateLabelFr = (date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);

export const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const startOfWeek = (date) => {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
};

export const buildMonthGrid = (cursor) => {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const firstDayIndex = (monthStart.getDay() + 6) % 7;
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
