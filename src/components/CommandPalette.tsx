"use client";

import { useEffect, useMemo, useRef, useState, useId } from "react";
import "./CommandPalette.css";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  client_info?: {
    name?: string;
    phone?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function normalize(s: string) {
  return s.toLocaleLowerCase("ru");
}

function formatWhen(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172_800_000) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export default function CommandPalette({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return conversations.slice(0, 50);
    return conversations
      .filter((c) => {
        if (normalize(c.title || "").includes(q)) return true;
        const n = c.client_info?.name ? normalize(c.client_info.name) : "";
        if (n.includes(q)) return true;
        const p = c.client_info?.phone ? c.client_info.phone.replace(/\D/g, "") : "";
        const qDigits = q.replace(/\D/g, "");
        if (qDigits && p.includes(qDigits)) return true;
        return false;
      })
      .slice(0, 50);
  }, [conversations, query]);

  const items = useMemo(
    () => [{ type: "new" as const }, ...results.map((r) => ({ type: "conv" as const, conv: r }))],
    [results],
  );

  useEffect(() => {
    if (cursor >= items.length) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  useEffect(() => {
    if (!isOpen) return;
    const active = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${cursor}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [cursor, isOpen]);

  if (!isOpen) return null;

  const commit = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    if (item.type === "new") {
      onNewChat();
    } else {
      onSelect(item.conv.id);
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setCursor(items.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commit(cursor);
      return;
    }
  };

  return (
    <div className="cp-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="cp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <span id={titleId} className="cp-sr-only">
          Быстрый поиск по беседам
        </span>
        <div className="cp-input-row">
          <svg
            className="cp-search-icon"
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Поиск по беседам, именам, телефонам…"
            aria-label="Поиск по беседам"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cp-kbd cp-kbd--close" aria-hidden="true">
            Esc
          </kbd>
        </div>

        {items.length === 1 && query.trim() ? (
          <div className="cp-empty">Ничего не нашли по запросу «{query}»</div>
        ) : null}

        <ul ref={listRef} className="cp-list" role="listbox">
          {items.map((item, idx) => {
            const isActive = idx === cursor;
            if (item.type === "new") {
              return (
                <li
                  key="new"
                  data-idx={idx}
                  role="option"
                  aria-selected={isActive}
                  className={`cp-item cp-item--new${isActive ? " cp-item--active" : ""}`}
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => commit(idx)}
                >
                  <span className="cp-item-icon" aria-hidden="true">+</span>
                  <span className="cp-item-body">
                    <span className="cp-item-title">Новая беседа</span>
                    <span className="cp-item-hint">Начать новый поиск</span>
                  </span>
                  <kbd className="cp-kbd" aria-hidden="true">↵</kbd>
                </li>
              );
            }
            const conv = item.conv;
            const title = conv.title || "Без названия";
            const client = conv.client_info?.name || conv.client_info?.phone || null;
            const isCurrent = conv.id === activeId;
            return (
              <li
                key={conv.id}
                data-idx={idx}
                role="option"
                aria-selected={isActive}
                className={`cp-item${isActive ? " cp-item--active" : ""}${isCurrent ? " cp-item--current" : ""}`}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => commit(idx)}
              >
                <span className="cp-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 4h10v7H6l-3 3V4z" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="cp-item-body">
                  <span className="cp-item-title">{title}</span>
                  <span className="cp-item-hint">
                    {client ? <span className="cp-item-client">{client} · </span> : null}
                    {formatWhen(conv.updated_at)}
                    {isCurrent ? <span className="cp-item-current-tag"> · текущая</span> : null}
                  </span>
                </span>
                {isActive ? <kbd className="cp-kbd" aria-hidden="true">↵</kbd> : null}
              </li>
            );
          })}
        </ul>

        <div className="cp-footer">
          <span>
            <kbd className="cp-kbd">↑</kbd>
            <kbd className="cp-kbd">↓</kbd> навигация
          </span>
          <span>
            <kbd className="cp-kbd">↵</kbd> выбрать
          </span>
          <span>
            <kbd className="cp-kbd">Esc</kbd> закрыть
          </span>
        </div>
      </div>
    </div>
  );
}
