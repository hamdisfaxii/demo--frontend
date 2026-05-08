import { normalizeStatus } from "./rhApi";

function csvCell(val) {
  const s = val == null ? "" : String(val);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statutLibelle(norm) {
  switch (norm) {
    case "PENDING":
      return "En attente";
    case "APPROVED":
      return "Approuvé";
    case "REJECTED":
      return "Rejeté";
    case "CANCELLED":
      return "Annulée";
    default:
      return String(norm ?? "");
  }
}

/**
 * CSV séparateur point-virgule + BOM UTF-8 : ouverture directe avec Excel (locale FR).
 */
export function downloadHistoriqueDemandesCsv(rows, filenamePrefix = "historique-demandes") {
  const sep = ";";
  const headers = [
    "Employé",
    "Email",
    "Pays",
    "Département",
    "Approuvé par",
    "Type",
    "Date début",
    "Date fin",
    "Jours",
    "Demi-journée début",
    "Demi-journée fin",
    "Statut",
    "Motif",
    "Commentaire RH",
    "Date soumission",
  ];

  const lines = [headers.join(sep)];
  for (const r of rows || []) {
    const employeNom = `${r?.employe?.prenom ?? ""} ${r?.employe?.nom ?? ""}`.trim();
    const norm = normalizeStatus(r.statut);
    const ap = r?.approuvePar ?? r?.approvedBy ?? null;
    const approverName = `${ap?.prenom ?? ""} ${ap?.nom ?? ""}`.trim() || (ap?.email ?? "");
    lines.push(
      [
        csvCell(employeNom),
        csvCell(r?.employe?.email ?? ""),
        csvCell(r?.employe?.country ?? ""),
        csvCell(r?.employe?.department ?? ""),
        csvCell(approverName),
        csvCell(r.typeConge ?? ""),
        csvCell(r.dateDebut ?? ""),
        csvCell(r.dateFin ?? ""),
        csvCell(r.nombreJoursExact ?? r.nombreJours ?? ""),
        csvCell(r.startHalfDay ?? ""),
        csvCell(r.endHalfDay ?? ""),
        csvCell(statutLibelle(norm)),
        csvCell(r.motif ?? ""),
        csvCell(r.commentaireRh ?? ""),
        csvCell(r.dateSoumission ?? ""),
      ].join(sep),
    );
  }

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  a.href = url;
  a.download = `${filenamePrefix}-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
