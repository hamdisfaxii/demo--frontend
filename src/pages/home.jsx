import React from "react";
import { useAuth } from "../context/authcontext";
import { Link } from "react-router-dom";

export default function Home() {
  const { user, isEmployee, isRH, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isEmployee && (
          <>
            <h1 className="text-4xl font-bold text-slate-900 fade-in-up">
              Espace Employé
            </h1>
            <p
              className="mt-4 text-lg text-slate-600 fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              Connecté en tant que{" "}
              <span className="font-semibold text-slate-900">{user?.name}</span>
            </p>
          </>
        )}

        {isRH && (
          <>
            <h1 className="text-4xl font-bold text-slate-900 fade-in-up">
              Espace Responsable RH
            </h1>
            <p
              className="mt-4 text-lg text-slate-600 fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              Connecté en tant que{" "}
              <span className="font-semibold text-slate-900">{user?.name}</span>
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/rh/dashboard"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Dashboard RH
              </Link>
              <Link
                to="/rh/decisions"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ouvrir le module décisions
              </Link>
              <Link
                to="/rh/jours-feries"
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Configurer les jours fériés
              </Link>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-8 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-200 fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
