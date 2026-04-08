// src/components/desk/HotelDetailModal.tsx
"use client";

import { useState, useEffect } from "react";
import { fmtUzs, stars, ratingClass } from "@/utils";
import { apiFetch } from "@/lib/api";
import "./HotelDetailModal.css";

const TIER_LABELS = {
  value: "Ценность",
  budget: "Цена",
  luxury: "Рейтинг",
  beach: "Море",
};

const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

function fmtDate(dateStr: string) {
  const parts = dateStr.split("-");
  const day = parseInt(parts[2], 10);
  const mo = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTHS_SHORT[mo]}`;
}

function fmtFullDate(dateStr: string) {
  const parts = dateStr.split("-");
  const day = parseInt(parts[2], 10);
  const mo = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${day} ${MONTHS_SHORT[mo]} ${year}`;
}

function Photo({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="hdm-photo-ph">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
          <rect x="2" y="8" width="20" height="14" />
          <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
        </svg>
      </div>
    );
  }
  return <img className="hdm-photo" src={src} alt={name} onError={() => setFailed(true)} />;
}

interface HotelDetailModalProps {
  hotel: any;
  sessionId: string;
  onClose: () => void;
}

export default function HotelDetailModal({ hotel: initialHotel, sessionId, onClose }: HotelDetailModalProps) {
  const [hotel, setHotel] = useState(initialHotel);
  const [loading, setLoading] = useState(false);
  const [operatorLoading, setOperatorLoading] = useState(false);

  // Fetch full hotel detail from backend (may have more tour_dates)
  useEffect(() => {
    if (!initialHotel?.hotel_id || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/desk/hotel-detail?session_id=${encodeURIComponent(sessionId)}&hotel_id=${encodeURIComponent(initialHotel.hotel_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.hotel) setHotel(data.hotel);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialHotel?.hotel_id, sessionId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!hotel) return null;

  const rc = ratingClass(hotel.rating);
  const tier = hotel.value_tier;
  const dates = hotel.tour_dates || [];

  const handleOperatorLink = async (tourId: string) => {
    setOperatorLoading(true);
    try {
      const r = await apiFetch(`/api/desk/tour-link?tour_id=${encodeURIComponent(tourId)}`);
      const data = await r.json();
      if (data.operator_link) {
        window.open(data.operator_link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOperatorLoading(false);
    }
  };

  const logoUrl = hotel.operator_id
    ? `https://tourvisor.ru/pics/operators/mobilelogo/${hotel.operator_id}.png`
    : null;

  return (
    <div className="hdm-overlay" onClick={onClose}>
      <div className="hdm-panel" onClick={e => e.stopPropagation()}>
        <button className="hdm-close" onClick={onClose} aria-label="Закрыть">&times;</button>

        {/* Hero photo */}
        <div className="hdm-hero">
          <Photo src={hotel.image_url} name={hotel.hotel_name} />
          <div className={`hdm-tier hdm-tier--${tier}`}>{TIER_LABELS[tier]}</div>
        </div>

        <div className="hdm-content">
          {/* Header */}
          <div className="hdm-header">
            <h2 className="hdm-name">{hotel.hotel_name}</h2>
            <div className="hdm-meta">
              <span className="hdm-stars">{stars(hotel.stars)}</span>
              <span className={`hdm-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
              <span className="hdm-region">{hotel.region}</span>
            </div>
          </div>

          {/* Key info grid */}
          <div className="hdm-info-grid">
            <div className="hdm-info-item">
              <span className="hdm-info-label">Питание</span>
              <span className="hdm-info-value">{hotel.meal_plan}</span>
            </div>
            <div className="hdm-info-item">
              <span className="hdm-info-label">Ночей</span>
              <span className="hdm-info-value">{hotel.nights}</span>
            </div>
            <div className="hdm-info-item">
              <span className="hdm-info-label">Вылет</span>
              <span className="hdm-info-value">{fmtFullDate(hotel.departure_date)}</span>
            </div>
            {hotel.sea_distance_m != null && (
              <div className="hdm-info-item">
                <span className="hdm-info-label">До моря</span>
                <span className="hdm-info-value">{hotel.sea_distance_m} м</span>
              </div>
            )}
            {hotel.is_charter && (
              <div className="hdm-info-item">
                <span className="hdm-info-label">Тип</span>
                <span className="hdm-info-value hdm-charter">Чартер</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="hdm-price-block">
            <div className="hdm-price-main">${hotel.price_usd_approx.toLocaleString("en-US")}</div>
            <div className="hdm-price-uzs">{fmtUzs(hotel.price_uzs)} сум</div>
          </div>

          {/* Features */}
          {hotel.features?.length > 0 && (
            <div className="hdm-section">
              <h3 className="hdm-section-title">Особенности</h3>
              <div className="hdm-features">
                {hotel.features.map((f: string) => (
                  <span key={f} className="hdm-feature-chip">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Operator */}
          <div className="hdm-section">
            <h3 className="hdm-section-title">Оператор</h3>
            <div className="hdm-operator">
              {logoUrl && (
                <img className="hdm-op-logo" src={logoUrl} alt={hotel.operator}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <span className="hdm-op-name">{hotel.operator}</span>
              <button className="hdm-op-link" onClick={() => handleOperatorLink(hotel.tour_id)} disabled={operatorLoading}>
                {operatorLoading ? "..." : "Перейти на сайт"}
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M5.5 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8.5" />
                  <path d="M8 1h5m0 0v5m0-5L6 8" />
                </svg>
              </button>
            </div>
          </div>

          {/* All departure dates table */}
          {dates.length > 0 && (
            <div className="hdm-section">
              <h3 className="hdm-section-title">
                Все даты вылета
                <span className="hdm-dates-count">{dates.length}</span>
              </h3>
              <div className="hdm-dates-table-wrap">
                <table className="hdm-dates-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Ночей</th>
                      <th>Цена (USD)</th>
                      <th>Цена (UZS)</th>
                      <th>Тип</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((d: any, i: number) => (
                      <tr key={d.tour_id || i} className={d.date === hotel.departure_date ? "hdm-date-row--current" : ""}>
                        <td className="hdm-date-cell">
                          <span className="hdm-date-day">{fmtDate(d.date)}</span>
                        </td>
                        <td>{d.nights}н</td>
                        <td className="hdm-date-price">${d.price_usd_approx.toLocaleString("en-US")}</td>
                        <td className="hdm-date-price-uzs">{fmtUzs(d.price_uzs)}</td>
                        <td>{d.is_charter ? <span className="hdm-charter-badge">Чартер</span> : "Регулярный"}</td>
                        <td>
                          <button className="hdm-date-book-btn" onClick={() => handleOperatorLink(d.tour_id)} disabled={operatorLoading} title="Открыть у оператора">
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                              <path d="M5.5 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8.5" />
                              <path d="M8 1h5m0 0v5m0-5L6 8" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading && <div className="hdm-loading">Загрузка деталей...</div>}
        </div>
      </div>
    </div>
  );
}
