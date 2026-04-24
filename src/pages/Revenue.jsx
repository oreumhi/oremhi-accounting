import React, { useState, useMemo, useRef } from 'react';
import { C, REV_CATS } from '../config';
import { fmt, today, exportToExcel } from '../utils';
import { PageTitle, FormGrid, DataTable, SummaryBar, Badge, ExportBtn, DateRangeFilter, filterDateRange } from '../components/ui';

export default function Revenue({ data, add, remove, update, S }) {
  const { revenue: items, clients } = data;
  const [f, sF] = useState({ date:today(), client:'', description:'', amount:'', category:'광고대행수수료', memo:'' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editMemoId, setEditMemoId] = useState(null);
  const [editMemoVal, setEditMemoVal] = useState('');

  const filtered = useMemo(() => filterDateRange(items, dateFrom, dateTo), [items, dateFrom, dateTo]);

  const submit = async () => {
    if (!f.amount) return alert('금액을 입력해주세요');
    if (await add('revenue', { ...f, amount:Number(f.amount) }))
      sF({ date:today(), client:'', description:'', amount:'', category:'광고대행수수료', memo:'' });
  };

  const handleCategoryChange = async (row, newCat) => {
    await update('revenue', row.id, { category: newCat });
  };

  const startMemoEdit = (row) => {
    setEditMemoId(row.id);
    setEditMemoVal(row.memo || '');
  };

  const saveMemo = async (id) => {
    await update('revenue', id, { memo: editMemoVal });
    setEditMemoId(null);
    setEditMemoVal('');
  };

  const cols = [
    { key:'date', label:'날짜' },
    { key:'client', label:'거래처', style:{ fontWeight:600 } },
    { key:'category', label:'분류', render:r => (
      <select value={r.category || '기타매출'} onChange={e => handleCategoryChange(r, e.target.value)}
        style={{ background:C.ok+'22', color:C.ok, border:`1px solid ${C.ok}44`, borderRadius:10, padding:'3px 8px', fontSize:11, fontWeight:600, cursor:'pointer', outline:'none' }}>
        {REV_CATS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )},
    { key:'description', label:'내용' },
    { key:'amount', label:'금액', style:{ fontWeight:600, color:C.ok }, render:r => `₩${fmt(r.amount)}` },
    { key:'memo', label:'메모', render:r => editMemoId === r.id ? (
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <input value={editMemoVal} onChange={e => setEditMemoVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveMemo(r.id)}
          style={{ ...S.inp, padding:'4px 8px', fontSize:12, width:120 }} autoFocus placeholder="메모 입력" />
        <button onClick={() => saveMemo(r.id)} style={{ background:C.ac, color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>저장</button>
        <button onClick={() => setEditMemoId(null)} style={{ background:'none', border:`1px solid ${C.bd}`, borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', color:C.txd }}>취소</button>
      </div>
    ) : (
      <span onClick={() => startMemoEdit(r)} style={{ cursor:'pointer', fontSize:12, color: r.memo ? C.tx : C.txm }}>
        {r.memo || '메모 입력'}
      </span>
    )},
  ];

  return (
    <div>
      <PageTitle>매출 관리</PageTitle>
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>매출 등록</div>
          <ExportBtn onClick={() => exportToExcel(filtered, '매출', '매출내역')} S={S} />
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
      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onReset={() => { setDateFrom(''); setDateTo(''); }} S={S} />
      <SummaryBar label={`조회 매출 (${filtered.length}건)`} amount={filtered.reduce((s,i) => s+Number(i.amount),0)} color={C.ok} S={S} />
      <DataTable columns={cols} data={[...filtered].reverse()} onDelete={id => remove('revenue',id)} emptyText="매출 내역 없음" S={S} />
    </div>
  );
}
