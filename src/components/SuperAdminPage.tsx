// src/components/SuperAdminPage.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import "./SuperAdminPage.css";

const PLANS = [
  { key: "solo", label: "SOLO", price: "$39/мес", credits: 300, seats: 1 },
  { key: "team", label: "TEAM", price: "$99/мес", credits: 1500, seats: 5 },
  {
    key: "enterprise",
    label: "ENTERPRISE",
    price: "$249/мес",
    credits: 10000,
    seats: 15,
  },
];

interface Org {
  org_id: string;
  org_name: string;
  admin_name?: string;
  is_enabled: boolean;
  plan: string;
  credits_used: number;
  credits_limit: number;
  seats_used: number;
  seats_limit: number;
  created_at: string;
}

interface PlanSelectProps {
  orgId: string;
  current: string;
  onUpdated: (orgId: string, patch: Partial<Org>) => void;
}

function PlanSelect({ orgId, current, onUpdated }: PlanSelectProps) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plan = e.target.value;
    setValue(plan);
    setSaving(true);
    try {
      const r = await apiFetch(`/api/superadmin/orgs/${orgId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (r.ok) onUpdated(orgId, { plan, ...(await r.json()) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className={`sa-select${saving ? " sa-select--saving" : ""}`}
      value={value}
      onChange={handleChange}
      disabled={saving}
    >
      {PLANS.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label} — {p.price}
        </option>
      ))}
    </select>
  );
}

interface EnableToggleProps {
  orgId: string;
  enabled: boolean;
  onUpdated: (orgId: string, patch: Partial<Org>) => void;
}

function EnableToggle({ orgId, enabled, onUpdated }: EnableToggleProps) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/superadmin/orgs/${orgId}/enable`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !enabled }),
      });
      if (r.ok) onUpdated(orgId, { is_enabled: !enabled });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`sa-toggle${enabled ? " sa-toggle--on" : " sa-toggle--off"}`}
      onClick={toggle}
      disabled={loading}
      title={enabled ? "Отключить" : "Включить"}
    >
      {loading ? "…" : enabled ? "Активен" : "Ожидает"}
    </button>
  );
}

type SortKey = "created_desc" | "name_asc" | "plan_group";

const PLAN_ORDER: Record<string, number> = {
  solo: 0,
  team: 1,
  enterprise: 2,
};

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  useEffect(() => {
    apiFetch("/api/superadmin/orgs")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setOrgs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdated = (orgId: string, patch: Partial<Org>) => {
    setOrgs((prev) =>
      prev.map((o) => (o.org_id === orgId ? { ...o, ...patch } : o))
    );
  };

  if (forbidden) {
    return (
      <div className="sa-root">
        <div className="sa-forbidden">
          <span className="sa-forbidden-icon">🔒</span>
          <p>Доступ запрещён</p>
        </div>
      </div>
    );
  }

  const pending = orgs.filter((o) => !o.is_enabled);
  const active = orgs.filter((o) => o.is_enabled);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? orgs.filter((o) => o.org_name.toLowerCase().includes(normalizedQuery))
    : orgs;

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "name_asc") {
      return a.org_name.localeCompare(b.org_name, "ru");
    }
    if (sortKey === "plan_group") {
      const pa = PLAN_ORDER[a.plan] ?? 99;
      const pb = PLAN_ORDER[b.plan] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.org_name.localeCompare(b.org_name, "ru");
    }
    // created_desc
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return (
    <div className="sa-root">
      <div className="sa-container">
        <div className="sa-header">
          <h1 className="sa-title">Агентства</h1>
          <p className="sa-sub">
            {orgs.length} зарег. · {pending.length} ожидает · {active.length}{" "}
            активных
          </p>
        </div>

        <div className="sa-controls">
          <input
            type="search"
            className="sa-search"
            placeholder="Поиск по названию"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск по названию"
          />
          <select
            className="sa-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Сортировка"
          >
            <option value="created_desc">По дате создания</option>
            <option value="name_asc">По названию</option>
            <option value="plan_group">По плану</option>
          </select>
        </div>

        {loading ? (
          <div className="sa-loading">Загрузка…</div>
        ) : orgs.length === 0 ? (
          <div className="sa-empty">Нет зарегистрированных агентств</div>
        ) : sorted.length === 0 ? (
          <div className="sa-empty">Ничего не найдено</div>
        ) : (
          <div className="sa-card sa-list">
            {sorted.map((org) => (
              <div
                key={org.org_id}
                className={`sa-entry${!org.is_enabled ? " sa-entry--pending" : ""}`}
              >
                <div className="sa-entry-left">
                  <span className="sa-entry-name">{org.org_name}</span>
                  {org.admin_name && (
                    <span className="sa-entry-meta">{org.admin_name}</span>
                  )}
                  <span className="sa-entry-meta">
                    {org.credits_used} / {org.credits_limit} поисков ·{" "}
                    {org.seats_used} / {org.seats_limit} мест ·{" "}
                    {new Date(org.created_at).toLocaleDateString("ru")}
                  </span>
                </div>
                <div className="sa-entry-right">
                  <PlanSelect
                    orgId={org.org_id}
                    current={org.plan}
                    onUpdated={handleUpdated}
                  />
                  <EnableToggle
                    orgId={org.org_id}
                    enabled={org.is_enabled}
                    onUpdated={handleUpdated}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
