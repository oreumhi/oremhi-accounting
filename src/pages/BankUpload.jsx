// ============================================
// 거래내역 업로드 (엑셀 자동 등록)
//
// 지원 양식:
//   - 신한은행 체크카드/법인계좌 거래내역
//   - (추후) 신한 법인신용카드 이용내역
//
// 흐름:
//   1. 엑셀 파일 업로드 (드래그 앤 드롭 / 클릭)
//   2. 자동 파싱 + 분류
//   3. 미리보기 (수정 가능)
//   4. 선택 항목 일괄 저장
// ============================================

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { C, EXP_CATS, REV_CATS, PAY_METHODS } from '../config';
import { fmt, uid } from '../utils';
import { PageTitle } from '../components/ui';

// ─── 자동 분류 규칙 ───
// 적요(txType) + 내용(desc)을 기반으로 카테고리와 결제수단을 추정

function autoCategory(txType, desc, isIncome) {
  if (isIncome) return '광고대행수수료'; // 매출 기본값

  const d = (desc || '').toLowerCase();
  const t = (txType || '').toLowerCase();

  // 적요 기반
  if (t === 'bz급여' || d.includes('월급') || d.includes('급여')) return '급여';
  if (t === 'bz공과' || d.includes('지방세')) return '세금공과';
  if (t === '국세' || d.includes('국세')) return '세금공과';
  if (t === '이자') return '이자';

  // 내용 기반
  if (d.includes('주유') || d.includes('주유소')) return '주유비';
  if (d.includes('주차')) return '주차비';
  if (d.includes('택시') || d.includes('카카오t')) return '교통비';
  if (d.includes('택배') || d.includes('cj대한') || d.includes('우체국')) return '택배비';
  if (d.includes('오피스') || d.includes('임대') || d.includes('월세')) return '임대료';
  if (d.includes('통신') || d.includes('skt') || d.includes('kt ') || d.includes('lg u')) return '통신비';
  if (d.includes('보험')) return '보험료';
  if (d.includes('커피') || d.includes('카페') || d.includes('스타벅스') || d.includes('이디야') || d.includes('메가')) return '복리후생비';
  if (d.includes('우아한형제') || d.includes('배달의민족') || d.includes('배민')) return '배달비';
  if (d.includes('쿠팡') || d.includes('쿠팡이츠')) return '소모품';
  if (d.includes('네이버파이낸셜') || d.includes('네이버페이')) return '식대';
  if (d.includes('교육') || d.includes('학원') || d.includes('세미나')) return '교육훈련비';
  if (d.includes('인쇄') || d.includes('복사') || d.includes('프린트')) return '도서인쇄비';
  if (d.includes('수리') || d.includes('as ') || d.includes('정비')) return '수리비';

  return '기타';
}

function autoPayMethod(txType, desc) {
  const t = (txType || '').toLowerCase();
  const d = (desc || '').toLowerCase();

  if (t === '신한체') return '체크카드';
  if (t === '카드결') return '법인카드';
  if (t.includes('뱅크') || t.includes('ib') || t.includes('mb') || t === '모바일') return '계좌이체';
  if (t.includes('급여')) return '계좌이체';
  if (t.includes('공과') || t === '국세') return '계좌이체';
  if (d.includes('네이버페이')) return '네이버페이';
  if (d.includes('카카오페이')) return '카카오페이';
  if (d.includes('토스')) return '토스';

  return '계좌이체';
}

// ─── 건너뛸 항목 판단 ───
function shouldSkip(txType, desc) {
  const t = (txType || '').toLowerCase();
  const d = (desc || '').toLowerCase();

  // 신한카드 법인 결제대금 (카드 청구액 출금)
  if (d.includes('신한카드법인') || d.includes('신한카드 법인')) return true;
  // 이자
  if (t === '이자') return true;

  return false;
}

// ─── 엑셀 파싱: 신한은행 체크카드/법인계좌 ───
function parseShinhanBank(data) {
  // 헤더 찾기: '거래일시' 컬럼이 있는 행
  let headerRow = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (row.some(cell => String(cell || '').includes('거래일시'))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) return null;

  const headers = data[headerRow].map(h => String(h || '').trim());
  const colIdx = {};
  headers.forEach((h, i) => {
    if (h.includes('거래일시')) colIdx.date = i;
    if (h.includes('적요') && !colIdx.txType) colIdx.txType = i;
    if (h.includes('입금액') || h === '입금액') colIdx.income = i;
    if (h.includes('출금액') || h === '출금액') colIdx.expense = i;
    if (h.includes('내용') && !colIdx.desc) colIdx.desc = i;
    if (h.includes('잔액') && !colIdx.balance) colIdx.balance = i;
    if (h.includes('메모') && !colIdx.memo) colIdx.memo = i;
  });

  // 필수 컬럼 확인
  if (colIdx.date === undefined || colIdx.income === undefined || colIdx.expense === undefined) {
    return null;
  }

  const results = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    const dateStr = String(row[colIdx.date] || '').trim();

    // 빈 행, 합계 행 건너뛰기
    if (!dateStr || dateStr.includes('합계') || dateStr.length < 8) continue;

    // 날짜 파싱: "2026.04.22 12:51:24" → "2026-04-22"
    const dateParts = dateStr.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
    if (!dateParts) continue;
    const date = `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`;

    const txType = String(row[colIdx.txType] || '').trim();
    const incomeAmt = Number(row[colIdx.income]) || 0;
    const expenseAmt = Number(row[colIdx.expense]) || 0;
    const desc = String(row[colIdx.desc] || '').trim();
    const memo = colIdx.memo !== undefined ? String(row[colIdx.memo] || '').trim() : '';

    // 입금도 출금도 0이면 건너뛰기
    if (incomeAmt === 0 && expenseAmt === 0) continue;

    const isIncome = incomeAmt > 0;
    const amount = isIncome ? incomeAmt : expenseAmt;
    const category = autoCategory(txType, desc, isIncome);
    const payMethod = autoPayMethod(txType, desc);
    const skip = shouldSkip(txType, desc);

    results.push({
      _id: uid(),
      _selected: !skip,
      _type: isIncome ? 'income' : 'expense',
      _skipped: skip,
      _skipReason: skip ? (desc.includes('신한카드') ? '카드 결제대금' : '자동 제외') : '',
      date,
      client: desc,
      description: txType,
      amount,
      category,
      pay_method: payMethod,
      memo: memo || '',
    });
  }

  return results;
}

// ─── (추후) 신한 법인신용카드 파싱 ───
function parseShinhanCreditCard(data) {
  // TODO: 신용카드 엑셀 양식 분석 후 구현
  return null;
}

// ─── 파일 타입 감지 + 파싱 ───
function parseExcelFile(data) {
  // 1차: 신한은행 체크카드/법인계좌 시도
  const bankResult = parseShinhanBank(data);
  if (bankResult && bankResult.length > 0) return { type: '신한은행 체크카드/법인계좌', items: bankResult };

  // 2차: 신한 법인신용카드 시도
  const creditResult = parseShinhanCreditCard(data);
  if (creditResult && creditResult.length > 0) return { type: '신한 법인신용카드', items: creditResult };

  return null;
}

// ─── 메인 컴포넌트 ───
export default function BankUpload({ data, addBulk, S }) {
  const [items, setItems] = useState([]);
  const [fileType, setFileType] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef();

  // 파일 처리
  const handleFile = (file) => {
    if (!file) return;
    setError('');
    setResult(null);
    setItems([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const parsed = parseExcelFile(rawData);
        if (!parsed) {
          setError('지원하지 않는 엑셀 양식입니다.\n현재 신한은행 체크카드/법인계좌 거래내역만 지원합니다.');
          return;
        }

        setFileType(parsed.type);
        setItems(parsed.items);
      } catch (err) {
        setError('엑셀 파일 읽기 실패: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 항목 선택/해제
  const toggleItem = (id) => {
    setItems(prev => prev.map(item => item._id === id ? { ...item, _selected: !item._selected } : item));
  };

  // 전체 선택/해제
  const toggleAll = () => {
    const selectable = items.filter(i => !i._skipped);
    const allSelected = selectable.every(i => i._selected);
    setItems(prev => prev.map(item => item._skipped ? item : { ...item, _selected: !allSelected }));
  };

  // 항목 수정
  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item._id === id ? { ...item, [field]: value } : item));
  };

  // 중복 체크
  const isDuplicate = (item) => {
    const existing = item._type === 'income' ? data.revenue : data.expenses;
    return existing.some(e =>
      e.date === item.date &&
      Math.abs(Number(e.amount) - Number(item.amount)) < 1 &&
      e.client === item.client
    );
  };

  // 일괄 저장
  const handleSave = async () => {
    const selected = items.filter(i => i._selected);
    if (selected.length === 0) return alert('저장할 항목을 선택해주세요');

    const dupes = selected.filter(isDuplicate);
    if (dupes.length > 0) {
      if (!confirm(`⚠️ ${dupes.length}건의 중복 항목이 있습니다.\n그래도 저장하시겠습니까?`)) return;
    }

    setSaving(true);

    // 입금(매출)과 출금(지출) 분리
    const incomes = selected.filter(i => i._type === 'income').map(i => ({
      date: i.date,
      client: i.client,
      description: i.description,
      amount: i.amount,
      category: i.category,
      memo: i.memo,
    }));

    const expenses = selected.filter(i => i._type === 'expense').map(i => ({
      date: i.date,
      client: i.client,
      description: i.description,
      amount: i.amount,
      category: i.category,
      pay_method: i.pay_method,
      memo: i.memo,
    }));

    let totalSuccess = 0, totalFail = 0;

    if (incomes.length > 0) {
      const r = await addBulk('revenue', incomes);
      totalSuccess += r.success;
      totalFail += r.fail;
    }

    if (expenses.length > 0) {
      const r = await addBulk('expenses', expenses);
      totalSuccess += r.success;
      totalFail += r.fail;
    }

    setResult({ success: totalSuccess, fail: totalFail, incomes: incomes.length, expenses: expenses.length });
    setSaving(false);
  };

  // 통계
  const selectedItems = items.filter(i => i._selected);
  const selectedIncomes = selectedItems.filter(i => i._type === 'income');
  const selectedExpenses = selectedItems.filter(i => i._type === 'expense');
  const totalIncome = selectedIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = selectedExpenses.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageTitle>거래내역 업로드 (엑셀)</PageTitle>

      {/* 안내 */}
      <div style={S.note}>
        · 신한은행 체크카드/법인계좌 거래내역 엑셀 파일을 올려주세요<br />
        · 자동으로 매출/지출을 분류합니다 (수정 가능)<br />
        · 같은 파일을 다시 올리면 중복을 감지합니다<br />
        · 신용카드 이용내역은 추후 지원 예정입니다
      </div>

      {/* 파일 업로드 영역 */}
      {items.length === 0 && !error && (
        <div style={S.card}>
          <div
            onClick={() => ref.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); }}
            onDragOver={e => e.preventDefault()}
            onDragEnter={e => e.currentTarget.style.borderColor = C.ac}
            onDragLeave={e => e.currentTarget.style.borderColor = C.bd}
            style={{ border: `2px dashed ${C.bd}`, borderRadius: 12, padding: 50, textAlign: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.ac}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📥</div>
            <div style={{ color: C.txd, fontSize: 15 }}>클릭 또는 드래그하여 엑셀 파일 업로드</div>
            <div style={{ color: C.txm, fontSize: 12, marginTop: 6 }}>.xlsx 파일 지원</div>
          </div>
          <input ref={ref} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{ ...S.card, borderColor: C.no + '44' }}>
          <div style={{ color: C.no, fontWeight: 600, marginBottom: 6 }}>⚠️ 오류</div>
          <div style={{ color: C.txd, fontSize: 13, whiteSpace: 'pre-line' }}>{error}</div>
          <button style={{ ...S.btn, marginTop: 12, background: C.sf2, color: C.txd }} onClick={() => { setError(''); setItems([]); }}>다시 시도</button>
        </div>
      )}

      {/* 저장 완료 */}
      {result && (
        <div style={{ ...S.card, borderColor: C.ok + '44' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ok, marginBottom: 10 }}>✅ 저장 완료</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            <div style={{ padding: 10, background: C.sf2, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>매출 등록</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ok }}>{result.incomes}건</div>
            </div>
            <div style={{ padding: 10, background: C.sf2, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>지출 등록</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.no }}>{result.expenses}건</div>
            </div>
            <div style={{ padding: 10, background: C.sf2, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>성공 / 실패</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.success} / {result.fail}</div>
            </div>
          </div>
          <button style={{ ...S.btn, marginTop: 14 }} onClick={() => { setItems([]); setResult(null); setFileType(''); }}>새 파일 업로드</button>
        </div>
      )}

      {/* 미리보기 테이블 */}
      {items.length > 0 && !result && (
        <>
          {/* 파일 정보 + 통계 */}
          <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>📋 {fileType}</div>
              <div style={{ fontSize: 12, color: C.txd, marginTop: 3 }}>
                총 {items.length}건 (입금 {items.filter(i => i._type === 'income').length}건 / 출금 {items.filter(i => i._type === 'expense').length}건)
                {items.filter(i => i._skipped).length > 0 && (
                  <span style={{ color: C.warn }}> · 자동 제외 {items.filter(i => i._skipped).length}건</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.btn, background: C.sf2, color: C.txd }} onClick={() => { setItems([]); setFileType(''); }}>취소</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : `선택 항목 저장 (${selectedItems.length}건)`}
              </button>
            </div>
          </div>

          {/* 선택 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>선택된 매출 ({selectedIncomes.length}건)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ok }}>₩{fmt(totalIncome)}</div>
            </div>
            <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>선택된 지출 ({selectedExpenses.length}건)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.no }}>₩{fmt(totalExpense)}</div>
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead>
                <tr style={{ background: C.sf2 }}>
                  <th style={th}><input type="checkbox" checked={items.filter(i => !i._skipped).every(i => i._selected)} onChange={toggleAll} /></th>
                  <th style={th}>구분</th>
                  <th style={th}>날짜</th>
                  <th style={th}>거래처/내용</th>
                  <th style={{ ...th, textAlign: 'right' }}>금액</th>
                  <th style={th}>분류</th>
                  <th style={th}>결제수단</th>
                  <th style={th}>메모</th>
                  <th style={th}>상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const dup = isDuplicate(item);
                  const skipped = item._skipped;
                  const rowBg = skipped ? C.sf3 + '44' : dup ? C.warn + '08' : 'transparent';
                  const textColor = skipped ? C.txm : C.tx;

                  return (
                    <tr key={item._id} style={{ background: rowBg }}>
                      <td style={td}>
                        <input type="checkbox" checked={item._selected} onChange={() => toggleItem(item._id)} disabled={skipped} />
                      </td>
                      <td style={td}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: item._type === 'income' ? C.ok + '22' : C.no + '22', color: item._type === 'income' ? C.ok : C.no }}>
                          {item._type === 'income' ? '입금' : '출금'}
                        </span>
                      </td>
                      <td style={{ ...td, color: textColor, whiteSpace: 'nowrap', fontSize: 12 }}>{item.date}</td>
                      <td style={{ ...td, color: textColor, fontSize: 12, maxWidth: 200 }}>{item.client}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: item._type === 'income' ? C.ok : C.no, whiteSpace: 'nowrap' }}>
                        ₩{fmt(item.amount)}
                      </td>
                      <td style={td}>
                        {skipped ? (
                          <span style={{ fontSize: 11, color: C.txm }}>{item._skipReason}</span>
                        ) : (
                          <select style={miniSel} value={item.category} onChange={e => updateItem(item._id, 'category', e.target.value)}>
                            {(item._type === 'income' ? REV_CATS : [...EXP_CATS, '급여']).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={td}>
                        {!skipped && item._type === 'expense' && (
                          <select style={miniSel} value={item.pay_method} onChange={e => updateItem(item._id, 'pay_method', e.target.value)}>
                            {PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={td}>
                        {!skipped && (
                          <input style={miniInp} placeholder="메모" value={item.memo} onChange={e => updateItem(item._id, 'memo', e.target.value)} />
                        )}
                      </td>
                      <td style={td}>
                        {dup && <span style={{ fontSize: 10, color: C.warn, fontWeight: 600 }}>⚠️ 중복</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 하단 저장 버튼 */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={{ ...S.btn, background: C.sf2, color: C.txd }} onClick={() => { setItems([]); setFileType(''); }}>취소</button>
            <button style={S.btn} onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : `선택 항목 저장 (${selectedItems.length}건)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 스타일
const th = { padding: '9px 10px', textAlign: 'left', fontSize: 11, color: '#8890a6', fontWeight: 700, borderBottom: '1px solid #2a2f42', whiteSpace: 'nowrap' };
const td = { padding: '7px 10px', borderBottom: '1px solid #2a2f42', fontSize: 12.5 };
const miniSel = { background: '#1e2230', border: '1px solid #2a2f42', borderRadius: 5, padding: '4px 6px', color: '#e4e7ed', fontSize: 11, outline: 'none' };
const miniInp = { background: '#1e2230', border: '1px solid #2a2f42', borderRadius: 5, padding: '4px 8px', color: '#e4e7ed', fontSize: 11, outline: 'none', width: 100 };
