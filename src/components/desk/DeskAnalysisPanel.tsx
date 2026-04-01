// src/components/desk/DeskAnalysisPanel.tsx
"use client";

import { useState } from "react";
import "./DeskAnalysisPanel.css";

const SLOT_CONFIG = {
  'лучший выбор':     { label: 'Ценность', emoji: '⭐', cls: 'value' },
  'самый дешёвый':    { label: 'Цена',     emoji: '💰', cls: 'budget' },
  'лучший рейтинг':   { label: 'Рейтинг',  emoji: '🏆', cls: 'luxury' },
  'ближайший к морю': { label: 'Море',     emoji: '🏖️', cls: 'beach' },
};

function getSlotCfg(raw) {
  return SLOT_CONFIG[raw.toLowerCase().replace(/[\[\]]/g, '').trim()] ?? null;
}

function splitFlag(desc) {
  const m = desc.match(/^(.*?)\.?\s*Красный флаг[：:]\s*(.+)$/is);
  if (m) return { main: m[1].replace(/\.\s*$/, '').trim(), flag: m[2].trim() };
  return { main: desc, flag: null };
}

function inlineNodes(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

const SLOT_RE       = /^\[([^\]]+)\]\s+([^:：]+)[：:]\s*(.*)/;
const COMPARISON_RE = /^Сравнение[：:]\s*(.*)/i;
const REC_RE        = /^\*\*Рекомендация:\*\*\s*/i;
const ACTIONS_RE    = /^\*\*Что можно сделать/i;

function parseToBlocks(raw) {
  const lines = raw.split('\n');
  const blocks = [];
  let listBuf = [];
  let inActions = false;
  let tableRows = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ type: inActions ? 'actions-list' : 'list', items: [...listBuf] });
    listBuf = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter(Boolean);
    if (rows.length) blocks.push({ type: 'table', rows });
    tableRows = [];
  };

  for (const line of lines) {
    const t = line.trim();

    if (t.startsWith('|') && t.endsWith('|')) {
      flushList();
      const cells = t.slice(1, -1).split('|').map(c => c.trim());
      tableRows.push(cells.every(c => /^[-:]+$/.test(c)) ? null : cells);
      continue;
    }
    flushTable();

    const slotM = t.match(SLOT_RE);
    if (slotM) {
      const cfg = getSlotCfg(slotM[1]);
      if (cfg) {
        flushList();
        const { main, flag } = splitFlag(slotM[3]);
        blocks.push({ type: 'slot', cfg, hotel: slotM[2].trim(), main, flag });
        inActions = false;
        continue;
      }
    }

    const compM = t.match(COMPARISON_RE);
    if (compM) { flushList(); blocks.push({ type: 'comparison', text: compM[1] }); inActions = false; continue; }

    if (REC_RE.test(t)) { flushList(); blocks.push({ type: 'rec', text: t.replace(REC_RE, '') }); inActions = false; continue; }

    if (ACTIONS_RE.test(t)) { flushList(); blocks.push({ type: 'actions-heading' }); inActions = true; continue; }

    if (/^#{1,3}\s/.test(t)) { flushList(); blocks.push({ type: 'heading', text: t.replace(/^#+\s/, '') }); inActions = false; continue; }

    if (/^[-*]\s/.test(t)) { listBuf.push(t.slice(2)); continue; }

    if (!t) { flushList(); continue; }

    if (t.startsWith('⚠️') || t.startsWith('⚠')) { flushList(); blocks.push({ type: 'warning', text: t }); inActions = false; continue; }

    flushList();
    blocks.push({ type: 'paragraph', text: t });
    inActions = false;
  }

  flushList();
  flushTable();
  return blocks;
}

function SlotCard({ block }) {
  const { cfg, hotel, main, flag } = block;
  return (
    <div className={`dap-slot-card dap-slot-card--${cfg.cls}`}>
      <div className="dap-slot-card-head">
        <span className="dap-slot-emoji" aria-hidden="true">{cfg.emoji}</span>
        <span className="dap-slot-label">{cfg.label}</span>
      </div>
      <div className="dap-slot-hotel">{hotel}</div>
      <p className="dap-slot-desc">{main}</p>
      {flag && (
        <div className="dap-slot-flag">
          <span aria-hidden="true">🚩</span>
          <span>{flag}</span>
        </div>
      )}
    </div>
  );
}

function ComparisonBlock({ text }) {
  return (
    <div className="dap-comparison">
      <span className="dap-comparison-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
          <path d="M18 3l3 3-3 3"/><path d="M21 6H3"/>
          <path d="M6 21l-3-3 3-3"/><path d="M3 18h18"/>
        </svg>
        Сравнение
      </span>
      <p className="dap-comparison-text">{inlineNodes(text)}</p>
    </div>
  );
}

function RecCallout({ text }) {
  return (
    <div className="dap-rec-callout">
      <span className="dap-rec-label">👑 Рекомендация</span>
      <p className="dap-rec-body">{inlineNodes(text)}</p>
    </div>
  );
}

function TableBlock({ rows }) {
  if (rows.length < 2) return null;
  const [headers, ...body] = rows;
  const slotIdx = headers.findIndex(h => /^слот$/i.test(h));
  const narrowCols = new Set(
    headers.map((h, i) => /звезд|рейтинг|цена|stars?|rating|price|море/i.test(h) ? i : -1).filter(i => i >= 0)
  );

  return (
    <div className="dap-table-wrap">
      <table className="dap-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className={narrowCols.has(i) ? 'dap-th-narrow' : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((cells, ri) => (
            <tr key={ri}>
              {cells.map((c, ci) => {
                if (ci === slotIdx) {
                  const cfg = getSlotCfg(c);
                  return (
                    <td key={ci} className="dap-td-slot">
                      {cfg ? <span className={`dap-slot-chip dap-slot-chip--${cfg.cls}`}>{cfg.label}</span> : c}
                    </td>
                  );
                }
                return <td key={ci} className={narrowCols.has(ci) ? 'dap-td-narrow' : ''}>{inlineNodes(c)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlocks(blocks) {
  const out = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === 'slot') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'slot') group.push(blocks[i++]);
      out.push(
        <div key={`sg${i}`} className="dap-slot-grid">
          {group.map((s, j) => <SlotCard key={j} block={s} />)}
        </div>
      );
      continue;
    }

    if (b.type === 'comparison') out.push(<ComparisonBlock key={i} text={b.text} />);
    else if (b.type === 'rec') out.push(<RecCallout key={i} text={b.text} />);
    else if (b.type === 'warning') out.push(<p key={i} className="dap-warning">{inlineNodes(b.text)}</p>);
    else if (b.type === 'actions-heading') {
      out.push(
        <div key={i} className="dap-actions-heading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" width="13" height="13">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Что можно сделать
        </div>
      );
    }
    else if (b.type === 'actions-list') {
      out.push(
        <ul key={i} className="dap-actions-list">
          {b.items.map((item, j) => <li key={j} className="dap-actions-item">{inlineNodes(item)}</li>)}
        </ul>
      );
    }
    else if (b.type === 'list') {
      out.push(
        <ul key={i} className="dap-list">
          {b.items.map((item, j) => <li key={j}>{inlineNodes(item)}</li>)}
        </ul>
      );
    }
    else if (b.type === 'heading') out.push(<h3 key={i} className="dap-h3">{inlineNodes(b.text)}</h3>);
    else if (b.type === 'table') out.push(<TableBlock key={i} rows={b.rows} />);
    else if (b.type === 'paragraph') out.push(<p key={i} className="dap-p">{inlineNodes(b.text)}</p>);

    i++;
  }

  return out;
}

const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width="14" height="14"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const AnalysisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export function splitAnalysis(raw) {
  if (!raw) return { verdict: '', details: '' };
  const idx = raw.indexOf('\n---\n');
  if (idx === -1) {
    const idx2 = raw.indexOf('\n---');
    if (idx2 === -1) return { verdict: raw.trim(), details: '' };
    return { verdict: raw.slice(0, idx2).trim(), details: raw.slice(idx2 + 4).trim() };
  }
  return { verdict: raw.slice(0, idx).trim(), details: raw.slice(idx + 5).trim() };
}

export default function DeskAnalysisPanel({ text, fromCache, totalFound }) {
  const [open, setOpen] = useState(false);
  const { details } = splitAnalysis(text);
  if (!details) return null;

  const blocks = parseToBlocks(details);
  const rec = blocks.find(b => b.type === 'rec');
  const recPreview = rec
    ? (rec.text.replace(/\*\*/g, '').trim().slice(0, 85) + (rec.text.length > 85 ? '...' : ''))
    : null;

  return (
    <div className={`dap-root${open ? ' dap-root--open' : ''}`}>
      <button className="dap-header" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className="dap-header-left">
          <span className="dap-header-icon"><AnalysisIcon /></span>
          <span className="dap-header-label">Подробный разбор</span>
          {totalFound > 0 && <span className="dap-meta-count">{totalFound} вар.</span>}
          {fromCache && <span className="dap-cache-badge">кэш</span>}
        </span>
        <span className="dap-header-right">
          {!open && recPreview && <span className="dap-header-preview">{recPreview}</span>}
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div className="dap-body">{renderBlocks(blocks)}</div>}
    </div>
  );
}
