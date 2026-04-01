// src/components/desk/TourPromptBuilder.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import './TourPromptBuilder.css';

const DESTINATIONS = [
  { value: 'turkey',   label: 'Турция' },
  { value: 'uae',      label: 'ОАЭ' },
  { value: 'egypt',    label: 'Египет' },
  { value: 'thailand', label: 'Таиланд' },
  { value: 'maldives', label: 'Мальдивы' },
  { value: 'domestic', label: 'Внутренний туризм' },
  { value: 'custom',   label: '+ Своё' },
];

const DEPARTURE_CITIES = [
  'Ташкент', 'Самарканд', 'Бухара', 'Наманган',
  'Андижан', 'Фергана', 'Нукус', 'Термез',
  'Карши', 'Навои', 'Ургенч',
];

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const DURATIONS = [7, 10, 14];

const BUDGETS = [
  { value: 'economy', label: 'Эконом',  sub: 'до $800' },
  { value: 'comfort', label: 'Комфорт', sub: '$800–1800' },
  { value: 'luxury',  label: 'Люкс',    sub: 'от $1800' },
];

const VIBES = [
  { value: 'beach',      label: '🏖 Пляжный' },
  { value: 'excursion',  label: '🏛 Экскурсионный' },
  { value: 'active',     label: '🧗 Активный' },
  { value: 'family',     label: '👨‍👩‍👧 Семейный' },
  { value: 'spa',        label: '💆 SPA & релакс' },
  { value: 'gastro',     label: '🍽 Гастрономический' },
];

interface FormState {
  destination: string;
  customDestination: string;
  departureCity: string;
  month: number;
  duration: number;
  adults: number;
  children: number;
  budget: string;
  vibes: string[];
  extraChips: string[];
}

function localBrief(form: FormState) {
  const DEST_MAP: Record<string, string> = { turkey: 'Турция', uae: 'ОАЭ', egypt: 'Египет', thailand: 'Таиланд', maldives: 'Мальдивы', domestic: 'Узбекистан' };
  const BUDGET_MAP: Record<string, string> = { economy: 'Эконом (до $800)', comfort: 'Комфорт ($800–1800)', luxury: 'Люкс (от $1800)' };
  const VIBE_MAP: Record<string, string> = { beach: 'пляжный', excursion: 'экскурсионный', active: 'активный', family: 'семейный', spa: 'SPA и релакс', gastro: 'гастрономический' };
  const MONTHS_RU = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];

  const dest = DEST_MAP[form.destination] || form.customDestination || form.destination;
  const month = form.month ? ` в ${MONTHS_RU[form.month - 1]}` : '';
  const people = form.children > 0
    ? `${form.adults} взр. + ${form.children} реб.`
    : `${form.adults} взрослых`;
  const vibes = form.vibes.map(v => VIBE_MAP[v] || v).filter(Boolean).join(', ');
  const budget = BUDGET_MAP[form.budget] || '';
  const extras = form.extraChips?.length ? `Важно: ${form.extraChips.join(', ')}.` : '';

  return [
    `Подбери тур в ${dest} на ${form.duration} ночей${month}`,
    `(вылет из ${form.departureCity}).`,
    `Состав: ${people}.`,
    vibes ? `Формат: ${vibes}.` : '',
    budget ? `Бюджет: ${budget}.` : '',
    extras,
  ].filter(Boolean).join(' ');
}

const CONTEXTUAL_CHIPS: Record<string, string[]> = {
  beach: ['Первая линия', 'Песчаный пляж', 'Подогреваемый бассейн', 'Водные горки'],
  family: ['Детский клуб', 'Анимация', 'Мелкий бассейн', 'Детское меню'],
  spa: ['SPA-центр', 'Хаммам', 'Тёплый бассейн', 'Тихая зона'],
  excursion: ['Близко к центру', 'Трансфер', 'Гид на русском'],
  active: ['Дайвинг', 'Снорклинг', 'Водные виды спорта', 'Фитнес-зал'],
  gastro: ['A-la-carte рестораны', 'Ultra All Inclusive', 'Местная кухня'],
};

function getChips(vibes: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of vibes) {
    for (const c of CONTEXTUAL_CHIPS[v] || []) {
      if (!seen.has(c)) { out.push(c); seen.add(c); }
    }
  }
  return out;
}

function Counter({ value, onChange, min = 0, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="tpb-counter">
      <button className="tpb-counter-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} type="button" aria-label="Уменьшить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14"/>
        </svg>
      </button>
      <span className="tpb-counter-val">{value}</span>
      <button className="tpb-counter-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} type="button" aria-label="Увеличить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tpb-field">
      <label className="tpb-label">{label}</label>
      {children}
    </div>
  );
}

const DEFAULT_FORM: FormState = {
  destination: 'turkey',
  customDestination: '',
  departureCity: 'Ташкент',
  month: new Date().getMonth() + 1,
  duration: 7,
  adults: 2,
  children: 0,
  budget: 'comfort',
  vibes: ['beach'],
  extraChips: [],
};

export default function TourPromptBuilder({ onSend, onClose }: { onSend?: (text: string) => void; onClose?: () => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [preview, setPreview] = useState('');
  const [expertHints, setExpertHints] = useState<string[]>([]);
  const [strategy, setStrategy] = useState('');
  const [polishing, setPolishing] = useState(false);
  const [edited, setEdited] = useState(false);

  const set = useCallback((key: keyof FormState, val: FormState[keyof FormState]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setEdited(false);
  }, []);

  const toggleVibe = useCallback((v: string) => {
    setForm(prev => {
      const vibes = prev.vibes.includes(v)
        ? prev.vibes.filter(x => x !== v)
        : [...prev.vibes, v];
      const validChips = getChips(vibes);
      const extraChips = prev.extraChips.filter(c => validChips.includes(c));
      return { ...prev, vibes, extraChips };
    });
    setEdited(false);
  }, []);

  const toggleChip = useCallback((chip: string) => {
    setForm(prev => {
      const extraChips = prev.extraChips.includes(chip)
        ? prev.extraChips.filter(c => c !== chip)
        : [...prev.extraChips, chip];
      return { ...prev, extraChips };
    });
    setEdited(false);
  }, []);

  const contextChips = useMemo(() => getChips(form.vibes), [form.vibes]);

  useEffect(() => {
    if (edited) return;
    setPreview(localBrief(form));

    const timer = setTimeout(() => {
      apiFetch('/api/desk/prompt-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: form.destination,
          custom_destination: form.customDestination,
          departure_city: form.departureCity,
          month: form.month,
          duration: form.duration,
          adults: form.adults,
          children: form.children,
          budget: form.budget,
          vibes: form.vibes,
          extra_chips: form.extraChips,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          setPreview(data.brief);
          setExpertHints(data.expert_hints ?? []);
          setStrategy(data.strategy ?? '');
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [form, edited]);

  const handlePolish = async () => {
    if (polishing || !preview) return;
    setPolishing(true);
    try {
      const resp = await apiFetch('/api/desk/prompt-builder/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: preview }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPreview(data.brief);
        setEdited(true);
      }
    } finally {
      setPolishing(false);
    }
  };

  const handleSend = () => {
    const text = preview.trim();
    if (!text) return;
    onSend?.(text);
    onClose?.();
  };

  return (
    <div className="tpb-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="tpb-modal" role="dialog" aria-modal="true" aria-label="Конструктор запроса">
        <div className="tpb-header">
          <div className="tpb-header-left">
            <div className="tpb-header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="tpb-header-title">Конструктор запроса</div>
              <div className="tpb-header-sub">Соберите параметры — MIRA составит подборку</div>
            </div>
          </div>
          <button className="tpb-close-btn" onClick={onClose} type="button" aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="tpb-body">
          <div className="tpb-fields">
            <Field label="Направление">
              <div className="tpb-dest-grid">
                {DESTINATIONS.map(d => (
                  <button key={d.value} type="button"
                    className={`tpb-dest-btn${form.destination === d.value ? ' active' : ''}${d.value === 'custom' ? ' tpb-dest-btn--custom' : ''}`}
                    onClick={() => set('destination', d.value)}>
                    {d.label}
                  </button>
                ))}
              </div>
              {form.destination === 'custom' && (
                <input className="tpb-custom-dest" type="text" placeholder="Введите направление…"
                  value={form.customDestination} onChange={e => set('customDestination', (e.target as HTMLInputElement).value)} autoFocus />
              )}
            </Field>

            <div className="tpb-row">
              <Field label="Город вылета">
                <select className="tpb-select" value={form.departureCity} onChange={e => set('departureCity', (e.target as HTMLSelectElement).value)}>
                  {DEPARTURE_CITIES.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </Field>
              <Field label="Месяц вылета">
                <select className="tpb-select" value={form.month} onChange={e => set('month', Number((e.target as HTMLSelectElement).value))}>
                  {MONTHS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                </select>
              </Field>
            </div>

            <div className="tpb-row">
              <Field label="Ночей">
                <div className="tpb-dur-group">
                  {DURATIONS.map(d => (
                    <button key={d} type="button" className={`tpb-dur-btn${form.duration === d ? ' active' : ''}`}
                      onClick={() => set('duration', d)}>{d}</button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="tpb-row">
              <Field label="Взрослые">
                <Counter value={form.adults} onChange={v => set('adults', v)} min={1} />
              </Field>
              <Field label="Дети">
                <Counter value={form.children} onChange={v => set('children', v)} />
              </Field>
            </div>

            <Field label="Бюджет">
              <div className="tpb-budget-group">
                {BUDGETS.map(b => (
                  <button key={b.value} type="button" className={`tpb-budget-btn${form.budget === b.value ? ' active' : ''}`}
                    onClick={() => set('budget', b.value)}>
                    <span className="tpb-budget-label">{b.label}</span>
                    <span className="tpb-budget-sub">{b.sub}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Тип отдыха">
              <div className="tpb-vibe-group">
                {VIBES.map(v => (
                  <button key={v.value} type="button" className={`tpb-vibe-tag${form.vibes.includes(v.value) ? ' active' : ''}`}
                    onClick={() => toggleVibe(v.value)}>
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>

            {contextChips.length > 0 && (
              <Field label="Дополнительно">
                <div className="tpb-chips-group">
                  {contextChips.map(chip => (
                    <button key={chip} type="button" className={`tpb-context-chip${form.extraChips.includes(chip) ? ' active' : ''}`}
                      onClick={() => toggleChip(chip)}>
                      {form.extraChips.includes(chip) && (
                        <svg className="tpb-chip-check" viewBox="0 0 12 10" width="10" height="8">
                          <path d="M1 5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {chip}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>

          <div className="tpb-preview-col">
            <div className="tpb-preview-header">
              <span className="tpb-preview-title">Черновик запроса</span>
              {preview && (<span className="tpb-preview-badge">Обновляется в реальном времени</span>)}
            </div>
            <textarea className="tpb-preview-area" value={preview}
              onChange={e => { setPreview((e.target as HTMLTextAreaElement).value); setEdited(true); }}
              placeholder="Запрос формируется автоматически по мере выбора параметров…" rows={8} />

            {expertHints.length > 0 && (
              <div className="tpb-expert-hints">
                <span className="tpb-expert-hints-icon" aria-hidden="true">💡</span>
                <div className="tpb-expert-hints-body">
                  {expertHints.map((h, i) => (<p key={i} className="tpb-expert-hint">{h}</p>))}
                </div>
              </div>
            )}

            {strategy && (
              <div className="tpb-strategy">
                <div className="tpb-strategy-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  Стратегия поиска
                </div>
                <p className="tpb-strategy-text">{strategy}</p>
              </div>
            )}

            <div className="tpb-preview-hint">Текст можно отредактировать перед отправкой</div>

            <div className="tpb-preview-actions">
              <button className="tpb-polish-btn" type="button" onClick={handlePolish} disabled={polishing || !preview}>
                {polishing ? (
                  <><span className="tpb-polish-spinner" aria-hidden="true" />Улучшаю…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M12 2l1.09 3.26L16.18 6l-2.45 2.44L14.36 12 12 10.28 9.64 12l.63-3.56L7.82 6l3.09-.74z"/>
                      <path d="M5 20l2-2m10 2l-2-2"/>
                    </svg>
                    AI Polish
                  </>
                )}
              </button>
              <button className="tpb-send-btn" type="button" onClick={handleSend} disabled={!preview}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Отправить в MIRA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
