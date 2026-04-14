// ============================================
// 계약/견적 관리
// ============================================
import React, { useState } from 'react';
import { C, CON_TYPES, CON_STATUSES } from '../config';
import { fmt, today, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, Badge, ExportBtn } from '../components/ui';

export default function Contracts({ data, add, remove, S }) {
  const { contracts: items, clients } = data;
  const [f, sF] = useState({ date:today(), type:'계약서', client:'', title:'', amount:'', start_date:today(), end_date:'', status:'진행중', memo:'' });

  const submit = async () => {
    if (!f.title) return alert('제목을 입력해주세요');
    if (await add('contracts', { ...f, amount:Number(f.amount||0) }))
      sF({ date:today(), type:'계약서', client:'', title:'', amount:'', start_date:today(), end_date:'', status:'진행중', memo:'' });
  };

  const stColor = s => s==='진행중'?C.ok:s==='완료'?C.txd:s==='대기'?C.yel:C.no;
  const cols = [
    { key:'date', label:'날짜' },
    { key:'type', label:'유형', render:r => <Badge color={C.ac} S={S}>{r.type}</Badge> },
    { key:'client', label:'거래처' },
    { key:'title', label:'제목', style:{fontWeight:600} },
    { key:'amount', label:'금액', render:r => `₩${fmt(r.amount)}` },
    { key:'period', label:'기간', render:r => <span style={{fontSize:11}}>{r.start_date}~{r.end_date||'미정'}</span> },
    { key:'status', label:'상태', render:r => <Badge color={stColor(r.status)} S={S}>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageTitle>계약서 · 견적서 관리</PageTitle>
      <NoteBox S={S}>광고 계약서, 대행 견적서, 용역 계약 등 문서 관리</NoteBox>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>문서 등록</div><ExportBtn onClick={() => exportToExcel(items,'계약','계약목록')} S={S} /></div>
        <FormGrid cols={4}>
          <select style={S.sel} value={f.type} onChange={e => sF({...f,type:e.target.value})}>{CON_TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f,date:e.target.value})} />
          <div><input style={S.inp} placeholder="거래처" value={f.client} onChange={e => sF({...f,client:e.target.value})} list="co-c" /><datalist id="co-c">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
          <input style={S.inp} placeholder="제목*" value={f.title} onChange={e => sF({...f,title:e.target.value})} />
        </FormGrid>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:10,marginTop:10}}>
          <input style={S.inp} type="number" placeholder="계약금액" value={f.amount} onChange={e => sF({...f,amount:e.target.value})} />
          <input style={S.inp} type="date" value={f.start_date} onChange={e => sF({...f,start_date:e.target.value})} title="시작일" />
          <input style={S.inp} type="date" value={f.end_date} onChange={e => sF({...f,end_date:e.target.value})} title="종료일" />
          <select style={S.sel} value={f.status} onChange={e => sF({...f,status:e.target.value})}>{CON_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <button style={S.btn} onClick={submit}>등록</button>
        </div>
      </div>
      <DataTable columns={cols} data={[...items].reverse()} onDelete={id => remove('contracts',id)} emptyText="계약/견적 없음" S={S} />
    </div>
  );
}
