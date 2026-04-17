// src/components/desk/DeskFilterBar.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { fmtUzs } from "@/utils";
import "./DeskFilterBar.css";

const DEBOUNCE_MS = 350;
const PRICE_STEP = 50;

export default function DeskFilterBar({ filters, value, onChange, loading }) {
  const timerRef = useRef(null);
  const numericTimerRef = useRef(null);
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

  // Local numeric input state, debounced-synced with committed value.
  const [minInput, setMinInput] = useState(String(priceMin));
  const [maxInput, setMaxInput] = useState(String(priceMax));

  useEffect(() => { setMinInput(String(priceMin)); }, [priceMin]);
  useEffect(() => { setMaxInput(String(priceMax)); }, [priceMax]);

  const commitMinInput = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, min_price_uzs), priceMax - PRICE_STEP);
    schedule({ priceMin: clamped });
  };

  const commitMaxInput = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(Math.min(n, max_price_uzs), priceMin + PRICE_STEP);
    schedule({ priceMax: clamped });
  };

  const onMinInputChange = (e) => {
    const raw = e.target.value;
    setMinInput(raw);
    clearTimeout(numericTimerRef.current);
    numericTimerRef.current = setTimeout(() => commitMinInput(raw), DEBOUNCE_MS);
  };

  const onMaxInputChange = (e) => {
    const raw = e.target.value;
    setMaxInput(raw);
    clearTimeout(numericTimerRef.current);
    numericTimerRef.current = setTimeout(() => commitMaxInput(raw), DEBOUNCE_MS);
  };

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

  // Count active filters
  const priceChanged = priceMin !== min_price_uzs || priceMax !== max_price_uzs;
  const starsActive = value.starsMin != null;
  const mealActive = value.mealPlan != null;
  const opsActive = selectedOps.length > 0;
  const activeCount =
    (priceChanged ? 1 : 0) +
    (starsActive ? 1 : 0) +
    (mealActive ? 1 : 0) +
    (opsActive ? 1 : 0);

  const resetAll = () => {
    schedule({
      priceMin: min_price_uzs,
      priceMax: max_price_uzs,
      starsMin: null,
      mealPlan: null,
      operators: [],
    });
    setOperatorSearch('');
  };

  return (
    <div className="dfb-root">
      <div className="dfb-header">
        <span className="dfb-title">
          {loading && <span className="dfb-spinner" aria-hidden="true" />}
          Фильтры
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            className="dfb-active-pill"
            onClick={resetAll}
            aria-label={`Сбросить фильтры, активно: ${activeCount}`}
            title="Сбросить все фильтры"
          >
            {activeCount} активных
          </button>
        )}
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
              step={PRICE_STEP}
              value={priceMin}
              aria-label="Минимальная цена"
              aria-valuemin={min_price_uzs}
              aria-valuemax={max_price_uzs}
              aria-valuenow={priceMin}
              onChange={e => {
                const v = Math.min(Number(e.target.value), priceMax - PRICE_STEP);
                schedule({ priceMin: Math.max(v, min_price_uzs) });
              }}
            />
            <input
              type="range"
              className="dfb-range dfb-range--max"
              min={min_price_uzs}
              max={max_price_uzs}
              step={PRICE_STEP}
              value={priceMax}
              aria-label="Максимальная цена"
              aria-valuemin={min_price_uzs}
              aria-valuemax={max_price_uzs}
              aria-valuenow={priceMax}
              onChange={e => {
                const v = Math.max(Number(e.target.value), priceMin + PRICE_STEP);
                schedule({ priceMax: Math.min(v, max_price_uzs) });
              }}
            />
          </div>

          <div className="dfb-price-inputs">
            <label className="dfb-price-field">
              <span className="dfb-sr-only">Минимальная цена, сум</span>
              <input
                type="number"
                className="dfb-price-input"
                min={min_price_uzs}
                max={max_price_uzs}
                step={PRICE_STEP}
                value={minInput}
                onChange={onMinInputChange}
                onBlur={() => commitMinInput(minInput)}
                placeholder="от"
                inputMode="numeric"
              />
            </label>
            <span className="dfb-price-sep" aria-hidden="true">—</span>
            <label className="dfb-price-field">
              <span className="dfb-sr-only">Максимальная цена, сум</span>
              <input
                type="number"
                className="dfb-price-input"
                min={min_price_uzs}
                max={max_price_uzs}
                step={PRICE_STEP}
                value={maxInput}
                onChange={onMaxInputChange}
                onBlur={() => commitMaxInput(maxInput)}
                placeholder="до"
                inputMode="numeric"
              />
            </label>
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

            <input
              className="dfb-ops-search"
              type="search"
              placeholder={operators.length > 5 ? "Найти оператора…" : "Поиск оператора"}
              value={operatorSearch}
              onChange={e => setOperatorSearch(e.target.value)}
              aria-label="Поиск оператора"
            />

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
                <div className="dfb-ops-empty-wrap">
                  <span className="dfb-ops-empty">Не нашли оператора «{operatorSearch}»</span>
                  <span className="dfb-ops-empty-hint">Проверьте раскладку клавиатуры</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
