import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiJson } from "../apiClient";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiJson<{
        token: string;
        user: { id: string; username: string; role: string };
      }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Save to sessionStorage
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Navigate to dashboard based on role
      if (data.user.role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/member-dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#121212] relative overflow-hidden">
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Sign in to continue to Task Manager
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/50 border border-red-500/50 text-white text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-white ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-all duration-300"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-white ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-all duration-300"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[#333333] bg-[#121212] text-white focus:ring-white focus:ring-offset-[#121212]"
              />
              <span className="text-gray-400 group-hover:text-white transition-colors">
                Remember me
              </span>
            </label>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-4 bg-white text-black font-semibold py-3 px-4 rounded-xl transition-all duration-300 ${isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-200"}`}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-white hover:underline font-medium transition-colors"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
