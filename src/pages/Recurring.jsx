import React, { useState } from 'react';
import { C, REC_TYPES, REC_CYCLES, PAY_METHODS } from '../config';
import { fmt, today, toMonthly, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, SummaryBar, Badge, StatRow2, ExportBtn } from '../components/ui';

export default function Recurring({ data, add, remove, update, S }) {
  const { recurring: items } = data;
  const [f, sF] = useState({ name:'', type:'구독서비스', cycle:'매월', amount:'', pay_method:'법인카드', next_date:today(), memo:'' });

  const submit = async () => {
    if (!f.name || !f.amount) return alert('서비스명과 금액을 입력해주세요');
    if (await add('recurring', { ...f, amount:Number(f.amount), active:true }))
      sF({ name:'', type:'구독서비스', cycle:'매월', amount:'', pay_method:'법인카드', next_date:today(), memo:'' });
  };

  const monthly = items.filter(r => r.active !== false).reduce((s, r) => s + toMonthly(r.amount, r.cycle), 0);

  const cols = [
    { key:'active', label:'상태', render:r => <button onClick={() => update('recurring',r.id,{active:r.active===false})} style={{background:'none',border:'none',cursor:'pointer',fontSize:14}}>{r.active!==false?'✅':'⏸️'}</button> },
    { key:'name', label:'서비스명', style:{fontWeight:600} },
    { key:'type', label:'유형', render:r => <Badge color={C.pink} S={S}>{r.type}</Badge> },
    { key:'cycle', label:'주기' },
    { key:'pay_method', label:'결제수단' },
    { key:'amount', label:'금액', style:{fontWeight:600,color:C.warn}, render:r => `₩${fmt(r.amount)}` },
    { key:'next_date', label:'다음결제일' },
  ];

  return (
    <div>
      <PageTitle>정기 지출 관리</PageTitle>
      <NoteBox S={S}>구독 · 임대료 · 보험 · 통신비 · 공과금 · 대출이자 등 반복 고정 지출</NoteBox>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>정기지출 등록</div><ExportBtn onClick={() => exportToExcel(items,'정기지출','정기지출')} S={S} /></div>
        <FormGrid cols={4}>
          <input style={S.inp} placeholder="서비스명*" value={f.name} onChange={e => sF({...f,name:e.target.value})} />
          <select style={S.sel} value={f.type} onChange={e => sF({...f,type:e.target.value})}>{REC_TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <select style={S.sel} value={f.cycle} onChange={e => sF({...f,cycle:e.target.value})}>{REC_CYCLES.map(c => <option key={c}>{c}</option>)}</select>
          <input style={S.inp} type="number" placeholder="금액(원)*" value={f.amount} onChange={e => sF({...f,amount:e.target.value})} />
        </FormGrid>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,marginTop:10}}>
          <select style={S.sel} value={f.pay_method} onChange={e => sF({...f,pay_method:e.target.value})}>{PAY_METHODS.map(p => <option key={p}>{p}</option>)}</select>
          <input style={S.inp} type="date" value={f.next_date} onChange={e => sF({...f,next_date:e.target.value})} />
          <input style={S.inp} placeholder="메모" value={f.memo} onChange={e => sF({...f,memo:e.target.value})} />
          <button style={S.btn} onClick={submit}>등록</button>
        </div>
      </div>
      <StatRow2 left={<SummaryBar label="월 고정지출" amount={monthly} color={C.pink} S={S} />} right={<SummaryBar label="연간 예상" amount={monthly*12} color={C.warn} S={S} />} />
      <DataTable columns={cols} data={items} onDelete={id => remove('recurring',id)} emptyText="정기지출 없음" S={S} />
    </div>
  );
}
