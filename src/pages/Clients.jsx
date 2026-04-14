import React, { useState } from 'react';
import { C } from '../config';
import { fmt, sumBy, exportToExcel } from '../utils';
import { PageTitle, NoteBox, FormGrid, SummaryBar, StatRow2, ExportBtn } from '../components/ui';

export default function Clients({ data, add, remove, update, S }) {
  const { clients, revenue, expenses } = data;
  const [f, sF] = useState({ name:'', biz_no:'', contact:'', email:'', ar:'', ap:'' });
  const [view, setView] = useState('list'); // 'list' or 'profit'

  const submit = async () => {
    if (!f.name) return alert('거래처명을 입력해주세요');
    if (await add('clients', { ...f, ar:Number(f.ar||0), ap:Number(f.ap||0) }))
      sF({ name:'', biz_no:'', contact:'', email:'', ar:'', ap:'' });
  };

  const getBal = n => ({
    rev: revenue.filter(i => i.client === n).reduce((s, i) => s + Number(i.amount), 0),
    exp: expenses.filter(i => i.client === n).reduce((s, i) => s + Number(i.amount), 0),
  });

  // 수익률 데이터
  const profitData = clients.map(c => {
    const b = getBal(c.name);
    const profit = b.rev - b.exp;
    const margin = b.rev > 0 ? ((profit / b.rev) * 100).toFixed(1) : 0;
    return { ...c, rev: b.rev, exp: b.exp, profit, margin };
  }).sort((a, b) => b.profit - a.profit);

  return (
    <div>
      <PageTitle>거래처 · 미수금/미지급금</PageTitle>
      <NoteBox S={S}>거래처별 매출·매입 집계 + 미수금(받을돈)·미지급금(줄돈) + 수익률 분석</NoteBox>

      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:600}}>거래처 등록</div>
          <ExportBtn onClick={() => exportToExcel(profitData,'거래처','거래처분석')} S={S} />
        </div>
        <FormGrid cols={3}>
          <input style={S.inp} placeholder="거래처명*" value={f.name} onChange={e => sF({...f,name:e.target.value})} />
          <input style={S.inp} placeholder="사업자번호" value={f.biz_no} onChange={e => sF({...f,biz_no:e.target.value})} />
          <input style={S.inp} placeholder="연락처" value={f.contact} onChange={e => sF({...f,contact:e.target.value})} />
          <input style={S.inp} placeholder="이메일" value={f.email} onChange={e => sF({...f,email:e.target.value})} />
          <input style={S.inp} type="number" placeholder="미수금(받을돈)" value={f.ar} onChange={e => sF({...f,ar:e.target.value})} />
          <input style={S.inp} type="number" placeholder="미지급금(줄돈)" value={f.ap} onChange={e => sF({...f,ap:e.target.value})} />
        </FormGrid>
        <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>

      <StatRow2
        left={<SummaryBar label="총 미수금 (받을돈)" amount={sumBy(clients,'ar')} color={C.yel} S={S} />}
        right={<SummaryBar label="총 미지급금 (줄돈)" amount={sumBy(clients,'ap')} color={C.pink} S={S} />}
      />

      {/* 보기 전환 */}
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        <button onClick={() => setView('list')} style={S.btnO(view==='list')}>📋 거래처 목록</button>
        <button onClick={() => setView('profit')} style={S.btnO(view==='profit')}>📊 거래처별 수익률</button>
      </div>

      <div style={{...S.card,overflowX:'auto'}}>
        <table style={S.tbl}>
          <thead><tr>
            <th style={S.th}>거래처</th>
            {view === 'list' && <><th style={S.th}>사업자번호</th><th style={S.th}>매출</th><th style={S.th}>매입</th><th style={S.th}>미수금</th><th style={S.th}>미지급금</th></>}
            {view === 'profit' && <><th style={S.th}>매출</th><th style={S.th}>관련지출</th><th style={S.th}>순수익</th><th style={S.th}>수익률</th></>}
            <th style={{...S.th,width:36}}></th>
          </tr></thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan={view==='list'?7:6} style={{...S.td,textAlign:'center',color:C.txd,padding:26}}>거래처 없음</td></tr>
            ) : (view === 'profit' ? profitData : clients).map(c => {
              const b = view === 'profit' ? c : getBal(c.name);
              return (
                <tr key={c.id}>
                  <td style={{...S.td,fontWeight:600}}>{c.name}</td>
                  {view === 'list' && <>
                    <td style={S.td}>{c.biz_no||'-'}</td>
                    <td style={{...S.td,color:C.ok}}>₩{fmt(b.rev)}</td>
                    <td style={{...S.td,color:C.no}}>₩{fmt(b.exp)}</td>
                    <td style={S.td}><input style={{...S.inp,width:100,padding:'4px 7px',fontSize:12}} type="number" value={c.ar||''} onChange={e => update('clients',c.id,{ar:Number(e.target.value)})} placeholder="0" /></td>
                    <td style={S.td}><input style={{...S.inp,width:100,padding:'4px 7px',fontSize:12}} type="number" value={c.ap||''} onChange={e => update('clients',c.id,{ap:Number(e.target.value)})} placeholder="0" /></td>
                  </>}
                  {view === 'profit' && <>
                    <td style={{...S.td,color:C.ok}}>₩{fmt(c.rev)}</td>
                    <td style={{...S.td,color:C.no}}>₩{fmt(c.exp)}</td>
                    <td style={{...S.td,fontWeight:700,color:c.profit>=0?C.ok:C.no}}>₩{fmt(c.profit)}</td>
                    <td style={S.td}>
                      <span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,background:(c.margin>=30?C.ok:c.margin>=10?C.yel:C.no)+'20',color:c.margin>=30?C.ok:c.margin>=10?C.yel:C.no}}>
                        {c.margin}%
                      </span>
                    </td>
                  </>}
                  <td style={S.td}><button style={S.del} onClick={() => remove('clients',c.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
