import React, { useState } from 'react';
import { C } from '../config';
import { fmt, today, calcPayroll, sumBy, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, DataTable, StatGrid, StatCard, ExportBtn } from '../components/ui';

export default function Payroll({ data, add, remove, S }) {
  const { payroll: items } = data;
  const [f, sF] = useState({ name:'', position:'', base_salary:'', bonus:'', deductions:'', pay_date:today() });
  const preview = f.base_salary ? calcPayroll(f.base_salary, f.bonus, f.deductions) : null;

  const submit = async () => {
    if (!f.name || !f.base_salary) return alert('이름과 기본급을 입력해주세요');
    const c = calcPayroll(f.base_salary, f.bonus, f.deductions);
    if (await add('payroll', { ...f, base_salary:Number(f.base_salary), bonus:Number(f.bonus||0), deductions:Number(f.deductions||0), ...c }))
      sF({ name:'', position:'', base_salary:'', bonus:'', deductions:'', pay_date:today() });
  };

  const tGross = sumBy(items,'gross'), tTax = sumBy(items,'income_tax');
  const t4 = items.reduce((s,i) => s+(Number(i.pension)||0)+(Number(i.health)||0)+(Number(i.employ)||0), 0);
  const tNet = sumBy(items,'net_pay');

  const cols = [
    { key:'name', label:'이름', style:{fontWeight:600} },
    { key:'position', label:'직급' },
    { key:'gross', label:'총액', render:r => `₩${fmt(r.gross)}` },
    { key:'income_tax', label:'소득세', style:{color:C.warn}, render:r => `₩${fmt(r.income_tax)}` },
    { key:'ins', label:'4대보험', style:{color:C.pink}, render:r => `₩${fmt((Number(r.pension)||0)+(Number(r.health)||0)+(Number(r.employ)||0))}` },
    { key:'net_pay', label:'실수령', style:{fontWeight:700,color:C.ok}, render:r => `₩${fmt(r.net_pay)}` },
    { key:'pay_date', label:'지급일' },
  ];

  return (
    <div>
      <PageTitle>급여 · 원천세 · 4대보험</PageTitle>
      <NoteBox S={S}>소득세(3.3%)·국민연금(4.5%)·건강보험(3.545%)·고용보험(0.9%) 자동계산 → 매월 10일 원천세 신고</NoteBox>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:14,fontWeight:600}}>급여 등록</div><ExportBtn onClick={() => exportToExcel(items,'급여','급여내역')} S={S} /></div>
        <FormGrid cols={3}>
          <input style={S.inp} placeholder="이름*" value={f.name} onChange={e => sF({...f,name:e.target.value})} />
          <input style={S.inp} placeholder="직급" value={f.position} onChange={e => sF({...f,position:e.target.value})} />
          <input style={S.inp} type="number" placeholder="기본급(원)*" value={f.base_salary} onChange={e => sF({...f,base_salary:e.target.value})} />
          <input style={S.inp} type="number" placeholder="상여금" value={f.bonus} onChange={e => sF({...f,bonus:e.target.value})} />
          <input style={S.inp} type="number" placeholder="기타공제" value={f.deductions} onChange={e => sF({...f,deductions:e.target.value})} />
          <input style={S.inp} type="date" value={f.pay_date} onChange={e => sF({...f,pay_date:e.target.value})} />
        </FormGrid>
        {preview && (
          <div style={{marginTop:10,padding:10,background:C.sf2,borderRadius:8,display:'flex',gap:12,flexWrap:'wrap',fontSize:12}}>
            <span>총액:<b style={{color:C.ac}}> ₩{fmt(preview.gross)}</b></span>
            <span>소득세: ₩{fmt(preview.income_tax)}</span><span>국민연금: ₩{fmt(preview.pension)}</span>
            <span>건강보험: ₩{fmt(preview.health)}</span><span>고용보험: ₩{fmt(preview.employ)}</span>
            <span>실수령:<b style={{color:C.ok}}> ₩{fmt(preview.net_pay)}</b></span>
          </div>
        )}
        <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>
      <StatGrid cols={4}>
        <StatCard label="총 급여액" value={tGross} color={C.ac} icon="💵" S={S} />
        <StatCard label="원천세" value={tTax} color={C.warn} icon="📋" S={S} />
        <StatCard label="4대보험" value={t4} color={C.pink} icon="🏥" S={S} />
        <StatCard label="실지급" value={tNet} color={C.ok} icon="💰" S={S} />
      </StatGrid>
      <DataTable columns={cols} data={[...items].reverse()} onDelete={id => remove('payroll',id)} emptyText="급여 내역 없음" S={S} />
    </div>
  );
}
