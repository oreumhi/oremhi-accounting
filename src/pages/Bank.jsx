import React, { useState } from 'react';
import { C } from '../config';
import { fmt, today, sumBy, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, SummaryBar, FilterBar, Badge, StatRow2, ExportBtn } from '../components/ui';

export default function Bank({ data, add, remove, S }) {
  const { bank: items } = data;
  const [f, sF] = useState({ date:today(), bank_name:'', type:'입금', amount:'', description:'', balance:'', memo:'' });
  const [fil, sFil] = useState('전체');

  const submit = async () => {
    if (!f.amount) return alert('금액을 입력해주세요');
    if (await add('bank', { ...f, amount:Number(f.amount), balance:f.balance?Number(f.balance):0 }))
      sF({ ...f, amount:'', description:'', balance:'', memo:'' });
  };

  const banks = [...new Set(items.map(i => i.bank_name).filter(Boolean))];
  const filtered = fil === '전체' ? items : items.filter(i => i.bank_name === fil);

  const cols = [
    { key:'date', label:'날짜' },
    { key:'bank_name', label:'은행', style:{fontWeight:500} },
    { key:'type', label:'유형', render:r => <Badge color={r.type==='입금'?C.ok:C.no} S={S}>{r.type}</Badge> },
    { key:'description', label:'적요' },
    { key:'amount', label:'금액', render:r => <span style={{fontWeight:600,color:r.type==='입금'?C.ok:C.no}}>₩{fmt(r.amount)}</span> },
    { key:'balance', label:'잔액', style:{fontWeight:600}, render:r => `₩${fmt(r.balance)}` },
  ];

  return (
    <div>
      <PageTitle>통장 관리</PageTitle>
      <NoteBox S={S}>법인 통장 입출금 기록 · 장부 대조 · 잔액 관리</NoteBox>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>입출금 등록</div><ExportBtn onClick={() => exportToExcel(filtered,'통장','통장내역')} S={S} /></div>
        <FormGrid cols={4}>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f,date:e.target.value})} />
          <input style={S.inp} placeholder="은행/계좌명" value={f.bank_name} onChange={e => sF({...f,bank_name:e.target.value})} />
          <select style={S.sel} value={f.type} onChange={e => sF({...f,type:e.target.value})}><option>입금</option><option>출금</option></select>
          <input style={S.inp} type="number" placeholder="금액(원)" value={f.amount} onChange={e => sF({...f,amount:e.target.value})} />
        </FormGrid>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,marginTop:10}}>
          <input style={S.inp} placeholder="적요" value={f.description} onChange={e => sF({...f,description:e.target.value})} />
          <input style={S.inp} type="number" placeholder="거래후잔액" value={f.balance} onChange={e => sF({...f,balance:e.target.value})} />
          <input style={S.inp} placeholder="메모" value={f.memo} onChange={e => sF({...f,memo:e.target.value})} />
          <button style={S.btn} onClick={submit}>등록</button>
        </div>
      </div>
      {banks.length > 0 && <FilterBar options={['전체',...banks]} value={fil} onChange={sFil} S={S} />}
      <StatRow2
        left={<SummaryBar label="총 입금" amount={sumBy(filtered.filter(i=>i.type==='입금'),'amount')} color={C.ok} S={S} />}
        right={<SummaryBar label="총 출금" amount={sumBy(filtered.filter(i=>i.type==='출금'),'amount')} color={C.no} S={S} />}
      />
      <DataTable columns={cols} data={[...filtered].reverse()} onDelete={id => remove('bank',id)} emptyText="통장 내역 없음" S={S} />
    </div>
  );
}
