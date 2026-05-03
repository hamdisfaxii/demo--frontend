/**
 * Pays RH métier + affichage. Outre-mer FR (ISO2) → FR pour quotas / COUNTRY_META.
 */

const FR_OVERSEAS_ISO2 = new Set([
  "GP",
  "MQ",
  "GF",
  "RE",
  "YT",
  "PM",
  "BL",
  "MF",
  "WF",
  "PF",
  "NC",
  "TF",
]);

export const SUPPORTED_HR_COUNTRIES = ["TN", "FR", "MA"];

/** Méta utilisée dans l’UI (onglets RH, badges, etc.) */
export const COUNTRY_META = {
  TN: { code: "TN", label: "Tunisie", flag: "🇹🇳" },
  FR: { code: "FR", label: "France", flag: "🇫🇷" },
  MA: { code: "MA", label: "Maroc", flag: "🇲🇦" },
};

/** Liste tabs RH (Congés / feriés) — même métadonnées partout */
export const HR_COUNTRY_LIST = SUPPORTED_HR_COUNTRIES.map(
  (c) => COUNTRY_META[c],
);

/** Barres événements calendrier RH (pastilles pleines comme maquette global RH). */
export const COUNTRY_CALENDAR_EVENT_CLASSES = {
  TN: "border-transparent bg-green-500 text-white shadow-sm",
  FR: "border-transparent bg-blue-500 text-white shadow-sm",
  MA: "border-transparent bg-amber-500 text-white shadow-sm",
};

export function calendarEventClassesForCountry(isoRaw) {
  if (isoRaw == null || String(isoRaw).trim() === "") {
    return "border-transparent bg-violet-500 text-white shadow-sm";
  }
  const code = normalizeCountryIsoForHr(isoRaw) || "TN";
  return (
    COUNTRY_CALENDAR_EVENT_CLASSES[code] ?? "border-transparent bg-slate-500 text-white shadow-sm"
  );
}

/**
 * Réunion / Guadeloupe / … → France pour régles quotas & libellés.
 */
export function mapOverseasFrToMetro(iso2) {
  if (iso2 == null || iso2 === "") return "";
  const u = String(iso2).trim().toUpperCase();
  if (FR_OVERSEAS_ISO2.has(u)) return "FR";
  return u;
}

/**
 * Pays canonique parmi TN | FR | MA ; inconnu après normalisation DOM → défaut TN.
 */
export function normalizeCountryIsoForHr(raw) {
  const c = String(raw ?? "").trim().toUpperCase();
  if (!c) return "";
  const metro = mapOverseasFrToMetro(c);
  if (metro === "TN" || metro === "FR" || metro === "MA") return metro;
  if (c.includes("TUNIS") || metro.includes("TUNIS")) return "TN";
  if (c.includes("FRANCE") || metro.includes("FRANC")) return "FR";
  if (
    c.includes("MAROC") ||
    c.includes("MOROCCO") ||
    String(raw).toLowerCase().includes("maroc")
  )
    return "MA";
  return "TN";
}

export function metaForCountry(isoRaw) {
  const code = normalizeCountryIsoForHr(isoRaw) || "TN";
  return COUNTRY_META[code] ?? COUNTRY_META.TN;
}

/** Sortie courte durée : uniquement pour le profil France (métropole + outre-mer → FR). TN / MA : pas d’accès écran ni compteur. */
export function isFranceSortieCourteEligible(isoRaw) {
  return normalizeCountryIsoForHr(isoRaw) === "FR";
}

/** Libellé affiché pour un type de congé à partir du code ou du libellé API. */
export function libelleAffichageTypeConge(raw) {
  if (raw == null || raw === "") return "—";
  let s = String(raw).trim();
  if (!s) return "—";

  s = s.replace(/\bRTT\b/gi, "sortie courte durée").replace(/\s{2,}/g, " ").trim();

  const key = s.toUpperCase().replace(/[\s-]+/g, "_");
  const map = {
    PAYE: "Congé payé",
    CONGES_PAYES: "Congés payés",
    CONGE_PAYE: "Congé payé",
    COURTE_DUREE: "Sortie courte durée",
    SORTIE_COURTE: "Sortie courte durée",
    MALADIE: "Congé maladie",
    CONGE_MALADIE: "Congé maladie",
    SANS_SOLDE: "Congé sans solde",
    CONGE_SANS_SOLDE: "Congé sans solde",
    PARENTAL: "Congé parental",
    ENFANT_MALADE: "Congé enfant malade",
    EN_ATTENTE: "En attente",
    ACCEPTE: "Accepté",
    REFUSE: "Refusé",
    ANNULE: "Annulé",
  };
  if (map[key]) return map[key];

  if (key.includes("COURTE_DUREE") || key.includes("SHORT_LEAVE"))
    return "Sortie courte durée";

  if (/[a-zàâäéèêëïîôùûç]/i.test(s) && !/^[A-Z0-9_]+$/.test(s)) return s;

  const human = key.replace(/_/g, " ").toLowerCase();
  if (!human) return "—";
  return human.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}
