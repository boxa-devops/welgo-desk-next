// src/components/desk/DeskQuoteBox.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { usePostHog } from "@/lib/posthog";
import { useI18n } from "@/lib/i18n";
import { fmtUzs, stars as starsUtil, ratingClass } from "@/utils";
import "./DeskQuoteBox.css";

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
  </svg>
);

function ShareCard({ hotel, annotation }: { hotel: any; annotation?: any }) {
  const rc = ratingClass(hotel.rating);
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="dqb-share-card">
      <div className="dqb-sc-photo">
        {hotel.image_url && !imgErr ? (
          <img src={hotel.image_url} alt={hotel.hotel_name} loading="lazy" onError={() => setImgErr(true)} />
        ) : (
          <div className="dqb-sc-photo-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {annotation?.is_recommended && <span className="dqb-sc-rec">★</span>}
      </div>
      <div className="dqb-sc-body">
        <div className="dqb-sc-name">{hotel.hotel_name}</div>
        <div className="dqb-sc-meta">
          <span className="dqb-sc-stars">{starsUtil(hotel.stars)}</span>
          <span className={`dqb-sc-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
          <span className="dqb-sc-region">{hotel.region}</span>
        </div>
        {annotation?.insight && <div className="dqb-sc-insight">✓ {annotation.insight}</div>}
        {annotation?.red_flag && <div className="dqb-sc-flag">⚠ {annotation.red_flag}</div>}
        <div className="dqb-sc-details">
          <span>{hotel.meal_plan}</span>
          {hotel.sea_distance_m != null && <span>🌊 {hotel.sea_distance_m}м</span>}
          <span>{hotel.nights}н · {hotel.departure_date}</span>
        </div>
        <div className="dqb-sc-price">
          <span className="dqb-sc-price-usd">${hotel.price_usd_approx.toLocaleString("en-US")}</span>
          <span className="dqb-sc-price-uzs">{fmtUzs(hotel.price_uzs)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DeskQuoteBox({ text, hotels = [], annotations = {} }: { text: any; hotels?: any[]; annotations?: Record<string, any> }) {
  const posthog = usePostHog();
  const { t } = useI18n();
  const [editedText, setEditedText] = useState(text);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"visual" | "text">(hotels.length > 0 ? "visual" : "text");
  const cardsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  useEffect(() => {
    if (hotels.length > 0) setTab("visual");
  }, [hotels.length]);

  useEffect(() => {
    if (tab !== "text") return;
    const ta = textareaRef.current;
    if (!ta) return;
    const len = ta.value.length;
    const saved = savedSelectionRef.current;
    const start = saved ? Math.min(saved.start, len) : len;
    const end = saved ? Math.min(saved.end, len) : len;
    ta.focus();
    try {
      ta.setSelectionRange(start, end);
    } catch {
      // ignore if the browser refuses the range (e.g. unsupported input type)
    }
  }, [tab]);

  const handleSelectionSave = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    savedSelectionRef.current = {
      start: ta.selectionStart ?? 0,
      end: ta.selectionEnd ?? 0,
    };
  };

  if (!text && !hotels.length) return null;

  const handleCopy = async () => {
    posthog.capture("quote_copied", { mode: tab });
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = editedText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rows = Math.max(3, (editedText || "").split("\n").length);

  return (
    <div className="dqb-root">
      <div className="dqb-header">
        <span className="dqb-label">
          <TelegramIcon />
          {t("quote.ready")}
        </span>
        <div className="dqb-header-actions">
          {hotels.length > 0 && (
            <div className="dqb-tab-switch">
              <button className={`dqb-tab${tab === "visual" ? " active" : ""}`} onClick={() => setTab("visual")}>{t("quote.visual")}</button>
              <button className={`dqb-tab${tab === "text" ? " active" : ""}`} onClick={() => setTab("text")}>{t("quote.text")}</button>
            </div>
          )}
          {tab === "text" && (
            <button
              className={`dqb-copy-btn ${copied ? "dqb-copy-btn--done" : ""}`}
              onClick={handleCopy}
              title={t("quote.copy_title")}
              aria-label={t("quote.copy_title")}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? t("quote.copied") : t("quote.copy")}
            </button>
          )}
        </div>
      </div>
      {tab === "visual" && hotels.length > 0 && (
        <div className="dqb-share-cards" ref={cardsRef}>
          {hotels.map((h) => (
            <ShareCard key={h.hotel_id} hotel={h} annotation={annotations[h.hotel_name]} />
          ))}
          <div className="dqb-sc-watermark">welgo.uz</div>
        </div>
      )}
      {tab === "text" && (
        <textarea
          ref={textareaRef}
          className="dqb-textarea"
          value={editedText}
          rows={rows}
          onChange={(e) => setEditedText(e.target.value)}
          onSelect={handleSelectionSave}
          onKeyUp={handleSelectionSave}
          onMouseUp={handleSelectionSave}
          spellCheck={false}
          aria-label={t("quote.edit_label")}
        />
      )}
    </div>
  );
}
