// src/components/auth/LoginPage.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePostHog } from "@/lib/posthog";
import { useI18n } from "@/lib/i18n";
import "./LoginPage.css";

export default function LoginPage() {
  const posthog = usePostHog();
  const { t } = useI18n();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (tab === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        posthog.capture("user_logged_in");
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        posthog.capture("user_registered");
        setInfo(t("auth.email_sent"));
      }
    } catch (err: any) {
      setError(err.message ?? t("auth.error_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">W</span>
          <span className="login-title">Welgo Desk</span>
          <span className="login-subtitle">{t("auth.agent_mode")}</span>
        </div>
        <div className="login-tabs">
          <button
            className={`login-tab${tab === "login" ? " active" : ""}`}
            onClick={() => { setTab("login"); setError(""); setInfo(""); }}
          >
            {t("auth.login")}
          </button>
          <button
            className={`login-tab${tab === "register" ? " active" : ""}`}
            onClick={() => { setTab("register"); setError(""); setInfo(""); }}
          >
            {t("auth.register")}
          </button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label>{t("auth.password")}</label>
            <input
              type="password"
              placeholder={tab === "register" ? t("auth.min_chars") : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          {info && <p className="login-info">{info}</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading
              ? t("auth.loading")
              : tab === "login"
              ? t("auth.login")
              : t("auth.create_account")}
          </button>
        </form>
      </div>
    </div>
  );
}
