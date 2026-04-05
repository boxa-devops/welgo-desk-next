// src/components/desk/DeskView.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DeskHotelCard from "./DeskHotelCard";
import DeskAnalysisPanel, { splitAnalysis } from "./DeskAnalysisPanel";
import DeskQuoteBox from "./DeskQuoteBox";
import DeskAllHotelsModal from "./DeskAllHotelsModal";
import TourPromptBuilder from "./TourPromptBuilder";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import "./DeskView.css";
import { usePostHog } from "@/lib/posthog";

function getDeskChips(t) {
  return [t("desk.chip1"), t("desk.chip2"), t("desk.chip3"), t("desk.chip4")];
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const EMPTY_FILTER = { priceMin: null, priceMax: null, starsMin: null, mealPlan: null, operators: [] };
const PROFILE_EMOJI = { family_beach: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", couple_romantic: "\u{1F491}", solo_adventure: "\u{1F9F3}", business_quick: "\u{1F4BC}", luxury_relaxation: "\u2728", budget_getaway: "\u{1F4B0}" };

function ThoughtBubble({ thought }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  if (!thought) return null;
  const profileKey = `thought.${thought.travel_profile}`;
  const profile = { label: t(profileKey) !== profileKey ? t(profileKey) : thought.travel_profile, emoji: PROFILE_EMOJI[thought.travel_profile] ?? "\u{1F914}" };
  const confidencePct = Math.round(thought.confidence * 100);
  const confidenceCls = thought.confidence >= 0.7 ? "high" : thought.confidence >= 0.5 ? "mid" : "low";
  return (
    <div className="desk-thought-bubble">
      <button className="desk-thought-header" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className="desk-thought-icon" aria-hidden="true">{"\u{1F4AD}"}</span>
        <span className="desk-thought-summary">{thought.intent_summary}</span>
        <span className={`desk-thought-confidence desk-thought-confidence--${confidenceCls}`}>{confidencePct}%</span>
        <span className={`desk-thought-chevron${expanded ? " open" : ""}`}>{"\u25BE"}</span>
      </button>
      {expanded && (
        <div className="desk-thought-details">
          <div className="desk-thought-row">
            <span className="desk-thought-label">{"\u041F\u0440\u043E\u0444\u0438\u043B\u044C"}</span>
            <span className="desk-thought-value">{profile.emoji} {profile.label}</span>
          </div>
          {thought.search_hints && (
            <div className="desk-thought-row">
              <span className="desk-thought-label">{"\u0424\u043E\u043A\u0443\u0441"}</span>
              <span className="desk-thought-value desk-thought-hints">{thought.search_hints}</span>
            </div>
          )}
          {thought.missing_info?.length > 0 && (
            <div className="desk-thought-row">
              <span className="desk-thought-label">{"\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442"}</span>
              <span className="desk-thought-value">{thought.missing_info.join(", ")}</span>
            </div>
          )}
          {thought.tool_plan?.length > 0 && (
            <div className="desk-thought-row">
              <span className="desk-thought-label">{"\u041F\u043B\u0430\u043D"}</span>
              <span className="desk-thought-value desk-thought-plan">
                {thought.tool_plan.map((step, i) => (
                  <span key={i} className="desk-thought-step">{i > 0 && <span className="desk-thought-arrow">{"\u2192"}</span>}{step}</span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getClarifyLabels(t) {
  return { countries: t("clarify.countries"), nights: t("clarify.nights"), guests: t("clarify.guests"), q1: t("clarify.q1"), q2: t("clarify.q2"), q3: t("clarify.q3") };
}

function ClarifyBubble({ message, onSearch }) {
  const { clarify } = message;
  const posthog = usePostHog();
  const { t } = useI18n();
  const CLARIFY_LABELS = getClarifyLabels(t);
  const [selections, setSelections] = useState({});
  if (!clarify) return null;
  const toggle = (key, chip) => { setSelections((prev) => ({ ...prev, [key]: prev[key] === chip ? null : chip })); };
  const countryMissing = clarify.missing?.includes("country");
  const canSearch = !countryMissing || !!selections["countries"];
  const handleSearch = () => {
    if (!canSearch) return;
    const chips = Object.values(selections).filter(Boolean);
    const combined = message.userText ? `${message.userText} ${chips.join(" ")}` : chips.join(" ");
    posthog.capture("clarification_provided", { selection_count: Object.values(selections).filter(Boolean).length });
    onSearch(combined);
  };
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar" aria-label="Welgo Desk AI">D</div>
      <div className="desk-clarify-bubble">
        <p className="desk-clarify-question">{clarify.question}</p>
        {Object.entries(clarify.suggestions).map(([key, chips]: [string, any]) => (
          <div key={key} className="desk-clarify-group">
            <span className="desk-clarify-group-label">{CLARIFY_LABELS[key] ?? key}</span>
            <div className="desk-clarify-chips">
              {chips.map((chip) => (
                <button key={chip} className={`desk-clarify-chip${selections[key] === chip ? " selected" : ""}`} onClick={() => toggle(key, chip)}>{chip}</button>
              ))}
            </div>
          </div>
        ))}
        <button className="desk-clarify-search-btn" onClick={handleSearch} disabled={!canSearch}>{"\u041D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A \u2192"}</button>
        <p className="desk-clarify-hint">{"\u0418\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u0438\u0435 \u0432 \u043F\u043E\u043B\u0435 \u043D\u0438\u0436\u0435"}</p>
      </div>
    </div>
  );
}

function AlternativesBubble({ message, onSearch }) {
  const { alternatives } = message;
  const posthog = usePostHog();
  if (!alternatives) return null;
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar" aria-label="Welgo Desk AI">D</div>
      <div className="desk-alternatives-bubble">
        <div className="desk-alt-diagnosis">
          <span className="desk-alt-icon" aria-hidden="true">{"\u{1F50D}"}</span>
          <p className="desk-alt-diagnosis-text">{alternatives.diagnosis}</p>
        </div>
        {alternatives.market_insight && (
          <div className="desk-alt-insight">
            <span className="desk-alt-insight-icon" aria-hidden="true">{"\u{1F4A1}"}</span>
            <p className="desk-alt-insight-text">{alternatives.market_insight}</p>
          </div>
        )}
        <div className="desk-alt-suggestions">
          <span className="desk-alt-suggestions-label">{"\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C:"}</span>
          {alternatives.suggestions.map((s, i) => (
            <button key={i} className="desk-alt-suggestion-btn" onClick={() => { posthog.capture("alternative_suggestion_clicked", { label: s.label, index: i }); onSearch(s.message); }} title={s.why || s.label}>
              <span className="desk-alt-suggestion-label">{s.label}</span>
              {s.why && (<span className="desk-alt-suggestion-why">{s.why}</span>)}
              <span className="desk-alt-suggestion-arrow" aria-hidden="true">{"\u2192"}</span>
            </button>
          ))}
        </div>
        <p className="desk-alt-hint">{"\u0418\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u043F\u043E\u0438\u0441\u043A\u0430 \u0432 \u043F\u043E\u043B\u0435 \u043D\u0438\u0436\u0435"}</p>
      </div>
    </div>
  );
}

function PendingClientForm({ form, sessionId, onDone }) {
  const { t } = useI18n();
  const [values, setValues] = useState({ name: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const hasAny = Object.values(values).some((v) => v.trim());
  const handleSubmit = async () => {
    if (!hasAny || saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/desk/client_info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...values, phone: phoneDisplayToValue(values.phone) }),
      });
    } finally {
      setSaving(false);
      onDone({ ...values, phone: phoneDisplayToValue(values.phone) });
    }
  };
  return (
    <div className="desk-gather-client">
      <div className="desk-gather-client-header">
        <span className="desk-gather-client-title">{form.title}</span>
        <span className="desk-gather-client-desc">{form.description}</span>
      </div>
      <div className="desk-gather-client-fields">
        {form.fields.map((f) =>
          f.key === "phone" ? (
            <div key={f.key} className="desk-phone-wrapper">
              <span className="desk-phone-prefix">+998</span>
              <input className="desk-gather-client-input desk-phone-input" type="tel" placeholder="90 123 45 67" value={values.phone}
                onChange={(e) => { const display = formatUzPhone(e.target.value); e.target.value = display; setValues((prev) => ({ ...prev, phone: display })); }} />
            </div>
          ) : (
            <input key={f.key} className="desk-gather-client-input" type="text" placeholder={f.placeholder} value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))} />
          )
        )}
      </div>
      <div className="desk-gather-client-actions">
        <button className="desk-gather-client-save" onClick={handleSubmit} disabled={!hasAny || saving}>
          {saving ? t("desk.saving") : t("desk.save")}
        </button>
        {form.skippable && (<button className="desk-gather-client-skip" onClick={() => onDone(null)}>{form.skip_label}</button>)}
      </div>
    </div>
  );
}

function PlainBubble({ text }) {
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar" aria-label="Welgo Desk AI">D</div>
      <div className="desk-plain-bubble">{text}</div>
    </div>
  );
}

function ThinkingBubble({ statusText, progress, hotelsFound, hotelNames }) {
  const { t } = useI18n();
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar">D</div>
      <div className="desk-thinking">
        <div className="desk-thinking-row">
          <div className="desk-thinking-dots" aria-label={t("desk.analyzing")}>
            <span /><span /><span />
          </div>
          <span className="desk-thinking-label">{statusText || t("desk.analyzing_offers")}</span>
        </div>
        {hotelNames && hotelNames.length > 0 && (
          <div className="desk-thinking-names">
            {hotelNames.map((name) => (<span key={name} className="desk-thinking-name-chip">{name}</span>))}
          </div>
        )}
        {progress > 0 && progress < 100 && (
          <div className="desk-progress-wrap">
            <div className="desk-progress-bar">
              <div className="desk-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {hotelsFound > 0 && (<span className="desk-progress-count">{hotelsFound} {"\u043E\u0442\u0435\u043B\u0435\u0439"}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function formatUzPhone(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.slice(0, 2) + " " + digits.slice(2);
  if (digits.length <= 7) return digits.slice(0, 2) + " " + digits.slice(2, 5) + " " + digits.slice(5);
  return digits.slice(0, 2) + " " + digits.slice(2, 5) + " " + digits.slice(5, 7) + " " + digits.slice(7);
}

function phoneDisplayToValue(display) {
  const digits = display.replace(/\D/g, "");
  return digits ? "+998" + digits : "";
}

function GatherClientBubble({ data, progress, onSubmit, onSkip }) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));
  const handleSubmit = () => {
    const result = {};
    (data.fields || []).forEach((f) => {
      if (values[f.key]?.trim()) result[f.key] = f.key === "phone" ? phoneDisplayToValue(values[f.key]) : values[f.key].trim();
    });
    onSubmit(result);
  };
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar">D</div>
      <div className="desk-gather-client">
        <div className="desk-gather-header">
          <span className="desk-gather-title">{data.title || t("desk.client_data")}</span>
          <span className="desk-gather-desc">{data.description || t("desk.fill_while_search")}</span>
        </div>
        <div className="desk-gather-progress">
          <div className="desk-gather-progress-fill" style={{ width: progress > 0 ? `${progress}%` : "5%", transition: "width 0.4s ease" }} />
        </div>
        <div className="desk-gather-fields">
          {(data.fields || []).map((field) => (
            <div className="desk-gather-field" key={field.key}>
              <label className="desk-gather-label">{field.label}</label>
              {field.key === "phone" ? (
                <div className="desk-phone-wrapper">
                  <span className="desk-phone-prefix">+998</span>
                  <input className="desk-gather-input desk-phone-input" type="tel" placeholder="90 123 45 67" value={values.phone || ""}
                    onChange={(e) => { const display = formatUzPhone(e.target.value); e.target.value = display; set("phone", display); }} autoComplete="off" />
                </div>
              ) : (
                <input className="desk-gather-input" type="text" placeholder={field.placeholder || ""} value={values[field.key] || ""}
                  onChange={(e) => set(field.key, e.target.value)} autoComplete="off" />
              )}
            </div>
          ))}
        </div>
        <div className="desk-gather-actions">
          <button className="desk-gather-submit" onClick={handleSubmit}>{t("desk.save")} {"\u2192"}</button>
          {data.skippable && (<button className="desk-gather-skip" onClick={onSkip}>{data.skip_label || t("desk.skip")}</button>)}
        </div>
      </div>
    </div>
  );
}

function StreamingAnalysis({ text }) {
  return (
    <div className="desk-ai-plain">
      <div className="desk-avatar">D</div>
      <div className="desk-streaming-bubble">
        <pre className="desk-streaming-text">{text}<span className="desk-streaming-cursor" aria-hidden="true" /></pre>
      </div>
    </div>
  );
}

const TIER_EMOJI = { value: "\u2B50", budget: "\u{1F4B0}", luxury: "\u{1F3C6}", beach: "\u{1F3D6}\uFE0F", risky: "\u26A0\uFE0F" };

function getTierMeta(t) {
  return {
    value: { label: t("tier.value"), emoji: "\u2B50" },
    budget: { label: t("tier.budget"), emoji: "\u{1F4B0}" },
    luxury: { label: t("tier.luxury"), emoji: "\u{1F3C6}" },
    beach: { label: t("tier.beach"), emoji: "\u{1F3D6}\uFE0F" },
    risky: { label: t("tier.risky"), emoji: "\u26A0\uFE0F" },
  };
}

const TIER_ORDER = ["value", "budget", "luxury", "beach", "risky"];
const valueScore = (h) => h.rating * 15 + h.stars * 2 - Math.log(Math.max(h.price_uzs, 1) / 10_000) * 10 + (h.sea_distance_m != null && h.sea_distance_m < 200 ? 5 : 0);
const TIER_SORT = {
  value: (a, b) => valueScore(b) - valueScore(a),
  budget: (a, b) => a.price_uzs - b.price_uzs,
  luxury: (a, b) => b.rating - a.rating,
  beach: (a, b) => {
    if (a.sea_distance_m == null && b.sea_distance_m == null) return 0;
    if (a.sea_distance_m == null) return 1;
    if (b.sea_distance_m == null) return -1;
    return a.sea_distance_m - b.sea_distance_m;
  },
  risky: (a, b) => a.rating - b.rating,
};
const TOP_N = 4;

function buildQuote(hotels, t) {
  if (!hotels.length) return "";
  const lines = ["\u2708\uFE0F\n"];
  for (const h of hotels) {
    lines.push(`\u{1F3E8} *${h.hotel_name}* (${h.stars}\u2605, ${h.rating.toFixed(1)})`);
    lines.push(`\u{1F4CD} ${h.region}`);
    lines.push(`\u{1F37D} ${t("hotel.meal")}: ${h.meal_plan}`);
    if (h.sea_distance_m != null) lines.push(`\u{1F30A} ${t("hotel.sea")}: ${h.sea_distance_m} ${t("hotel.sea_m")}`);
    lines.push(`\u{1F4B0} $${h.price_usd_approx.toLocaleString("en-US")} (${h.nights} ${t("hotel.nights")}, ${h.departure_date})`);
    lines.push("");
  }
  lines.push(t("quote.contact_cta"));
  return lines.join("\n");
}

function PreviewResult({ message, onHide, onAnalyze = null, sessionId }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hotels, setHotels] = useState(message.previewHotels ?? []);
  const [loadingMore, setLoadingMore] = useState(false);
  const total = message.previewTotal ?? hotels.length;
  const hasMore = hotels.length < total;

  // Sync initial hotels from message
  useEffect(() => {
    if (message.previewHotels?.length) setHotels(message.previewHotels);
  }, [message.previewHotels]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
  }, [hotels.length, updateScrollState]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector(".dhcard")?.offsetWidth ?? 260;
    el.scrollBy({ left: dir * (cardW + 12) * 2, behavior: "smooth" });
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch(`/api/desk/hotels?session_id=${encodeURIComponent(sessionId)}&offset=${hotels.length}&limit=12`);
      if (r.ok) {
        const data = await r.json();
        setHotels((prev) => [...prev, ...(data.hotels ?? [])]);
      }
    } finally { setLoadingMore(false); }
  };

  const annotations = message.hotel_annotations ?? [];
  const annMap = {};
  for (const a of annotations) { if (a.hotel_name) annMap[a.hotel_name] = a; }
  if (!hotels.length) return null;
  const isFinal = message.previewFinal;
  const isSearching = !isFinal;

  return (
    <div className="desk-result-block">
      <div className="desk-carousel-wrap">
        {canScrollLeft && (
          <button className="desk-carousel-arrow desk-carousel-arrow--left" onClick={() => scroll(-1)} aria-label="Назад">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div className="desk-hotel-carousel" ref={scrollRef}>
          {hotels.map((h) => (
            <DeskHotelCard key={h.hotel_id} hotel={h} onHide={(name) => onHide(name)} selected={false} onSelect={() => {}} annotation={annMap[h.hotel_name] ?? null} loading={isSearching} />
          ))}
          {hasMore && isFinal && (
            <button className="desk-carousel-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <span className="desk-carousel-more-spin" />
              ) : (
                <>
                  <span className="desk-carousel-more-count">+{total - hotels.length}</span>
                  <span className="desk-carousel-more-label">ещё</span>
                </>
              )}
            </button>
          )}
        </div>
        {canScrollRight && (
          <button className="desk-carousel-arrow desk-carousel-arrow--right" onClick={() => scroll(1)} aria-label="Вперёд">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>
      {isFinal && (
        <div className="desk-carousel-footer">
          <span className="desk-carousel-counter">{hotels.length} из {total}</span>
          {onAnalyze && (
            <button className="desk-analyze-btn" onClick={onAnalyze}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
              Анализировать
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StructuredResult({ message, sessionId, onHide, onShowAll }) {
  const { t } = useI18n();
  const TIER_META = getTierMeta(t);
  const [activeTier, setActiveTier] = useState(null);
  const [poolHotels, setPoolHotels] = useState(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customQuote, setCustomQuote] = useState(null);
  const posthog = usePostHog();
  const { structured } = message;
  if (!structured) return null;
  const parallelTop = structured.ui_hotels;
  const total = structured.meta?.total_options_found ?? 0;
  const presentTiers = TIER_ORDER.filter((t) => parallelTop.some((h) => h.value_tier === t));
  const handleTierClick = async (tier) => {
    const next = activeTier === tier ? null : tier;
    setActiveTier(next);
    posthog.capture("tier_changed", { tier: next });
    if (next && !poolHotels) {
      setPoolLoading(true);
      try {
        const r = await apiFetch(`/api/desk/hotels?session_id=${encodeURIComponent(sessionId)}`);
        if (r.ok) { const data = await r.json(); setPoolHotels(data.hotels ?? []); }
      } finally { setPoolLoading(false); }
    }
  };
  const handleSelect = (hotelId) => {
    posthog.capture(selectedIds.has(hotelId) ? "hotel_deselected" : "hotel_selected", { hotel_id: hotelId });
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(hotelId)) next.delete(hotelId); else next.add(hotelId); return next; });
    setCustomQuote(null);
  };
  const handleGenerateQuote = () => {
    const pool = poolHotels ?? parallelTop;
    const selected = visibleHotels.filter((h) => selectedIds.has(h.hotel_id));
    const allSelected = [...new Map([...selected, ...(pool ?? []).filter((h) => selectedIds.has(h.hotel_id))].map((h) => [h.hotel_id, h])).values()];
    setCustomQuote(buildQuote(allSelected, t));
    posthog.capture("quote_generated", { hotel_count: selectedIds.size });
  };
  let visibleHotels;
  if (!activeTier) { visibleHotels = parallelTop; }
  else if (poolLoading || !poolHotels) { visibleHotels = parallelTop.filter((h) => h.value_tier === activeTier); }
  else { const sorter = TIER_SORT[activeTier] ?? TIER_SORT.value; visibleHotels = [...poolHotels].sort(sorter).slice(0, TOP_N); }
  const selCount = selectedIds.size;
  const annotations = message.hotel_annotations ?? [];
  const annMap = {};
  for (const a of annotations) { if (a.hotel_name) annMap[a.hotel_name] = a; }
  const { verdict } = splitAnalysis(structured.ai_analysis);
  const recMatch = verdict.match(/\*\*(.+?)\*\*/);
  const recHeroText = recMatch ? recMatch[1] : null;
  const recRestText = recHeroText ? verdict.replace(`**${recHeroText}**`, '').replace(/^\s*[.,]\s*/, '').trim() : verdict;
  return (
    <div className="desk-result-block">
      {recHeroText && (
        <div className="desk-rec-hero">
          <span className="desk-rec-hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
            </svg>
          </span>
          <span className="desk-rec-hero-text">{recHeroText}</span>
        </div>
      )}
      {recRestText && (<p className="desk-verdict-rest">{recRestText}</p>)}
      {presentTiers.length > 1 && (
        <div className="desk-tier-selector" role="group" aria-label={"\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044E"}>
          <button className={`desk-tier-pill${activeTier === null ? " desk-tier-pill--active" : ""}`} onClick={() => setActiveTier(null)}>{"\u0422\u043E\u043F"}</button>
          {presentTiers.map((tier) => {
            const meta = TIER_META[tier];
            const isActive = activeTier === tier;
            return (
              <button key={tier} className={`desk-tier-pill desk-tier-pill--${tier}${isActive ? " desk-tier-pill--active" : ""}`}
                onClick={() => handleTierClick(tier)} title={`\u0422\u043E\u043F-${TOP_N} \u043F\u043E \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044E \u00AB${meta.label}\u00BB`}>
                <span aria-hidden="true">{meta.emoji}</span>{meta.label}
                {isActive && poolLoading && (<span className="desk-tier-pill-spin" aria-hidden="true" />)}
              </button>
            );
          })}
        </div>
      )}
      {visibleHotels.length === 0 ? (
        <p className="desk-no-results">{"\u041D\u0435\u0442 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u043F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044E."}</p>
      ) : (
        <div className="desk-hotel-grid">
          {visibleHotels.map((h) => (
            <DeskHotelCard key={h.hotel_id} hotel={h} onHide={(name) => onHide(name)} selected={selectedIds.has(h.hotel_id)} onSelect={handleSelect} annotation={annMap[h.hotel_name] ?? null} />
          ))}
        </div>
      )}
      {selCount > 0 && (
        <div className="desk-select-bar">
          <span className="desk-select-bar-count">{t("modal.selected")} {selCount} {selCount === 1 ? t("modal.hotel") : selCount < 5 ? t("modal.hotels_234") : t("modal.hotels_5plus")}</span>
          <button className="desk-select-bar-btn" onClick={handleGenerateQuote}>{t("quote.title")} {"\u2192"}</button>
          <button className="desk-select-bar-clear" onClick={() => { setSelectedIds(new Set()); setCustomQuote(null); }} title={t("modal.deselect")}>{"\u2715"}</button>
        </div>
      )}
      {total > parallelTop.length && (
        <button className="desk-show-all-btn" onClick={onShowAll} aria-label={`\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u0441\u0435 ${total} \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {"\u0412\u0441\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B"}<span className="desk-show-all-btn-count">{total}</span>
        </button>
      )}
      <DeskAnalysisPanel text={structured.ai_analysis} fromCache={structured.meta?.from_cache} totalFound={total} />
      <DeskQuoteBox text={customQuote ?? structured.client_quote} />
    </div>
  );
}

export default function DeskView({ sessionId, onTurnComplete }) {
  const [messages, setMessages] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const isThinkingRef = useRef(false);
  const [text, setText] = useState("");
  const [allHotelsOpen, setAllHotelsOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [pendingClientForm, setPendingClientForm] = useState(null);
  const [sessionClient, setSessionClient] = useState(null);
  const posthog = usePostHog();
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load existing conversation history
  useEffect(() => {
    apiFetch(`/api/desk/conversations/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.client_info) setSessionClient(data.client_info);
        if (!data?.messages?.length) return;
        setMessages(data.messages.map((m) => {
          if (m.role === "user") return { id: m.id, type: "user", text: m.content };
          const isSearch = m.meta?.type === "search";
          return {
            id: m.id, type: "desk-ai", state: "done",
            plain_text: isSearch ? null : m.content,
            structured: isSearch ? { ai_analysis: m.content, ui_hotels: m.meta.ui_hotels ?? [], client_quote: m.meta.client_quote ?? "", meta: m.meta.meta ?? {}, available_filters: m.meta.available_filters ?? null } : null,
            streamingAnalysis: "", filterState: EMPTY_FILTER, filterLoading: false, error: null,
          };
        }));
      }).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // Auto-grow textarea
  useEffect(() => { const ta = textareaRef.current; if (!ta) return; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }, [text]);

  const updateMessage = useCallback((id, patch) => { setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))); }, []);

  // handleSend with SSE streaming
  const handleSend = useCallback(async (rawText, contextActions = []) => {
    if (isThinkingRef.current || !rawText.trim()) return;
    isThinkingRef.current = true;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const userId = Date.now();
    const aiId = userId + 1;
    const isExclusion = contextActions.length > 0;
    if (!isExclusion) posthog.capture("search_submitted", { query_length: rawText.trim().length });
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== "welcome"),
      ...(isExclusion ? [] : [{ id: userId, type: "user", text: rawText }]),
      { id: aiId, type: "desk-ai", state: "thinking", userText: rawText, statusText: "", progress: 0, hotelsFound: 0, hotelNames: [], thought: null, streamingAnalysis: "", structured: null, hotel_annotations: [], previewHotels: null, previewFinal: false, previewTotal: 0, previewFilters: null, previewQuickActions: null, previewClientQuote: null, plain_text: null, clarify: null, alternatives: null, filteredHotels: null, filterState: EMPTY_FILTER, filterLoading: false, error: null },
    ]);
    setIsThinking(true);
    try {
      const resp = await apiFetch("/api/desk/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: rawText, session_id: sessionId, blacklist, context_actions: contextActions, ...(clientInfo ? { client_info: clientInfo } : {}) }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        let detail = errText;
        try { detail = JSON.parse(errText).detail ?? errText; } catch {}
        const status = resp.status;
        let msg = detail;
        if (status === 403 && /лимит поисков исчерпан/i.test(detail)) msg = detail;
        else if (status === 403 && /организация деактивирована/i.test(detail)) msg = detail;
        else if (status === 503) msg = t("desk.service_unavailable");
        updateMessage(aiId, { state: "error", error: msg });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let chunk;
          try { chunk = JSON.parse(raw); } catch { continue; }
          if (chunk.type === "error") { updateMessage(aiId, { state: "error", error: chunk.text }); return; }
          if (chunk.type === "done") return;
          if (chunk.type === "thought") { updateMessage(aiId, { thought: { intent_summary: chunk.intent_summary, travel_profile: chunk.travel_profile, confidence: chunk.confidence, missing_info: chunk.missing_info ?? [], tool_plan: chunk.tool_plan ?? [], search_hints: chunk.search_hints ?? "" } }); }
          if (chunk.type === "status") { updateMessage(aiId, { state: "thinking", statusText: chunk.text }); }
          if (chunk.type === "progress") { setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, state: m.state === "previewing" ? "previewing" : "thinking", statusText: chunk.text, progress: chunk.progress ?? 0, hotelsFound: chunk.hotels_found ?? 0, hotelNames: chunk.hotel_names ?? [] } : m)); }
          if (chunk.type === "hotel_preview") { updateMessage(aiId, { state: "previewing", previewHotels: chunk.hotels, previewFinal: !!chunk.final, previewTotal: chunk.total ?? chunk.hotels?.length ?? 0 }); }
          if (chunk.type === "filters") { updateMessage(aiId, { previewFilters: chunk.available_filters }); }
          if (chunk.type === "analysis_stream") { setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, state: "analyzing", streamingAnalysis: (m.streamingAnalysis || "") + chunk.text } : m)); }
          if (chunk.type === "hotel_annotate") { setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, hotel_annotations: [...(m.hotel_annotations || []), chunk] } : m)); }
          if (chunk.type === "quick_actions") { updateMessage(aiId, { previewQuickActions: chunk.actions }); }
          if (chunk.type === "client_quote") { updateMessage(aiId, { previewClientQuote: chunk.text }); }
          if (chunk.type === "result") { updateMessage(aiId, { state: "done", structured: chunk.structured, hotel_annotations: chunk.hotel_annotations ?? [] }); }
          if (chunk.type === "clarify") { updateMessage(aiId, { state: "clarify", clarify: chunk }); }
          if (chunk.type === "alternatives") { updateMessage(aiId, { state: "alternatives", alternatives: chunk }); }
          if (chunk.type === "plain") { updateMessage(aiId, { state: "done", plain_text: chunk.text }); }
          if (chunk.type === "gather_client") { setPendingClientForm(chunk); }
        }
      }
    } catch (e) { updateMessage(aiId, { state: "error", error: e.message }); }
    finally { isThinkingRef.current = false; setIsThinking(false); onTurnComplete?.(); }
  }, [sessionId, blacklist, clientInfo, updateMessage, onTurnComplete]);

  const handleHide = useCallback((hotelName) => {
    posthog.capture("hotel_hidden", { hotel_name: hotelName });
    const newBlacklist = [...new Set([...blacklist, hotelName])];
    setBlacklist(newBlacklist);
    handleSend(`\u0421\u043A\u0440\u044B\u0442\u044C: ${hotelName}`, [{ action: "exclude_hotel", hotel_name: hotelName, reason: "excluded by agent" }]);
  }, [blacklist, handleSend]);

  const handleFilterChange = useCallback(async (msgId, filterVal, commit) => {
    updateMessage(msgId, { filterState: filterVal });
    if (!commit) return;
    posthog.capture("filter_applied", { price_min: filterVal.priceMin, price_max: filterVal.priceMax, stars_min: filterVal.starsMin, meal_plan: filterVal.mealPlan, operators: filterVal.operators });
    updateMessage(msgId, { filterLoading: true });
    try {
      const resp = await apiFetch("/api/desk/filter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, price_min: filterVal.priceMin ?? null, price_max: filterVal.priceMax ?? null, stars_min: filterVal.starsMin ?? null, meal_plan: filterVal.mealPlan ?? null, operators: filterVal.operators ?? [] }),
      });
      if (resp.ok) { const data = await resp.json(); updateMessage(msgId, { filteredHotels: data.ui_hotels, filterLoading: false }); }
      else { updateMessage(msgId, { filterLoading: false }); }
    } catch { updateMessage(msgId, { filterLoading: false }); }
  }, [sessionId, updateMessage]);

  const handleSummarize = useCallback(async (hotelIds, mode) => {
    const aiId = Date.now();
    setMessages((prev) => [...prev, { id: aiId, type: "desk-ai", state: "thinking", statusText: "", progress: 0, hotelsFound: 0, hotelNames: [], streamingAnalysis: "", structured: null, plain_text: null, filteredHotels: null, filterState: EMPTY_FILTER, filterLoading: false, error: null }]);
    setIsThinking(true);
    try {
      const resp = await apiFetch("/api/desk/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, hotel_ids: hotelIds, mode }) });
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let chunk; try { chunk = JSON.parse(line.slice(6)); } catch { continue; }
          if (chunk.type === "done") return;
          if (chunk.type === "error") { updateMessage(aiId, { state: "error", error: chunk.text }); return; }
          if (chunk.type === "status") updateMessage(aiId, { state: "thinking", statusText: chunk.text });
          if (chunk.type === "analysis_stream") { setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, state: "analyzing", streamingAnalysis: (m.streamingAnalysis || "") + chunk.text } : m)); }
          if (chunk.type === "result") updateMessage(aiId, { state: "done", structured: chunk.structured });
        }
      }
    } catch (e) { updateMessage(aiId, { state: "error", error: e.message }); }
    finally { setIsThinking(false); }
  }, [sessionId, updateMessage]);

  const handleSimilar = useCallback((hotel) => {
    posthog.capture("find_similar_clicked", { hotel_name: hotel.hotel_name });
    const msg = `\u041D\u0430\u0439\u0434\u0438 \u043F\u043E\u0445\u043E\u0436\u0438\u0435 \u043D\u0430 ${hotel.hotel_name}: ${hotel.region}, ${hotel.stars}\u2605, \u043F\u0438\u0442\u0430\u043D\u0438\u0435 ${hotel.meal_plan}`;
    handleSend(msg);
  }, [handleSend]);

  const submit = useCallback(() => { if (isThinkingRef.current || !text.trim()) return; handleSend(text.trim()); }, [text, handleSend]);
  const handleKeyDown = useCallback((e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }, [submit]);
  const showWelcome = messages.length === 0;

  return (
    <div className="desk-shell">
      {allHotelsOpen && (() => {
        const last = [...messages].reverse().find((m) => m.structured);
        return (<DeskAllHotelsModal sessionId={sessionId} totalFound={last?.structured?.meta?.total_options_found ?? 0}
          filters={last?.structured?.available_filters ?? null} filterState={last?.filterState ?? EMPTY_FILTER}
          filterLoading={last?.filterLoading ?? false} filteredHotels={last?.filteredHotels ?? null}
          onFilterChange={(val, commit) => last && handleFilterChange(last.id, val, commit)}
          onClose={() => setAllHotelsOpen(false)} onSummarize={handleSummarize} onSimilar={handleSimilar} />);
      })()}
      <div className="desk-scroll" ref={scrollRef} role="log" aria-live="polite">
        {showWelcome && (
          <div className="desk-welcome">
            <div className="desk-welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h2 className="desk-welcome-title">Welgo Desk</h2>
            <p className="desk-welcome-sub">{t("auth.agent_mode")}</p>
            <div className="desk-chips">
              {getDeskChips(t).map((chip) => (
                <button key={chip} className="desk-chip" onClick={() => { posthog.capture("suggestion_chip_clicked", { chip }); handleSend(chip); }}>{chip}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, idx) => {
          const prevAi = messages.slice(0, idx).reverse().find((p) => p.type === "desk-ai");
          const showSep = m.type === "user" && idx > 0 && prevAi?.structured;
          if (m.type === "user") {
            return [
              showSep && (<div key={`sep-${m.id}`} className="desk-iter-sep"><span className="desk-iter-sep-line" /><span className="desk-iter-sep-label">{"\u041D\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441"}</span><span className="desk-iter-sep-line" /></div>),
              <div key={m.id} className="desk-user-row"><div className="desk-user-bubble">{m.text}</div></div>,
            ];
          }
          if (m.state === "thinking") {
            if (m.gatherClient) {
              return (<GatherClientBubble key={m.id} data={m.gatherClient} progress={m.progress}
                onSubmit={(info) => { posthog.capture("client_info_submitted", { has_name: !!info?.name, has_phone: !!info?.phone, has_notes: !!info?.notes }); setClientInfo(info); updateMessage(m.id, { gatherClient: null }); }}
                onSkip={() => { posthog.capture("client_info_skipped"); updateMessage(m.id, { gatherClient: null }); }} />);
            }
            return (<div key={m.id}>{m.thought && <ThoughtBubble thought={m.thought} />}<ThinkingBubble statusText={m.statusText} progress={m.progress} hotelsFound={m.hotelsFound} hotelNames={m.hotelNames} /></div>);
          }
          if (m.state === "previewing" || m.state === "analyzing") return (<div key={m.id}>{m.thought && <ThoughtBubble thought={m.thought} />}{m.state === "previewing" && !m.previewFinal && <ThinkingBubble statusText={m.statusText} progress={m.progress} hotelsFound={m.hotelsFound} hotelNames={m.hotelNames} />}{m.previewHotels && (<div className="desk-result-wrap"><div className="desk-avatar" aria-label="Welgo Desk AI">D</div><PreviewResult message={m} onHide={handleHide} onAnalyze={m.previewFinal ? () => handleSend("Анализировать", [{ action: "analyze" }]) : null} sessionId={sessionId} /></div>)}{m.streamingAnalysis && <StreamingAnalysis text={m.streamingAnalysis} />}</div>);
          if (m.state === "clarify") return (<div key={m.id}>{m.thought && <ThoughtBubble thought={m.thought} />}<ClarifyBubble message={m} onSearch={handleSend} /></div>);
          if (m.state === "alternatives") return (<div key={m.id}>{m.thought && <ThoughtBubble thought={m.thought} />}<AlternativesBubble message={m} onSearch={handleSend} /></div>);
          if (m.state === "error") return (<div key={m.id} className="desk-error" role="alert">{"\u041E\u0448\u0438\u0431\u043A\u0430: "}{m.error}</div>);
          if (m.plain_text) return <PlainBubble key={m.id} text={m.plain_text} />;
          if (m.structured) {
            return (<div key={m.id}>{m.thought && <ThoughtBubble thought={m.thought} />}
              <div className="desk-result-wrap"><div className="desk-avatar" aria-label="Welgo Desk AI">D</div>
                <StructuredResult message={m} sessionId={sessionId} onHide={handleHide} onShowAll={() => { posthog.capture("all_hotels_opened"); setAllHotelsOpen(true); }} />
              </div></div>);
          }
          return null;
        })}
      </div>
      {sessionClient && (sessionClient.name || sessionClient.phone) && (
        <div className="desk-client-bar">
          <span className="desk-client-bar-label">{"\u041A\u043B\u0438\u0435\u043D\u0442:"}</span>
          {sessionClient.name && (<span className="desk-client-bar-name">{sessionClient.name}</span>)}
          {sessionClient.phone && (<span className="desk-client-bar-phone">{sessionClient.phone}</span>)}
          {sessionClient.notes && (<span className="desk-client-bar-notes">{sessionClient.notes}</span>)}
        </div>
      )}
      {pendingClientForm && (<PendingClientForm form={pendingClientForm} sessionId={sessionId}
        onDone={(submitted) => { setPendingClientForm(null); if (submitted) setSessionClient(submitted); }} />)}
      {builderOpen && (<TourPromptBuilder onSend={(prompt) => { handleSend(prompt); }} onClose={() => setBuilderOpen(false)} />)}
      <div className="desk-input-bar">
        <div className="desk-input-wrap">
          <button className="desk-builder-btn" type="button" onClick={() => { posthog.capture("prompt_builder_opened"); setBuilderOpen(true); }}
            title={t("desk.prompt_builder")} aria-label={t("desk.open_builder")} disabled={isThinking}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </button>
          <textarea ref={textareaRef} className="desk-textarea" rows={1} placeholder={t("desk.input_placeholder")}
            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
            disabled={isThinking} aria-label={t("desk.send")} autoComplete="off" />
          <button className="desk-send-btn" onClick={submit} disabled={isThinking || !text.trim()}
            title={t("desk.send_enter")} aria-label={t("desk.send")}>
            {isThinking ? (<span className="desk-send-spinner" aria-hidden="true" />) : (<SendIcon />)}
          </button>
        </div>
        {blacklist.length > 0 && (
          <div className="desk-blacklist-bar">
            <span className="desk-blacklist-label">{"\u0421\u043A\u0440\u044B\u0442\u044B:"}</span>
            {blacklist.map((name) => (
              <span key={name} className="desk-blacklist-tag">{name}
                <button className="desk-blacklist-remove" onClick={() => setBlacklist((prev) => prev.filter((n) => n !== name))}
                  aria-label={`\u0412\u0435\u0440\u043D\u0443\u0442\u044C ${name}`} title={t("desk.return_to_results")}>{"\u00D7"}</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
