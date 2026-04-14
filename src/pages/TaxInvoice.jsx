import React, { useState } from 'react';
import { C, TAX_STATUSES } from '../config';
import { fmt, today, sumBy, exportToExcel } from '../utils';
import { PageTitle, FormGrid, DataTable, Badge, StatRow2, ExportBtn } from '../components/ui';

export default function TaxInvoice({ data, add, remove, S }) {
  const { taxInvoices: items, clients } = data;
  const [f, sF] = useState({ type:'발행', date:today(), client:'', supply:'', tax:'', status:'발행완료' });

  const submit = async () => {
    if (!f.supply) return alert('공급가액을 입력해주세요');
    const s = Number(f.supply), t = f.tax ? Number(f.tax) : Math.round(s * 0.1);
    if (await add('taxInvoices', { ...f, supply:s, tax:t, total:s+t }))
      sF({ type:'발행', date:today(), client:'', supply:'', tax:'', status:'발행완료' });
  };

  const issued = items.filter(i => i.type === '발행'), received = items.filter(i => i.type === '수취');
  const cols = [
    { key:'date', label:'날짜' },
    { key:'type', label:'유형', render:r => <Badge color={r.type==='발행'?C.ac:C.warn} S={S}>{r.type}</Badge> },
    { key:'client', label:'거래처' },
    { key:'supply', label:'공급가액', render:r => `₩${fmt(r.supply)}` },
    { key:'tax', label:'부가세', render:r => `₩${fmt(r.tax)}` },
    { key:'total', label:'합계', style:{fontWeight:600}, render:r => `₩${fmt(r.total)}` },
    { key:'status', label:'상태', render:r => <Badge color={r.status==='발행완료'?C.ok:C.yel} S={S}>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageTitle>세금계산서 관리</PageTitle>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>세금계산서 등록 <span style={{fontSize:12,color:C.txd,fontWeight:400}}>부가세 10% 자동</span></div><ExportBtn onClick={() => exportToExcel(items,'세금계산서','세금계산서')} S={S} /></div>
        <FormGrid cols={3}>
          <select style={S.sel} value={f.type} onChange={e => sF({...f,type:e.target.value})}><option>발행</option><option>수취</option></select>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f,date:e.target.value})} />
          <div><input style={S.inp} placeholder="거래처명" value={f.client} onChange={e => sF({...f,client:e.target.value})} list="tx-c" /><datalist id="tx-c">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
          <input style={S.inp} type="number" placeholder="공급가액(원)" value={f.supply} onChange={e => sF({...f,supply:e.target.value,tax:e.target.value?String(Math.round(Number(e.target.value)*0.1)):''})} />
          <input style={S.inp} type="number" placeholder="부가세(자동)" value={f.tax} onChange={e => sF({...f,tax:e.target.value})} />
          <select style={S.sel} value={f.status} onChange={e => sF({...f,status:e.target.value})}>{TAX_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        </FormGrid>
        <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>
      <StatRow2
        left={<div style={S.card}><div style={{fontSize:12,color:C.txd}}>발행</div><div style={{fontSize:17,fontWeight:700,marginTop:4}}>₩{fmt(sumBy(issued,'total'))}</div><div style={{fontSize:11,color:C.txd}}>부가세: ₩{fmt(sumBy(issued,'tax'))} · {issued.length}건</div></div>}
        right={<div style={S.card}><div style={{fontSize:12,color:C.txd}}>수취</div><div style={{fontSize:17,fontWeight:700,marginTop:4}}>₩{fmt(sumBy(received,'total'))}</div><div style={{fontSize:11,color:C.txd}}>부가세: ₩{fmt(sumBy(received,'tax'))} · {received.length}건</div></div>}
      />
      <DataTable columns={cols} data={[...items].reverse()} onDelete={id => remove('taxInvoices',id)} emptyText="세금계산서 없음" S={S} />
    </div>
  );
}
