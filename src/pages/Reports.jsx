import React, { useState } from 'react';
import { C } from '../config';
import { fmt, thisMonth, thisYear, sumBy, filterMonth, filterYear, toMonthly, exportToExcel } from '../utils';
import { PageTitle, NoteBox, StatGrid, StatCard, ExportBtn } from '../components/ui';

export default function Reports({ data, S }) {
  const { revenue, expenses, recurring, payroll, clients, taxInvoices } = data;
  const [view, setView] = useState('monthly'); // monthly, annual, ratio
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(thisYear());

  // ─── 월별 비교 ───
  const getMonthData = (m) => {
    const rev = sumBy(filterMonth(revenue, m), 'amount');
    const exp = sumBy(filterMonth(expenses, m), 'amount');
    const pay = sumBy(filterMonth(payroll, m, 'pay_date'), 'gross');
    const rec = recurring.filter(r => r.active !== false).reduce((s, r) => s + toMonthly(r.amount, r.cycle), 0);
    return { rev, exp, pay, rec, total: exp + pay + rec, profit: rev - exp - pay - rec };
  };

  const curM = getMonthData(month);
  const prevM = (() => {
    const [y, m2] = month.split('-').map(Number);
    const pm = m2 === 1 ? `${y-1}-12` : `${y}-${String(m2-1).padStart(2,'0')}`;
    return getMonthData(pm);
  })();

  const diff = (cur, prev) => {
    if (prev === 0) return cur > 0 ? '+∞' : '0';
    const pct = ((cur - prev) / prev * 100).toFixed(1);
    return (pct > 0 ? '+' : '') + pct + '%';
  };

  // ─── 연도별 ───
  const getYearData = (y) => {
    const rev = sumBy(filterYear(revenue, y), 'amount');
    const exp = sumBy(filterYear(expenses, y), 'amount');
    const pay = sumBy(filterYear(payroll, y, 'pay_date'), 'gross');
    const taxS = sumBy(filterYear(taxInvoices, y).filter(i => i.type === '발행'), 'tax');
    const taxP = sumBy(filterYear(taxInvoices, y).filter(i => i.type === '수취'), 'tax');
    return { rev, exp, pay, profit: rev - exp - pay, taxS, taxP, vatDue: taxS - taxP };
  };
  const yd = getYearData(year);

  // ─── 경비 비율 ───
  const totalRev = sumBy(revenue, 'amount') || 1;
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount); });
  const payTotal = sumBy(payroll, 'gross');
  const recTotal = recurring.filter(r => r.active !== false).reduce((s, r) => s + toMonthly(r.amount, r.cycle), 0) * 12;
  const allCosts = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const totalExp = sumBy(expenses, 'amount') + payTotal;

  const Row = ({ label, val, prev, color }) => (
    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.bd}`}}>
      <span>{label}</span>
      <div style={{textAlign:'right'}}>
        <span style={{fontWeight:600,color}}>₩{fmt(val)}</span>
        {prev !== undefined && <span style={{marginLeft:8,fontSize:11,color:val>prev?C.no:C.ok}}>{diff(val,prev)}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <PageTitle>리포트 / 분석</PageTitle>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {[['monthly','📊 월별 비교'],['annual','📅 연도별 리포트'],['ratio','📈 경비 비율 분석']].map(([id,label]) => (
          <button key={id} onClick={() => setView(id)} style={S.btnO(view===id)}>{label}</button>
        ))}
      </div>

      {/* 월별 비교 */}
      {view === 'monthly' && (
        <div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
            <input style={{...S.inp,width:170}} type="month" value={month} onChange={e => setMonth(e.target.value)} />
            <span style={{fontSize:12,color:C.txd}}>vs 전월 비교</span>
          </div>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>📊 월별 비교표</div>
            <Row label="매출" val={curM.rev} prev={prevM.rev} color={C.ok} />
            <Row label="경비 (일반지출)" val={curM.exp} prev={prevM.exp} color={C.no} />
            <Row label="인건비" val={curM.pay} prev={prevM.pay} color={C.warn} />
            <Row label="정기지출" val={curM.rec} prev={prevM.rec} color={C.pink} />
            <Row label="총 지출" val={curM.total} prev={prevM.total} color={C.no} />
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:15}}>
              <span>순이익</span>
              <div><span style={{color:curM.profit>=0?C.ok:C.no}}>₩{fmt(curM.profit)}</span><span style={{marginLeft:8,fontSize:11,color:curM.profit>prevM.profit?C.ok:C.no}}>{diff(curM.profit,prevM.profit)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 연도별 리포트 */}
      {view === 'annual' && (
        <div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
            <select style={{...S.sel,width:120}} value={year} onChange={e => setYear(e.target.value)}>
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={String(y)}>{y}년</option>; })}
            </select>
            <ExportBtn onClick={() => {
              const d = filterYear(expenses, year).concat(filterYear(revenue, year).map(r => ({...r, type:'매출'})));
              exportToExcel(d, `${year}년`, `${year}년_전체내역`);
            }} label="연간 엑셀" S={S} />
          </div>
          <StatGrid cols={4}>
            <StatCard label={`${year}년 매출`} value={yd.rev} color={C.ok} icon="📈" S={S} />
            <StatCard label={`${year}년 지출`} value={yd.exp} color={C.no} icon="📉" S={S} />
            <StatCard label="인건비" value={yd.pay} color={C.warn} icon="👥" S={S} />
            <StatCard label="순이익" value={yd.profit} color={yd.profit>=0?C.ok:C.no} icon="💰" S={S} />
          </StatGrid>
          <StatGrid cols={3}>
            <StatCard label="매출 부가세" value={yd.taxS} color={C.warn} icon="📤" S={S} />
            <StatCard label="매입 부가세" value={yd.taxP} color={C.ok} icon="📥" S={S} />
            <StatCard label="납부 부가세" value={Math.abs(yd.vatDue)} color={yd.vatDue>0?C.no:C.ok} icon="🧾" S={S} />
          </StatGrid>
        </div>
      )}

      {/* 경비 비율 분석 */}
      {view === 'ratio' && (
        <div>
          <NoteBox S={S}>전체 매출 대비 경비 비율 — 접대비가 너무 높으면 국세청 지적 가능</NoteBox>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>매출 대비 경비 비율 (누적)</div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.bd}`,fontWeight:600}}>
              <span>총 매출</span><span style={{color:C.ok}}>₩{fmt(totalRev)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.bd}`,fontWeight:600}}>
              <span>인건비</span>
              <span>₩{fmt(payTotal)} <span style={{fontSize:11,color:C.txd}}>({(payTotal/totalRev*100).toFixed(1)}%)</span></span>
            </div>
            {allCosts.map(([cat, val]) => (
              <div key={cat} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.bd}22`}}>
                <span style={{fontSize:13}}>{cat}</span>
                <span style={{fontSize:13}}>₩{fmt(val)} <span style={{fontSize:11,color:C.txd}}>({(val/totalRev*100).toFixed(1)}%)</span></span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,marginTop:4}}>
              <span>총 경비율</span>
              <span style={{color:totalExp/totalRev>0.8?C.no:C.ok}}>{(totalExp/totalRev*100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
