import React, { useState } from 'react';
import { C, DOC_TYPES, DOC_STATUSES } from '../config';
import { fmt, today, sumBy, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, FilterBar, SummaryBar, Badge, ExportBtn } from '../components/ui';

export default function Docs({ data, add, remove, S }) {
  const { documents: items } = data;
  const [f, sF] = useState({ date:today(), doc_type:'세금계산서', description:'', amount:'', status:'보관완료', memo:'' });
  const [fil, sFil] = useState('전체');

  const submit = async () => {
    if (!f.description) return alert('증빙 내용을 입력해주세요');
    if (await add('documents', { ...f, amount:Number(f.amount||0) }))
      sF({ date:today(), doc_type:'세금계산서', description:'', amount:'', status:'보관완료', memo:'' });
  };

  const filtered = fil === '전체' ? items : items.filter(i => i.doc_type === fil);
  const stC = s => s==='보관완료'?C.ok:s==='미수취'?C.yel:C.no;
  const cols = [
    { key:'date', label:'날짜' },
    { key:'doc_type', label:'유형', render:r => <Badge color={C.cyan} S={S}>{r.doc_type}</Badge> },
    { key:'description', label:'내용', style:{fontWeight:500} },
    { key:'amount', label:'금액', render:r => `₩${fmt(r.amount)}` },
    { key:'status', label:'상태', render:r => <Badge color={stC(r.status)} S={S}>{r.status}</Badge> },
    { key:'memo', label:'메모', style:{fontSize:12,color:C.txd} },
  ];

  return (
    <div>
      <PageTitle>증빙 관리</PageTitle>
      <NoteBox S={S}>세금계산서·카드전표·현금영수증 등 증빙자료 보관현황 관리</NoteBox>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>증빙 등록</div><ExportBtn onClick={() => exportToExcel(filtered,'증빙','증빙목록')} S={S} /></div>
        <FormGrid cols={3}>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f,date:e.target.value})} />
          <select style={S.sel} value={f.doc_type} onChange={e => sF({...f,doc_type:e.target.value})}>{DOC_TYPES.map(d => <option key={d}>{d}</option>)}</select>
          <input style={S.inp} placeholder="증빙내용*" value={f.description} onChange={e => sF({...f,description:e.target.value})} />
          <input style={S.inp} type="number" placeholder="금액" value={f.amount} onChange={e => sF({...f,amount:e.target.value})} />
          <select style={S.sel} value={f.status} onChange={e => sF({...f,status:e.target.value})}>{DOC_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <input style={S.inp} placeholder="메모" value={f.memo} onChange={e => sF({...f,memo:e.target.value})} />
        </FormGrid>
        <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>
      <FilterBar options={['전체',...DOC_TYPES]} value={fil} onChange={sFil} S={S} />
      <SummaryBar label={`총 ${filtered.length}건`} amount={sumBy(filtered,'amount')} color={C.cyan} S={S} />
      <DataTable columns={cols} data={[...filtered].reverse()} onDelete={id => remove('documents',id)} emptyText="증빙 없음" S={S} />
    </div>
  );
}
