import React, { useState } from 'react';
import { C, EXP_CATS } from '../config';
import { fmt, thisMonth, filterMonth } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, Badge } from '../components/ui';

export default function Budget({ data, add, remove, update, S }) {
  const { budgets, expenses } = data;
  const [f, sF] = useState({ category:'식대', monthly_limit:'' });
  const m = thisMonth();

  const submit = async () => {
    if (!f.monthly_limit) return alert('예산 금액을 입력해주세요');
    if (budgets.find(b => b.category === f.category)) return alert('이미 등록된 카테고리입니다');
    if (await add('budgets', { ...f, monthly_limit:Number(f.monthly_limit), active:true }))
      sF({ category:'식대', monthly_limit:'' });
  };

  // 이번달 카테고리별 지출
  const monthExp = {};
  filterMonth(expenses, m).forEach(e => { monthExp[e.category] = (monthExp[e.category] || 0) + Number(e.amount); });

  const cols = [
    { key:'active', label:'상태', render:r => <button onClick={() => update('budgets',r.id,{active:r.active===false})} style={{background:'none',border:'none',cursor:'pointer',fontSize:14}}>{r.active!==false?'✅':'⏸️'}</button> },
    { key:'category', label:'카테고리', style:{fontWeight:600} },
    { key:'monthly_limit', label:'월 예산', style:{fontWeight:600}, render:r => `₩${fmt(r.monthly_limit)}` },
    { key:'spent', label:'이번달 사용', render:r => {
      const spent = monthExp[r.category] || 0;
      const pct = r.monthly_limit > 0 ? (spent / r.monthly_limit) * 100 : 0;
      return <span style={{color:pct>=100?C.no:pct>=80?C.warn:C.ok,fontWeight:600}}>₩{fmt(spent)}</span>;
    }},
    { key:'progress', label:'사용률', render:r => {
      const spent = monthExp[r.category] || 0;
      const pct = r.monthly_limit > 0 ? Math.min((spent / r.monthly_limit) * 100, 100) : 0;
      const color = pct >= 100 ? C.no : pct >= 80 ? C.warn : C.ok;
      return (
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{flex:1,height:8,background:C.sf3,borderRadius:4,minWidth:60}}>
            <div style={{height:8,borderRadius:4,background:color,width:`${pct}%`,transition:'width 0.3s'}} />
          </div>
          <span style={{fontSize:11,fontWeight:600,color,minWidth:40}}>{Math.round(pct)}%</span>
        </div>
      );
    }},
    { key:'remain', label:'잔여', render:r => {
      const remain = (Number(r.monthly_limit) || 0) - (monthExp[r.category] || 0);
      return <span style={{fontWeight:600,color:remain>=0?C.ok:C.no}}>₩{fmt(remain)}</span>;
    }},
  ];

  return (
    <div>
      <PageTitle>예산 관리</PageTitle>
      <NoteBox S={S}>카테고리별 월 예산 설정 → 80% 초과 시 대시보드 경고 · 100% 초과 시 빨간색 표시</NoteBox>

      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>예산 등록</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10}}>
          <select style={S.sel} value={f.category} onChange={e => sF({...f,category:e.target.value})}>
            {EXP_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input style={S.inp} type="number" placeholder="월 예산 (원)" value={f.monthly_limit} onChange={e => sF({...f,monthly_limit:e.target.value})} />
          <button style={S.btn} onClick={submit}>등록</button>
        </div>
      </div>

      <div style={{...S.card,display:'flex',justifyContent:'space-between',padding:14,marginBottom:14}}>
        <span style={{color:C.txd}}>📅 기준: {m} (이번달)</span>
        <span style={{color:C.txd}}>등록 예산 {budgets.length}개</span>
      </div>

      <DataTable columns={cols} data={budgets} onDelete={id => remove('budgets',id)} emptyText="등록된 예산이 없습니다" S={S} />
    </div>
  );
}
