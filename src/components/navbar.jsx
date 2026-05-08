import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { metaForCountry } from "../utils/country";

function userInitials(user) {
  if (!user) return "?";
  const name = String(user.name || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase() || "?";
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const mail = String(user.email || "").trim();
  if (mail.length >= 2) return mail.slice(0, 2).toUpperCase();
  return "?";
}

/** Lien navigation partagé — actif avec filet bleu sobre. */
function ProNavLink({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "relative px-3 py-2 text-[13px] font-medium tracking-tight transition-colors rounded-md",
          isActive
            ? "text-white after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-sky-500"
            : "text-zinc-400 hover:text-zinc-100",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, isEmployee, isRH, logout } = useAuth();
  const homePath = isEmployee ? "/employee/dashboard" : "/rh/dashboard";
  const countryMeta = metaForCountry(user?.country);
  const initials = useMemo(() => userInitials(user), [user]);

  let showSeparateUserName = false;
  if (user) {
    const nm = String(user.name || "").trim();
    const em = String(user.email || "").trim();
    showSeparateUserName = nm !== "" && nm.toLowerCase() !== em.toLowerCase();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Marque */}
        {(isRH || isEmployee) && (
          <div className="flex shrink-0 items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-700/80"
              aria-hidden
            >
              <svg
                className="h-4 w-4 text-sky-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
                />
              </svg>
            </div>
            <div className="hidden min-[420px]:block leading-none">
              <span className="text-sm font-semibold text-zinc-100">Congés</span>
              {isRH && (
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  RH
                </span>
              )}
            </div>
          </div>
        )}

        <div className="hidden h-6 w-px shrink-0 bg-zinc-800 sm:block" aria-hidden />

        {/* Navigation principale */}
        <nav className="flex flex-1 flex-wrap items-center gap-0.5 min-w-0">
          {isRH && (
            <>
              <ProNavLink to="/rh/dashboard" label="Accueil" end />
              <ProNavLink to="/rh/decisions" label="Décisions RH" />
              <ProNavLink to="/rh/requests" label="Historique" />
              <ProNavLink to="/rh/calendar" label="Calendrier" />
              <ProNavLink to="/rh/configuration" label="Paramètres" />
              <ProNavLink to="/rh/jours-feries" label="Jours fériés" />
              <ProNavLink to="/rh/soldes" label="Soldes" />
            </>
          )}
          {isEmployee && (
            <>
              <ProNavLink to={homePath} label="Accueil" end />
              <ProNavLink to="/employee/calendar" label="Mon calendrier" />
              <ProNavLink to="/employee/historique" label="Mes demandes" />
            </>
          )}
        </nav>

        {/* Profil aligné dans la barre (pas de bloc encadré) */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 border-l border-zinc-800/80 pl-3 sm:pl-4">
          {user && (
            <>
              {/* Desktop : une seule ligne visuelle avec la hauteur de la navbar */}
              <div
                className={`hidden min-[520px]:flex min-w-0 ${
                  isEmployee
                    ? "max-w-[min(320px,34vw)] flex-row items-center gap-2.5"
                    : "max-w-[220px] flex-col items-start gap-0.5"
                }`}
              >
                {isEmployee && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold uppercase tracking-wide text-white"
                    aria-hidden
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex flex-col justify-center gap-0 leading-tight">
                  {showSeparateUserName && (
                    <span className="truncate text-[12px] font-medium text-zinc-100">{user.name}</span>
                  )}
                  <span className={`truncate text-[11px] ${showSeparateUserName ? "text-zinc-500" : "text-zinc-300"}`}>
                    {user.email}
                  </span>
                  {isEmployee && (
                    <span
                      className="mt-0.5 hidden truncate text-[10px] text-zinc-500 lg:block"
                      title={`${countryMeta.label} — ${user.departement || ""}`}
                    >
                      {countryMeta.code} {countryMeta.label}
                      {user.departement ? ` · ${user.departement}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Tablette / mobile : compact, toujours dans le flux de la barre */}
              <div className="flex min-[520px]:hidden items-center gap-2 min-w-0 max-w-[42vw] sm:max-w-[200px]">
                {isEmployee && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold uppercase text-white"
                    aria-hidden
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex flex-col leading-tight">
                  {showSeparateUserName && (
                    <span className="truncate text-[11px] font-medium text-zinc-100">{user.name}</span>
                  )}
                  <span className="truncate text-[10px] text-zinc-500">{user.email}</span>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm hover:border-zinc-500 hover:bg-zinc-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
