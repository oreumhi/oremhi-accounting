import React, { useState } from 'react';
import { C, VAT_Q } from '../config';
import { fmt, sumBy } from '../utils';
import { PageTitle, NoteBox, DataTable, FilterBar, Badge, StatGrid, StatCard } from '../components/ui';

export default function VAT({ data, S }) {
  const { taxInvoices } = data;
  const [q, setQ] = useState('1');
  const y = new Date().getFullYear();
  const ms = VAT_Q[q].map(m => `${y}-${m}`);
  const inQ = taxInvoices.filter(i => ms.some(m => i.date?.startsWith(m)));
  const sales = inQ.filter(i => i.type === '발행'), purch = inQ.filter(i => i.type === '수취');
  const sVat = sumBy(sales, 'tax'), pVat = sumBy(purch, 'tax'), due = sVat - pVat;

  const cols = [
    { key:'date', label:'날짜' },
    { key:'type', label:'유형', render:r => <Badge color={r.type==='발행'?C.ac:C.warn} S={S}>{r.type}</Badge> },
    { key:'client', label:'거래처' },
    { key:'supply', label:'공급가액', render:r => `₩${fmt(r.supply)}` },
    { key:'tax', label:'부가세', render:r => `₩${fmt(r.tax)}` },
    { key:'total', label:'합계', style:{fontWeight:600}, render:r => `₩${fmt(r.total)}` },
  ];

  return (
    <div>
      <PageTitle>부가가치세 관리</PageTitle>
      <NoteBox S={S}>세금계산서 기반 분기별 부가세 자동 집계</NoteBox>
      <FilterBar options={['1','2','3','4']} value={q} onChange={setQ} S={S} />
      <div style={{marginBottom:12,fontSize:13,color:C.txd}}>{y}년 {q}분기 ({VAT_Q[q][0]}~{VAT_Q[q][2]}월)</div>
      <StatGrid cols={3}>
        <StatCard label="매출 부가세 (납부)" value={sVat} color={C.warn} icon="📤" S={S} />
        <StatCard label="매입 부가세 (공제)" value={pVat} color={C.ok} icon="📥" S={S} />
        <StatCard label={due>0?'납부할 부가세':'환급받을 부가세'} value={Math.abs(due)} color={due>0?C.no:C.ok} icon={due>0?'💸':'💰'} S={S} />
      </StatGrid>
      <DataTable columns={cols} data={[...sales,...purch].sort((a,b) => (a.date||'').localeCompare(b.date||''))} emptyText="해당 분기 세금계산서 없음" S={S} />
    </div>
  );
}
