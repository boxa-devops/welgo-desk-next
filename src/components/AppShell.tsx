// src/components/AppShell.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import LoginPage from "@/components/auth/LoginPage";
import OnboardingPage from "@/components/auth/OnboardingPage";
import Sidebar from "@/components/Sidebar";
import DeskView from "@/components/desk/DeskView";
import ProfilePage from "@/components/ProfilePage";
import SuperAdminPage from "@/components/SuperAdminPage";
import "@/styles/App.css";
import { usePostHog } from "@/lib/posthog";

function PendingApprovalPage({ profile, signOut }: { profile: any; signOut: () => void }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "12px",
        color: "var(--text)",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: "40px" }}>⏳</div>
      <h2 style={{ margin: 0, fontWeight: 800, fontSize: "20px" }}>
        {t("pending.title")}
      </h2>
      <p
        style={{
          margin: 0,
          color: "var(--muted)",
          fontSize: "14px",
          maxWidth: "360px",
        }}
        dangerouslySetInnerHTML={{ __html: t("pending.desc", { org: profile.org_name }) }}
      />
      <button
        onClick={signOut}
        style={{
          marginTop: "8px",
          padding: "8px 20px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        {t("pending.signout")}
      </button>
    </div>
  );
}

export default function AppShell() {
  const { session, profile, profileLoading, signOut } = useAuth();
  const { setLang } = useI18n();
  const posthog = usePostHog();

  useEffect(() => {
    if (profile?.language) setLang(profile.language);
  }, [profile?.language]);

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") return "desk";
    const hash = window.location.hash.replace("#", "");
    if (["desk", "profile", "superadmin"].includes(hash)) return hash;
    return "desk";
  });

  const handleViewChange = useCallback((view: string) => {
    window.location.hash = view === "desk" ? "" : view;
    setActiveView(view);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (["desk", "profile", "superadmin"].includes(hash)) setActiveView(hash);
      else setActiveView("desk");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (profile?.profile_id && session) {
      posthog.identify(profile.profile_id, {
        email: session.user.email,
        name: profile.full_name,
        role: profile.role,
        org_id: profile.org_id,
        plan: profile.plan,
      });
    }
  }, [profile?.profile_id]);

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("currentSessionId") ?? crypto.randomUUID();
    }
    return crypto.randomUUID();
  });

  useEffect(() => {
    sessionStorage.setItem("currentSessionId", currentSessionId);
  }, [currentSessionId]);

  const refreshConversations = useCallback(() => {
    apiFetch("/api/desk/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setConversations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (session && profile) refreshConversations();
  }, [session, profile]);

  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    handleViewChange("desk");
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
    handleViewChange("desk");
    posthog.capture("conversation_new");
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      posthog.capture("conversation_selected");
      switchSession(id);
    },
    [switchSession]
  );

  const handleRename = useCallback((id: string, title: string) => {
    posthog.capture("conversation_renamed");
    apiFetch(`/api/desk/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(console.error);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    posthog.capture("conversation_deleted");
    apiFetch(`/api/desk/conversations/${id}`, { method: "DELETE" }).catch(
      console.error
    );
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setCurrentSessionId((prev) => prev === id ? crypto.randomUUID() : prev);
  }, []);

  if (session === undefined) {
    return (
      <div className="app-loading">
        <span className="app-loading-dot" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  if (profileLoading) {
    return (
      <div className="app-loading">
        <span className="app-loading-dot" />
      </div>
    );
  }
  if (!profile) return <OnboardingPage />;
  if (profile.is_enabled === false)
    return <PendingApprovalPage profile={profile} signOut={signOut} />;

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={currentSessionId}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onRename={handleRename}
        onDelete={handleDelete}
        profile={profile}
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      <div className="main-content">
        {activeView === "superadmin" && <SuperAdminPage />}
        {activeView === "profile" && <ProfilePage />}
        <div className={`session-slot${activeView === "desk" ? " session-slot--active" : ""}`}>
          <DeskView key={currentSessionId} sessionId={currentSessionId} onTurnComplete={refreshConversations} />
        </div>
      </div>
    </div>
  );
}
