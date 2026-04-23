// ============================================
// 공통 UI 컴포넌트
// ============================================

import React from 'react';
import { C } from '../config';
import { fmt } from '../utils';

export function StatCard({ label, value, color, icon, noWon, S }) {
  return (
    <div style={{ ...S.card, position:'relative', overflow:'hidden', padding:16 }}>
      <div style={{ position:'absolute', top:-8, right:-6, fontSize:38, opacity:0.07 }}>{icon}</div>
      <div style={{ fontSize:11, color:C.txd, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:17, fontWeight:700, color }}>{noWon ? value : `₩${fmt(value)}`}</div>
    </div>
  );
}

export function Badge({ children, color, S }) {
  return <span style={S.badge(color)}>{children}</span>;
}

export function DataTable({ columns, data, onDelete, emptyText = '데이터 없음', S }) {
  return (
    <div style={{ ...S.card, maxHeight:500, overflowY:'auto', overflowX:'auto' }}>
      <table style={S.tbl}>
        <thead><tr>
          {columns.map(c => <th key={c.key} style={{ ...S.th, width:c.width }}>{c.label}</th>)}
          {onDelete && <th style={{ ...S.th, width:36 }}></th>}
        </tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (onDelete ? 1 : 0)} style={{ ...S.td, textAlign:'center', color:C.txd, padding:26 }}>{emptyText}</td></tr>
          ) : data.map(row => (
            <tr key={row.id}>
              {columns.map(c => <td key={c.key} style={{ ...S.td, ...c.style }}>{c.render ? c.render(row) : (row[c.key] ?? '-')}</td>)}
              {onDelete && <td style={S.td}><button style={S.del} onClick={() => onDelete(row.id)} title="삭제">✕</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ options, value, onChange, S }) {
  return (
    <div style={{ display:'flex', gap:5, marginBottom:12, flexWrap:'wrap' }}>
      {options.map(o => <button key={o} onClick={() => onChange(o)} style={S.btnO(value === o)}>{o}</button>)}
    </div>
  );
}

export function SummaryBar({ label, amount, color = C.ac, S }) {
  return (
    <div style={{ ...S.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:14 }}>
      <span style={{ color:C.txd, fontSize:13 }}>{label}</span>
      <span style={{ fontSize:17, fontWeight:700, color }}>₩{fmt(amount)}</span>
    </div>
  );
}

export function FormGrid({ cols = 3, children }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:10 }}>{children}</div>;
}

export function PageTitle({ children }) {
  return <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>{children}</h2>;
}

export function NoteBox({ children, S }) {
  return <div style={S.note}>{children}</div>;
}

export function StatGrid({ cols = 4, children }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, marginBottom:14 }}>{children}</div>;
}

export function StatRow2({ left, right }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>{left}{right}</div>;
}

export function BarItem({ label, value, maxValue, color = C.ac }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
        <span style={{ color:C.txd }}>{label}</span>
        <span style={{ fontWeight:600 }}>₩{fmt(value)}</span>
      </div>
      <div style={{ height:5, background:C.sf3, borderRadius:3 }}>
        <div style={{ height:5, borderRadius:3, background:color, width:`${pct}%`, transition:'width 0.3s' }} />
      </div>
    </div>
  );
}

// 날짜 범위 필터 (모든 페이지에서 재사용)
export function DateRangeFilter({ from, to, onFromChange, onToChange, onReset, S }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
      <span style={{ fontSize:12, color:C.txd }}>기간:</span>
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)} style={{ ...S.inp, width:'auto', padding:'6px 10px', fontSize:12 }} />
      <span style={{ fontSize:12, color:C.txm }}>~</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)} style={{ ...S.inp, width:'auto', padding:'6px 10px', fontSize:12 }} />
      {onReset && <button onClick={onReset} style={{ background:'none', border:`1px solid ${C.bd}`, borderRadius:6, padding:'5px 10px', color:C.txd, cursor:'pointer', fontSize:11 }}>전체</button>}
    </div>
  );
}

// 날짜 범위로 배열 필터
export function filterDateRange(arr, from, to, field = 'date') {
  return arr.filter(i => {
    const d = i[field] || '';
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

// 엑셀 내보내기 버튼
export function ExportBtn({ onClick, label = '엑셀 다운로드', S }) {
  return (
    <button onClick={onClick} style={{ ...S.btn, background:C.ok, padding:'7px 14px', fontSize:12 }}>
      📥 {label}
    </button>
  );
}

// 즐겨찾기 버튼
export function FavBtn({ onClick, S }) {
  return (
    <button onClick={onClick} style={{ ...S.btn, background:C.yel, padding:'7px 14px', fontSize:12 }}>
      ⭐ 즐겨찾기에서 불러오기
    </button>
  );
}
