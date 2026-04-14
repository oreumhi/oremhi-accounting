import React from 'react';
import { C, getTaxDeadlines } from '../config';
import { fmt, thisMonth, sumBy, filterMonth, toMonthly } from '../utils';
import { StatCard, PageTitle, BarItem, StatGrid } from '../components/ui';

export default function Dashboard({ data, S }) {
  const m = thisMonth();
  const { revenue, expenses, recurring, payroll, clients, budgets } = data;

  const revM = sumBy(filterMonth(revenue, m), 'amount');
  const expM = sumBy(filterMonth(expenses, m), 'amount');
  const payT = sumBy(payroll, 'net_pay');
  const recM = recurring.filter(r => r.active !== false).reduce((s, r) => s + toMonthly(r.amount, r.cycle), 0);
  const arT = sumBy(clients, 'ar');
  const apT = sumBy(clients, 'ap');
  const totalOut = expM + payT + recM;
  const profit = revM - totalOut;

  // 결제수단별
  const byPM = {};
  expenses.forEach(e => { const k = e.pay_method || '기타'; byPM[k] = (byPM[k] || 0) + Number(e.amount); });
  const topPM = Object.entries(byPM).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPM = topPM[0]?.[1] || 1;

  // 카테고리별
  const byCat = {};
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCat[0]?.[1] || 1;

  // 세금 마감일
  const deadlines = getTaxDeadlines();

  // 예산 초과 경고
  const monthExpByCat = {};
  filterMonth(expenses, m).forEach(e => { monthExpByCat[e.category] = (monthExpByCat[e.category] || 0) + Number(e.amount); });
  const budgetWarnings = budgets.filter(b => b.active !== false).map(b => {
    const spent = monthExpByCat[b.category] || 0;
    const pct = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
    return { ...b, spent, pct };
  }).filter(b => b.pct >= 80);

  // 최근 거래
  const recent = [
    ...expenses.map(e => ({ ...e, _t: '지출', _c: C.no, _s: e.pay_method })),
    ...revenue.map(r => ({ ...r, _t: '매출', _c: C.ok, _s: '매출' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);

  return (
    <div>
      <PageTitle>대시보드</PageTitle>

      {/* 세금 마감 알림 */}
      {deadlines.length > 0 && (
        <div style={{ ...S.card, borderColor: C.warn + '44', background: C.warn + '08', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.warn }}>⏰ 다가오는 세금 신고 마감</div>
          {deadlines.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
              <span>{d.name} <span style={{ color: C.txd }}>({d.desc})</span></span>
              <span style={{ color: d.daysLeft <= 7 ? C.no : d.daysLeft <= 14 ? C.warn : C.txd, fontWeight: 600 }}>
                {d.daysLeft === 0 ? '오늘!' : `${d.daysLeft}일 남음`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 예산 초과 경고 */}
      {budgetWarnings.length > 0 && (
        <div style={{ ...S.card, borderColor: C.no + '44', background: C.no + '08', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.no }}>🚨 예산 초과 경고</div>
          {budgetWarnings.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
              <span>{b.category}</span>
              <span style={{ color: b.pct >= 100 ? C.no : C.warn, fontWeight: 600 }}>
                ₩{fmt(b.spent)} / ₩{fmt(b.monthly_limit)} ({Math.round(b.pct)}%)
              </span>
            </div>
          ))}
        </div>
      )}

      <StatGrid cols={4}>
        <StatCard label="이번달 매출" value={revM} color={C.ok} icon="📈" S={S} />
        <StatCard label="이번달 지출" value={totalOut} color={C.warn} icon="📉" S={S} />
        <StatCard label="이번달 순이익" value={profit} color={profit >= 0 ? C.ac : C.no} icon="💰" S={S} />
        <StatCard label="누적 매출" value={sumBy(revenue, 'amount')} color={C.cyan} icon="📊" S={S} />
      </StatGrid>
      <StatGrid cols={4}>
        <StatCard label="누적 지출" value={sumBy(expenses, 'amount')} color={C.no} icon="💸" S={S} />
        <StatCard label="미수금" value={arT} color={C.yel} icon="📥" S={S} />
        <StatCard label="미지급금" value={apT} color={C.pink} icon="📤" S={S} />
        <StatCard label="정기지출(월)" value={recM} color={C.pur} icon="🔄" S={S} />
      </StatGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>결제수단별 지출</div>
          {topPM.length === 0 ? <div style={{ color: C.txd, textAlign: 'center', padding: 16, fontSize: 12 }}>데이터 없음</div> :
            topPM.map(([m, v]) => <BarItem key={m} label={m} value={v} maxValue={maxPM} color={C.ac} />)}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>카테고리별 지출</div>
          {topCat.length === 0 ? <div style={{ color: C.txd, textAlign: 'center', padding: 16, fontSize: 12 }}>데이터 없음</div> :
            topCat.map(([c, v]) => <BarItem key={c} label={c} value={v} maxValue={maxCat} color={C.pur} />)}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>최근 거래</div>
          {recent.length === 0 ? <div style={{ color: C.txd, textAlign: 'center', padding: 16, fontSize: 12 }}>거래 없음</div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {recent.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 7, background: C.sf2 }}>
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>{r.description || r.client || '-'}</div><div style={{ fontSize: 10, color: C.txd }}>{r.date}·{r._s}</div></div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: r._c }}>{r._t === '매출' ? '+' : '-'}₩{fmt(r.amount)}</div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
