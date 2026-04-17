// src/components/Sidebar.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/index';
import './Sidebar.css';

function formatDate(ts: string, t: (key: string) => string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return t('sidebar.yesterday');
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function MiniRing({ credits, max }: { credits: number; max: number }) {
  const R = 10;
  const SIZE = 28;
  const C = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, credits / max));
  const offset = circumference * (1 - pct);
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="sidebar-mini-ring" aria-hidden="true">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#1f2937" strokeWidth="3" />
      <circle cx={C} cy={C} r={R} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${C} ${C})`} className="sidebar-mini-ring-fill" />
    </svg>
  );
}

const DotsIcon = () => (
  <svg viewBox="0 0 16 4" width="13" height="4" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13"/>
  </svg>
);

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  client_info?: {
    name?: string;
    phone?: string;
  };
}

interface Profile {
  full_name: string;
  credits_limit?: number;
  credits_used?: number;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  profile: Profile | null;
  activeView: string;
  onViewChange: (view: string) => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  onOpenSearch?: () => void;
}

export default function Sidebar({ conversations, activeId, onNewChat, onSelect, onRename, onDelete, profile, activeView, onViewChange, isSidebarOpen = false, setIsSidebarOpen, onOpenSearch }: SidebarProps) {
  const { t } = useI18n();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close drawer with Escape, trap focus inside, restore focus on close (mobile only).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
    if (!isMobile || !isSidebarOpen) return;

    previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null;

    // Move focus into the sidebar
    const aside = asideRef.current;
    if (aside) {
      const firstFocusable = aside.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSidebarOpen?.(false);
        return;
      }
      if (e.key === 'Tab' && aside) {
        const focusables = Array.from(
          aside.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if it is inside the aside (i.e. drawer was actually trapping)
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch { /* noop */ }
      }
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  const openMenu = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setMenuOpenId(prev => prev === id ? null : id); };
  const startEdit = (e: React.MouseEvent, conv: Conversation) => { e.stopPropagation(); setMenuOpenId(null); setEditingId(conv.id); setEditValue(conv.title); };
  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversations.find(c => c.id === editingId)?.title) onRename?.(editingId, trimmed);
    setEditingId(null); setEditValue('');
  };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const closeIfMobile = () => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 767.98px)').matches) {
      setIsSidebarOpen?.(false);
    }
  };

  const handleSelectWithClose = (id: string) => {
    onSelect(id);
    closeIfMobile();
  };

  const handleNewChatWithClose = () => {
    onNewChat();
    closeIfMobile();
  };

  const handleViewChangeWithClose = (view: string) => {
    onViewChange(view);
    closeIfMobile();
  };

  return (
    <>
      <div
        className={`sidebar-mobile-backdrop${isSidebarOpen ? ' open' : ''}`}
        onClick={() => setIsSidebarOpen?.(false)}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className={`sidebar${isSidebarOpen ? ' sidebar--open' : ''}`}
        role="navigation"
        aria-label="Главное меню"
      >
        <button
          className="sidebar-close-btn"
          onClick={() => setIsSidebarOpen?.(false)}
          aria-label="Закрыть меню"
          type="button"
        >
          <CloseIcon />
        </button>
        {menuOpenId && <div className="sidebar-backdrop" onClick={() => setMenuOpenId(null)} aria-hidden="true" />}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/welgo-logo2.png" alt="Welgo" className="sidebar-logo-img" />
            <span>Desk</span>
          </div>
          <div className="sidebar-tagline">{t('auth.agent_mode')}</div>
        </div>

        <button className="sidebar-new-btn" onClick={handleNewChatWithClose}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          {t('sidebar.new_chat')}
        </button>

        {onOpenSearch && (
          <button className="sidebar-search-btn" onClick={onOpenSearch} aria-label="Поиск по беседам">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3.5 3.5" strokeLinecap="round" />
            </svg>
            <span className="sidebar-search-label">Поиск</span>
            <span className="sidebar-search-kbd" aria-hidden="true">
              <kbd>{typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl'}</kbd>
              <kbd>K</kbd>
            </span>
          </button>
        )}

        <div className="sidebar-section-label">{t('sidebar.history')}</div>
        <div className="sidebar-list">
          {conversations.length === 0 ? (
            <div className="sidebar-empty">{t('sidebar.empty')}</div>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                className={`sidebar-item${c.id === activeId ? ' active' : ''}`}
                onClick={() => editingId !== c.id && handleSelectWithClose(c.id)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && editingId !== c.id && handleSelectWithClose(c.id)}
              >
                <div className="sidebar-item-body">
                  {editingId === c.id ? (
                    <input ref={editInputRef} className="sidebar-item-title-input" value={editValue}
                      onChange={e => setEditValue(e.target.value)} onKeyDown={handleEditKeyDown}
                      onBlur={commitEdit} onClick={e => e.stopPropagation()} maxLength={120}
                      aria-label={t('sidebar.rename')} />
                  ) : (
                    <div className="sidebar-item-title">{c.title}</div>
                  )}
                  {(c.client_info?.name || c.client_info?.phone) && (
                    <div className="sidebar-client-tag">{[c.client_info.name, c.client_info.phone].filter(Boolean).join(' · ')}</div>
                  )}
                  <div className="sidebar-item-date">{formatDate(c.updated_at, t)}</div>
                </div>
                {editingId !== c.id && (
                  <div className="sidebar-item-actions">
                    <button className="sidebar-item-menu-btn" onClick={e => openMenu(e, c.id)} aria-label="Actions" aria-expanded={menuOpenId === c.id} tabIndex={-1}><DotsIcon /></button>
                    {menuOpenId === c.id && (
                      <div className="sidebar-item-menu" role="menu">
                        <button className="sidebar-item-menu-item" role="menuitem" onClick={e => startEdit(e, c)}><PencilIcon />{t('sidebar.rename')}</button>
                        <button className="sidebar-item-menu-item sidebar-item-menu-item--danger" role="menuitem" onClick={e => { e.stopPropagation(); setMenuOpenId(null); onDelete(c.id); }}><TrashIcon />{t('sidebar.delete')}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {profile && (
          <button
            className={`sidebar-profile-btn${activeView === 'profile' ? ' active' : ''}`}
            onClick={() => handleViewChangeWithClose(activeView === 'profile' ? 'desk' : 'profile')}
          >
            <div className="sidebar-profile-avatar">{getInitials(profile.full_name)}</div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">{profile.full_name}</div>
              <div className="sidebar-profile-credits">
                {((profile.credits_limit ?? 300) - (profile.credits_used ?? 0)).toLocaleString('ru')}
                <span className="sidebar-profile-credits-sep">/</span>
                {(profile.credits_limit ?? 300).toLocaleString('ru')}
              </div>
            </div>
            <div className="sidebar-profile-right">
              <MiniRing credits={(profile.credits_limit ?? 300) - (profile.credits_used ?? 0)} max={profile.credits_limit ?? 300} />
            </div>
          </button>
        )}
      </aside>
    </>
  );
}
