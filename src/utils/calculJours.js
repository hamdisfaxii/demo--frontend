export function calculerJoursOuvres(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return 0;

  const start = new Date(dateDebut);
  const end = new Date(dateFin);

  // Neutralise les heures pour éviter les soucis de timezone.
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;
  if (end.getTime() === start.getTime()) {
    const day = start.getDay(); // 0 dimanche, 6 samedi
    if (day === 0 || day === 6) return 0;
    return 1;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

export function formaterDate(date) {
  if (!date) return "";
  const d = new Date(date);

  // Si c'est une date invalide, on renvoie vide.
  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

