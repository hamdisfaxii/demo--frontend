import Holidays from "date-holidays";

/** Pays RH pris en charge pour exclure jours fériés (discussion PFE multi-pays). */
const PAYES_ISO2 = ["TN", "FR", "MA"];

const holidayCache = new Map();

function getHolidaySet(isoUpper) {
  if (!isoUpper || !PAYES_ISO2.includes(isoUpper)) return null;
  if (!holidayCache.has(isoUpper)) {
    try {
      holidayCache.set(isoUpper, new Holidays(isoUpper));
    } catch {
      holidayCache.set(isoUpper, null);
    }
  }
  return holidayCache.get(isoUpper);
}

function isHolidayForCountry(date, isoUpper) {
  const hd = getHolidaySet(isoUpper);
  if (!hd) return false;
  try {
    return Boolean(hd.isHoliday(date));
  } catch {
    return false;
  }
}

/**
 * Jours ouvrés dans l’intervalle : exclut samedis / dimanches
 * et, si `paysIso2Hr` ∈ {TN,FR,MA}, les jours fériés officiels (`date-holidays`).
 *
 * Sans pays : comportement historique (week-ends seulement).
 */
export function calculerJoursOuvres(dateDebut, dateFin, paysIso2Hr) {
  if (!dateDebut || !dateFin) return 0;

  const pays = String(paysIso2Hr ?? "")
    .trim()
    .toUpperCase();
  const useFeries = PAYES_ISO2.includes(pays);

  const start = new Date(dateDebut);
  const end = new Date(dateFin);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;
  if (end.getTime() === start.getTime()) {
    const day = start.getDay();
    if (day === 0 || day === 6) return 0;
    if (useFeries && isHolidayForCountry(start, pays)) return 0;
    return 1;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    const weekend = day === 0 || day === 6;
    const ferie = useFeries && isHolidayForCountry(cur, pays);
    if (!weekend && !ferie) count += 1;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

export function formaterDate(date) {
  if (!date) return "";
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
