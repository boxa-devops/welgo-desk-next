// src/components/auth/OnboardingPage.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { usePostHog } from "@/lib/posthog";
import { useI18n } from "@/lib/i18n";
import "./OnboardingPage.css";

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l3 3" />
  </svg>
);

export default function OnboardingPage() {
  const posthog = usePostHog();
  const { t } = useI18n();
  const { token, setProfile, signOut } = useAuth();
  const [step, setStep] = useState("choose");
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register-org", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ org_name: orgName.trim(), full_name: fullName.trim() }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.detail ?? `Error ${r.status}`);
      }
      const data = await r.json();
      posthog.capture("org_created", { org_name: orgName.trim() });
      setProfile({ ...data, full_name: fullName.trim() });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invite_code: inviteCode.trim(), full_name: fullName.trim() }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.detail ?? `Error ${r.status}`);
      }
      const data = await r.json();
      posthog.capture("org_joined");
      setProfile({ ...data, full_name: fullName.trim() });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard-bg">
      <div className="onboard-card">
        <div className="onboard-header">
          <span className="onboard-logo">W</span>
          <h1 className="onboard-title">{t("onboard.welcome")}</h1>
          <p className="onboard-desc">
            {step === "choose"
              ? t("onboard.choose")
              : step === "create-org"
              ? t("onboard.create_desc")
              : t("onboard.join_desc")}
          </p>
        </div>
        {step === "choose" && (
          <div className="onboard-choices">
            <button className="onboard-choice" onClick={() => setStep("create-org")}>
              <span className="onboard-choice-icon onboard-choice-icon--brand"><BuildingIcon /></span>
              <div className="onboard-choice-text">
                <strong>{t("onboard.create_org")}</strong>
                <span>{t("onboard.create_org_hint")}</span>
              </div>
              <span className="onboard-choice-arrow">&rarr;</span>
            </button>
            <button className="onboard-choice" onClick={() => setStep("join")}>
              <span className="onboard-choice-icon onboard-choice-icon--accent"><KeyIcon /></span>
              <div className="onboard-choice-text">
                <strong>{t("onboard.join_code")}</strong>
                <span>{t("onboard.join_code_hint")}</span>
              </div>
              <span className="onboard-choice-arrow">&rarr;</span>
            </button>
          </div>
        )}
        {step === "create-org" && (
          <form className="onboard-form" onSubmit={handleCreateOrg}>
            <div className="onboard-field">
              <label>{t("onboard.agency_name")}</label>
              <input type="text" placeholder="Sunny Tour" value={orgName} onChange={(e) => setOrgName(e.target.value)} required autoFocus />
            </div>
            <div className="onboard-field">
              <label>{t("onboard.your_name")}</label>
              <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            {error && <p className="onboard-error">{error}</p>}
            <div className="onboard-actions">
              <button type="button" className="onboard-back" onClick={() => { setStep("choose"); setError(""); }}>{t("onboard.back")}</button>
              <button type="submit" className="onboard-submit" disabled={loading}>
                {loading ? t("onboard.creating") : t("onboard.create_btn")}
              </button>
            </div>
          </form>
        )}
        {step === "join" && (
          <form className="onboard-form" onSubmit={handleJoin}>
            <div className="onboard-field">
              <label>{t("onboard.your_name")}</label>
              <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
            </div>
            <div className="onboard-field">
              <label>{t("onboard.invite_code")}</label>
              <input type="text" placeholder="XXXX-XXXX" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required style={{ letterSpacing: "2px", fontFamily: "monospace", fontSize: "16px" }} />
            </div>
            {error && <p className="onboard-error">{error}</p>}
            <div className="onboard-actions">
              <button type="button" className="onboard-back" onClick={() => { setStep("choose"); setError(""); }}>{t("onboard.back")}</button>
              <button type="submit" className="onboard-submit" disabled={loading}>
                {loading ? t("onboard.joining") : t("onboard.join_btn")}
              </button>
            </div>
          </form>
        )}
        <button className="onboard-signout" onClick={signOut}>{t("auth.signout")}</button>
      </div>
    </div>
  );
}
