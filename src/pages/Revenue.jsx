import React, { useState } from 'react';
import { C, REV_CATS } from '../config';
import { fmt, today, exportToExcel } from '../utils';
import { PageTitle, FormGrid, DataTable, SummaryBar, Badge, ExportBtn } from '../components/ui';

export default function Revenue({ data, add, remove, S }) {
  const { revenue: items, clients } = data;
  const [f, sF] = useState({ date:today(), client:'', description:'', amount:'', category:'광고대행수수료', memo:'' });

  const submit = async () => {
    if (!f.amount) return alert('금액을 입력해주세요');
    if (await add('revenue', { ...f, amount:Number(f.amount) }))
      sF({ date:today(), client:'', description:'', amount:'', category:'광고대행수수료', memo:'' });
  };

  const cols = [
    { key:'date', label:'날짜' },
    { key:'client', label:'거래처', style:{ fontWeight:600 } },
    { key:'category', label:'분류', render:r => <Badge color={C.ok} S={S}>{r.category}</Badge> },
    { key:'description', label:'내용' },
    { key:'amount', label:'금액', style:{ fontWeight:600, color:C.ok }, render:r => `₩${fmt(r.amount)}` },
  ];

  return (
    <div>
      <PageTitle>매출 관리</PageTitle>
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>매출 등록</div>
          <ExportBtn onClick={() => exportToExcel(items, '매출', '매출내역')} S={S} />
        </div>
        <FormGrid cols={3}>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f, date:e.target.value})} />
          <div><input style={S.inp} placeholder="거래처명" value={f.client} onChange={e => sF({...f, client:e.target.value})} list="rv-c" /><datalist id="rv-c">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
          <select style={S.sel} value={f.category} onChange={e => sF({...f, category:e.target.value})}>{REV_CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input style={S.inp} placeholder="내용" value={f.description} onChange={e => sF({...f, description:e.target.value})} />
          <input style={S.inp} type="number" placeholder="금액(원)" value={f.amount} onChange={e => sF({...f, amount:e.target.value})} />
          <input style={S.inp} placeholder="메모" value={f.memo} onChange={e => sF({...f, memo:e.target.value})} />
        </FormGrid>
        <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>
      <SummaryBar label={`총 매출 (${items.length}건)`} amount={items.reduce((s,i) => s+Number(i.amount),0)} color={C.ok} S={S} />
      <DataTable columns={cols} data={[...items].reverse()} onDelete={id => remove('revenue',id)} emptyText="매출 내역 없음" S={S} />
    </div>
  );
}
