import React, { useState } from "react";
import { useAuth } from "../context/authcontext";
import { useNavigate } from "react-router-dom";

/** Corps JSON Spring, mock Node, etc. */
function readApiErrorPayload(err) {
  const d = err?.response?.data;
  if (d == null) return { code: null, text: null, detail: null };
  if (typeof d === "string") return { code: null, text: d, detail: null };
  const code = d.code ?? d.errorCode ?? null;
  const text =
    d.error ??
    d.message ??
    d.title ??
    (Array.isArray(d.errors) && d.errors[0]?.defaultMessage) ??
    null;
  const detail = d.detail ?? d.path ?? null;
  return { code, text, detail };
}

/**
 * Message lisible sur la page /login (2 lignes : type + explication), sans ouvrir la console.
 */
function getLoginErrorMessage(err) {
  const status = err?.response?.status;
  const { code, text, detail } = readApiErrorPayload(err);

  if (!err?.response || err?.code === "ERR_NETWORK") {
    return [
      "Impossible de joindre le serveur",
      "Vérifiez que le backend est démarré (http://localhost:8080) et que le pare-feu ne bloque pas la connexion.",
    ].join("\n");
  }

  if (err?.code === "ECONNABORTED") {
    return ["Délai d’attente dépassé", "Le serveur ne répond pas assez vite. Réessayez."].join("\n");
  }

  if (status === 400 && code === "MISSING_CREDENTIALS") {
    return ["Champs incomplets", text || "Saisissez votre email et votre mot de passe."].join("\n");
  }

  if (status === 401) {
    if (code === "USER_NOT_FOUND") {
      return [
        "Compte inconnu",
        text || "Aucun utilisateur n’est enregistré avec cet email. Vérifiez l’orthographe ou contactez le RH.",
      ].join("\n");
    }
    if (code === "INVALID_PASSWORD") {
      return [
        "Mot de passe incorrect",
        text || "Le mot de passe ne correspond pas au compte. Vérifiez les majuscules / minuscules.",
      ].join("\n");
    }
    const low = String(text || "").toLowerCase();
    if (low.includes("utilisateur") && low.includes("trouv")) {
      return [
        "Compte inconnu",
        text || "Aucun utilisateur avec cet email.",
      ].join("\n");
    }
    if (low.includes("mot de passe") || low.includes("password") || low.includes("identifiants")) {
      return ["Connexion refusée", text || "Email ou mot de passe incorrect."].join("\n");
    }
    return ["Connexion refusée (401)", text || "Identifiants refusés par le serveur."].join("\n");
  }

  if (status === 403) {
    return ["Accès refusé", text || "Vous n’avez pas la permission de vous connecter ici."].join("\n");
  }

  if (status >= 500) {
    const extra = detail ? `\n${detail}` : "";
    return [
      `Erreur serveur (${status})`,
      (text || "Une erreur technique s’est produite. Réessayez dans quelques instants.") + extra,
    ].join("\n");
  }

  if (status === 404) {
    return [
      "Service introuvable (404)",
      "L’URL de connexion n’existe pas sur ce serveur. Vérifiez la configuration du frontend (base URL API).",
    ].join("\n");
  }

  return [
    status ? `Erreur ${status}` : "Erreur",
    text || err?.message || "Une erreur est survenue. Réessayez.",
  ].join("\n");
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, getHomePath } = useAuth(); // 🔥 utilisation du context
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const responseData = await login(email.trim(), password); // 🔥 appel du context
      navigate(getHomePath(responseData?.role));
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-screen h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/login-background.png')",
        backgroundSize: "cover",
      }}
    >
      <div className="w-[500px] bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 absolute left-[200px] top-1/2 -translate-y-1/2">
        <div className="flex justify-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Connexion</h1>
        </div>

        <div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <div className="mt-0.5 shrink-0">⚠️</div>
              <div className="min-w-0 whitespace-pre-line leading-relaxed">
                {error.split("\n").map((line, i) => (
                  <span key={i} className="block">
                    {i === 0 ? (
                      <span className="font-semibold text-red-800">{line}</span>
                    ) : (
                      <span className="font-normal text-red-700 mt-1 block">{line}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                transition-all duration-300 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                transition-all duration-300 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold 
              hover:bg-blue-700 hover:shadow-lg
              active:scale-[0.98] 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300"
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>

            <div className="text-center pt-2">
              <p className="text-sm text-slate-600">
                <a
                  href="http://localhost/dolibarr/user/passwordforgotten.php"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Mot de passe oublié?
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
