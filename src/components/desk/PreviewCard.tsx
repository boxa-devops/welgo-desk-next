// src/components/desk/PreviewCard.tsx
"use client";

import { useState } from "react";
import { fmtUzs, stars, ratingClass } from "@/utils";
import "./PreviewCard.css";

function Photo({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="pcard-photo-ph" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
          <rect x="2" y="8" width="20" height="14" />
          <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
        </svg>
      </div>
    );
  }
  return <img className="pcard-photo" src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

const TIER_LABELS = { value: "Ценность", budget: "Цена", luxury: "Рейтинг", beach: "Море" };

export default function PreviewCard({ hotel, annotation, index = 0, onClick = null, selected = false }) {
  const rc = ratingClass(hotel.rating);
  const tier = hotel.value_tier;

  return (
    <article
      className={`pcard pcard--${tier}${onClick ? " pcard--clickable" : ""}${selected ? " pcard--selected" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick ? () => onClick(hotel) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(hotel); } } : undefined}
    >
      <div className="pcard-photo-wrap">
        <Photo src={hotel.image_url} name={hotel.hotel_name} />
        <div className={`pcard-tier pcard-tier--${tier}`}>{TIER_LABELS[tier]}</div>
      </div>
      <div className="pcard-body">
        <div className="pcard-name" title={hotel.hotel_name}>{hotel.hotel_name}</div>
        <div className="pcard-meta">
          <span className="pcard-stars">{stars(hotel.stars)}</span>
          <span className={`pcard-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
          <span className="pcard-region">{hotel.region}</span>
        </div>
        {annotation?.is_recommended && (
          <span className="pcard-rec">★ Рекомендован</span>
        )}
        <div className="pcard-price-row">
          <span className="pcard-price">${hotel.price_usd_approx.toLocaleString("en-US")}</span>
          <span className="pcard-price-uzs">{fmtUzs(hotel.price_uzs)}</span>
        </div>
        <div className="pcard-details">
          <span>{hotel.meal_plan}</span>
          <span className="pcard-sep">·</span>
          <span>{hotel.nights}н</span>
          {hotel.sea_distance_m != null && (
            <>
              <span className="pcard-sep">·</span>
              <span>{hotel.sea_distance_m}м</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
