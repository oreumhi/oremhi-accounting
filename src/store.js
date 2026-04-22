// ============================================
// 데이터 저장소 (Supabase + localStorage 폴백)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { uid } from './utils';

// ─── Supabase 설정 ───
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasSB = url && key && !url.includes('your-project');
export const sb = hasSB ? createClient(url, key) : null;

// ─── 테이블 설정 ───
const TABLES = {
  revenue:     'revenue',
  expenses:    'expenses',
  recurring:   'recurring',
  bank:        'bank_transactions',
  clients:     'clients',
  taxInvoices: 'tax_invoices',
  payroll:     'payroll',
  contracts:   'contracts',
  documents:   'documents',
  notes:       'notes',
  budgets:     'budgets',
  favorites:   'favorites',
};

// ─── CRUD 함수 ───
async function fetchAll(table) {
  if (sb) {
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: true });
    if (error) { console.error(`[${table}] 조회:`, error.message); return []; }
    return data || [];
  }
  try { const r = localStorage.getItem(`oh_${table}`); return r ? JSON.parse(r) : []; } catch { return []; }
}

async function insertItem(table, item) {
  if (sb) {
    const { data, error } = await sb.from(table).insert(item).select().single();
    if (error) { console.error(`[${table}] 추가:`, error.message); return null; }
    return data;
  }
  try {
    const items = await fetchAll(table);
    items.push({ ...item, created_at: new Date().toISOString() });
    localStorage.setItem(`oh_${table}`, JSON.stringify(items));
    return item;
  } catch { return null; }
}

async function deleteItem(table, id) {
  if (sb) {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) { console.error(`[${table}] 삭제:`, error.message); return false; }
    return true;
  }
  try {
    const items = (await fetchAll(table)).filter(i => i.id !== id);
    localStorage.setItem(`oh_${table}`, JSON.stringify(items));
    return true;
  } catch { return false; }
}

async function updateItem(table, id, updates) {
  if (sb) {
    const { error } = await sb.from(table).update(updates).eq('id', id);
    if (error) { console.error(`[${table}] 수정:`, error.message); return false; }
    return true;
  }
  try {
    const items = (await fetchAll(table)).map(i => i.id === id ? { ...i, ...updates } : i);
    localStorage.setItem(`oh_${table}`, JSON.stringify(items));
    return true;
  } catch { return false; }
}

// ─── 이미지 업로드 (영수증) ───
export async function uploadImage(file) {
  if (!sb) return null;
  const ext = file.name.split('.').pop();
  const path = `receipts/${uid()}.${ext}`;
  const { error } = await sb.storage.from('receipts').upload(path, file);
  if (error) { console.error('이미지 업로드:', error.message); return null; }
  const { data } = sb.storage.from('receipts').getPublicUrl(path);
  return data?.publicUrl || null;
}

// ─── 앱 설정 (PIN, 글자크기) ───
export async function loadSettings() {
  if (sb) {
    const { data } = await sb.from('app_settings').select('*').eq('id', 'main').single();
    return data || { pin_hash: null, font_size: 'medium' };
  }
  try { const r = localStorage.getItem('oh_settings'); return r ? JSON.parse(r) : { pin_hash: null, font_size: 'medium' }; } catch { return { pin_hash: null, font_size: 'medium' }; }
}

export async function saveSettings(updates) {
  if (sb) {
    await sb.from('app_settings').update(updates).eq('id', 'main');
  } else {
    const cur = await loadSettings();
    localStorage.setItem('oh_settings', JSON.stringify({ ...cur, ...updates }));
  }
}

// ─── 데이터 백업 (JSON) ───
export async function exportBackup(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `오름히_백업_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch { reject(new Error('잘못된 백업 파일입니다')); }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}

// ─── 중앙 데이터 관리 훅 ───
export function useStore() {
  const [data, setData] = useState(() => {
    const init = {};
    Object.keys(TABLES).forEach(k => { init[k] = []; });
    return init;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entries = Object.entries(TABLES);
        const results = await Promise.all(entries.map(([, t]) => fetchAll(t)));
        if (!mounted) return;
        const d = {};
        entries.forEach(([k], i) => { d[k] = results[i] || []; });
        setData(d);
      } catch (e) { console.error('로드 실패:', e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const add = useCallback(async (key, item) => {
    const t = TABLES[key];
    if (!t) return false;
    const newItem = { ...item, id: uid() };
    const r = await insertItem(t, newItem);
    if (r) { setData(p => ({ ...p, [key]: [...p[key], newItem] })); return true; }
    return false;
  }, []);

  const remove = useCallback(async (key, id) => {
    const t = TABLES[key];
    if (!t) return false;
    if (await deleteItem(t, id)) { setData(p => ({ ...p, [key]: p[key].filter(i => i.id !== id) })); return true; }
    return false;
  }, []);

  const update = useCallback(async (key, id, updates) => {
    const t = TABLES[key];
    if (!t) return false;
    if (await updateItem(t, id, updates)) { setData(p => ({ ...p, [key]: p[key].map(i => i.id === id ? { ...i, ...updates } : i) })); return true; }
    return false;
  }, []);

  // 백업 복원
  const restoreBackup = useCallback(async (backupData) => {
    for (const [key, table] of Object.entries(TABLES)) {
      if (backupData[key] && Array.isArray(backupData[key])) {
        for (const item of backupData[key]) {
          await insertItem(table, item);
        }
      }
    }
    // 다시 로드
    const entries = Object.entries(TABLES);
    const results = await Promise.all(entries.map(([, t]) => fetchAll(t)));
    const d = {};
    entries.forEach(([k], i) => { d[k] = results[i] || []; });
    setData(d);
  }, []);

  // 일괄 등록 (거래내역 업로드용)
  const addBulk = useCallback(async (key, items) => {
    const t = TABLES[key];
    if (!t || !items.length) return { success: 0, fail: 0 };
    let success = 0, fail = 0;
    const newItems = [];
    for (const item of items) {
      const newItem = { ...item, id: uid() };
      const r = await insertItem(t, newItem);
      if (r) { newItems.push(newItem); success++; }
      else { fail++; }
    }
    if (newItems.length > 0) {
      setData(p => ({ ...p, [key]: [...p[key], ...newItems] }));
    }
    return { success, fail };
  }, []);

  return { data, loading, add, addBulk, remove, update, restoreBackup };
}
