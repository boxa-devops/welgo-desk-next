// src/components/desk/DeskFilterBar.tsx
"use client";

import { useState, useRef } from "react";
import { fmtUzs } from "@/utils";
import "./DeskFilterBar.css";

const DEBOUNCE_MS = 350;

export default function DeskFilterBar({ filters, value, onChange, loading }) {
  const timerRef = useRef(null);
  const [operatorSearch, setOperatorSearch] = useState('');

  if (!filters) return null;

  const { min_price_uzs, max_price_uzs, meal_plans = [], stars_available = [], operators = [] } = filters;
  const range = max_price_uzs - min_price_uzs || 1;

  const schedule = (patch) => {
    const next = { ...value, ...patch };
    onChange(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next, true), DEBOUNCE_MS);
  };

  const priceMin = value.priceMin ?? min_price_uzs;
  const priceMax = value.priceMax ?? max_price_uzs;
  const minPct = ((priceMin - min_price_uzs) / range) * 100;
  const maxPct = ((priceMax - min_price_uzs) / range) * 100;

  const selectedOps = value.operators ?? [];

  const toggleOperator = (op) => {
    const next = selectedOps.includes(op)
      ? selectedOps.filter(o => o !== op)
      : [...selectedOps, op];
    schedule({ operators: next });
  };

  const clearOperators = () => {
    schedule({ operators: [] });
    setOperatorSearch('');
  };

  const opQuery = operatorSearch.toLowerCase();
  const visibleOperators = opQuery
    ? operators.filter(op => op.toLowerCase().includes(opQuery))
    : operators;

  return (
    <div className="dfb-root">
      <div className="dfb-header">
        <span className="dfb-title">
          {loading && <span className="dfb-spinner" aria-hidden="true" />}
          Фильтры
        </span>
      </div>

      <div className="dfb-body">
        <div className="dfb-group">
          <label className="dfb-label">
            Цена: <strong>{fmtUzs(priceMin)}</strong> — <strong>{fmtUzs(priceMax)}</strong> сум
          </label>
          <div className="dfb-slider-wrap">
            <div
              className="dfb-track-fill"
              style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
            />
            <input
              type="range"
              className="dfb-range dfb-range--min"
              min={min_price_uzs}
              max={max_price_uzs}
              step={Math.round(range / 100)}
              value={priceMin}
              onChange={e => {
                const v = Math.min(Number(e.target.value), priceMax - 1);
                schedule({ priceMin: v });
              }}
              aria-label="Минимальная цена"
            />
            <input
              type="range"
              className="dfb-range dfb-range--max"
              min={min_price_uzs}
              max={max_price_uzs}
              step={Math.round(range / 100)}
              value={priceMax}
              onChange={e => {
                const v = Math.max(Number(e.target.value), priceMin + 1);
                schedule({ priceMax: v });
              }}
              aria-label="Максимальная цена"
            />
          </div>
        </div>

        {stars_available.length > 1 && (
          <div className="dfb-group">
            <label className="dfb-label">Звёздность</label>
            <div className="dfb-pills" role="group" aria-label="Звёздность">
              <button
                className={`dfb-pill ${!value.starsMin ? 'dfb-pill--active' : ''}`}
                onClick={() => schedule({ starsMin: null })}
              >
                Все
              </button>
              {stars_available.sort().map(s => (
                <button
                  key={s}
                  className={`dfb-pill ${value.starsMin === s ? 'dfb-pill--active' : ''}`}
                  onClick={() => schedule({ starsMin: s })}
                  aria-pressed={value.starsMin === s}
                >
                  {'★'.repeat(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {meal_plans.length > 1 && (
          <div className="dfb-group">
            <label className="dfb-label">Питание</label>
            <div className="dfb-pills" role="group" aria-label="Тип питания">
              <button
                className={`dfb-pill ${!value.mealPlan ? 'dfb-pill--active' : ''}`}
                onClick={() => schedule({ mealPlan: null })}
              >
                Все
              </button>
              {meal_plans.map(m => (
                <button
                  key={m}
                  className={`dfb-pill ${value.mealPlan === m ? 'dfb-pill--active' : ''}`}
                  onClick={() => schedule({ mealPlan: m === value.mealPlan ? null : m })}
                  aria-pressed={value.mealPlan === m}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {operators.length > 1 && (
          <div className="dfb-group">
            <div className="dfb-label-row">
              <label className="dfb-label">Операторы</label>
              {selectedOps.length > 0 && (
                <button className="dfb-ops-clear" onClick={clearOperators}>
                  Сбросить ({selectedOps.length})
                </button>
              )}
            </div>

            {operators.length > 5 && (
              <input
                className="dfb-ops-search"
                type="search"
                placeholder="Найти оператора…"
                value={operatorSearch}
                onChange={e => setOperatorSearch(e.target.value)}
              />
            )}

            <div className="dfb-ops-list" role="group" aria-label="Туроператоры">
              {visibleOperators.map(op => {
                const isSelected = selectedOps.includes(op);
                return (
                  <button
                    key={op}
                    className={`dfb-pill dfb-pill--op${isSelected ? ' dfb-pill--active' : ''}`}
                    onClick={() => toggleOperator(op)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <svg className="dfb-pill-check" viewBox="0 0 12 10" width="10" height="8">
                        <path d="M1 5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {op}
                  </button>
                );
              })}
              {opQuery && visibleOperators.length === 0 && (
                <span className="dfb-ops-empty">Не найдено</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
