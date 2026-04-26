import React, { useState } from "react";
import { useAuth } from "../context/authcontext";
import { useNavigate } from "react-router-dom";

const getLoginErrorMessage = (err) => {
  if (err?.response?.status === 401) {
    return (
      err.response?.data?.error ||
      "Email ou mot de passe incorrect. Verifiez vos identifiants."
    );
  }

  if (err?.response?.status >= 500) {
    return "Le serveur a rencontre une erreur. Veuillez reessayer dans quelques instants.";
  }

  // Cas: backend eteint / port incorrect / CORS reseau (pas de reponse HTTP).
  if (!err?.response || err?.code === "ERR_NETWORK") {
    return "Connexion impossible au serveur API (http://localhost:8080). Verifiez que le backend est demarre.";
  }

  if (err?.code === "ECONNABORTED") {
    return "Le serveur met trop de temps a repondre. Veuillez reessayer.";
  }

  return (
    err?.response?.data?.error ||
    err?.message ||
    "Une erreur est survenue. Veuillez reessayer."
  );
};

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
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm font-medium flex items-start gap-2">
              <div className="mt-0.5">⚠️</div>
              <div>{error}</div>
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
