"use client";

import "./MaintenancePage.css";

export default function MaintenancePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="maintenance-page">
      <div className="maintenance-container">
        <div className="maintenance-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <h1 className="maintenance-title">Техническое обслуживание</h1>
        <p className="maintenance-description">
          Мы обновляем сервис. Обычно занимает 10–15 минут.
        </p>
        <div className="maintenance-actions">
          <button
            type="button"
            className="maintenance-reload"
            onClick={handleReload}
          >
            Обновить страницу
          </button>
          <a
            className="maintenance-support"
            href="mailto:support@welgo.co"
          >
            Связаться с поддержкой
          </a>
        </div>
        <div className="maintenance-footer">
          <p>Спасибо за ваше терпение</p>
        </div>
      </div>
    </div>
  );
}
