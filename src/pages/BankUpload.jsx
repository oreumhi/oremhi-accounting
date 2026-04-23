// ============================================
// 거래내역 업로드 v2
//
// 기능:
//   1. 엑셀 자동 파싱 + 분류
//   2. 분류 규칙 기억 (변경 시 팝업, 관리 섹션)
//   3. 항목별 영수증 첨부 (원본 영구 보관)
//   4. 세무사 전달용 엑셀 다운로드
// ============================================

import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { C, EXP_CATS, REV_CATS, PAY_METHODS } from '../config';
import { fmt, uid, today } from '../utils';
import { uploadImage } from '../store';
import { PageTitle } from '../components/ui';

// ═══════════════════════════════════════════
// 자동 분류 규칙 (기본값)
// ═══════════════════════════════════════════

function defaultCategory(txType, desc, isIncome) {
  if (isIncome) return '광고대행수수료';
  const d = (desc || '').toLowerCase();
  const t = (txType || '').toLowerCase();
  if (t === 'bz급여' || d.includes('월급') || d.includes('급여')) return '급여';
  if (t === 'bz공과' || d.includes('지방세')) return '세금공과';
  if (t === '국세' || d.includes('국세')) return '세금공과';
  if (t === '이자') return '이자';
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

function defaultPayMethod(txType, desc) {
  const t = (txType || '').toLowerCase();
  const d = (desc || '').toLowerCase();
  if (t === '신한체') return '체크카드';
  if (t === '카드결') return '법인카드';
  if (t.includes('뱅크') || t.includes('ib') || t.includes('mb') || t === '모바일') return '계좌이체';
  if (t.includes('급여') || t.includes('공과') || t === '국세') return '계좌이체';
  if (d.includes('네이버페이')) return '네이버페이';
  if (d.includes('카카오페이')) return '카카오페이';
  if (d.includes('토스')) return '토스';
  return '계좌이체';
}

function shouldSkip(txType, desc) {
  const d = (desc || '').toLowerCase();
  const t = (txType || '').toLowerCase();
  if (d.includes('신한카드법인') || d.includes('신한카드 법인')) return true;
  if (t === '이자') return true;
  return false;
}

// ═══════════════════════════════════════════
// 엑셀 파싱: 신한은행 체크카드/법인계좌
// ═══════════════════════════════════════════

function parseShinhanBank(data, rules) {
  let headerRow = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    if (data[i].some(cell => String(cell || '').includes('거래일시'))) { headerRow = i; break; }
  }
  if (headerRow === -1) return null;

  const headers = data[headerRow].map(h => String(h || '').trim());
  const colIdx = {};
  headers.forEach((h, i) => {
    if (h.includes('거래일시')) colIdx.date = i;
    if (h.includes('적요') && colIdx.txType === undefined) colIdx.txType = i;
    if (h === '입금액' || h.includes('입금액')) colIdx.income = i;
    if (h === '출금액' || h.includes('출금액')) colIdx.expense = i;
    if (h.includes('내용') && colIdx.desc === undefined) colIdx.desc = i;
    if (h.includes('메모') && colIdx.memo === undefined) colIdx.memo = i;
  });

  if (colIdx.date === undefined || colIdx.income === undefined || colIdx.expense === undefined) return null;

  // 규칙을 Map으로 변환 (client → { category, pay_method })
  const ruleMap = {};
  (rules || []).forEach(r => { ruleMap[r.client] = r; });

  const results = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    const dateStr = String(row[colIdx.date] || '').trim();
    if (!dateStr || dateStr.includes('합계') || dateStr.length < 8) continue;

    const dateParts = dateStr.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
    if (!dateParts) continue;
    const date = `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`;

    const txType = String(row[colIdx.txType] || '').trim();
    const incomeAmt = Number(row[colIdx.income]) || 0;
    const expenseAmt = Number(row[colIdx.expense]) || 0;
    const desc = String(row[colIdx.desc] || '').trim();
    const memo = colIdx.memo !== undefined ? String(row[colIdx.memo] || '').trim() : '';

    if (incomeAmt === 0 && expenseAmt === 0) continue;

    const isIncome = incomeAmt > 0;
    const amount = isIncome ? incomeAmt : expenseAmt;
    const skip = shouldSkip(txType, desc);

    // 규칙 적용: 저장된 규칙이 있으면 우선, 없으면 기본 분류
    const rule = ruleMap[desc];
    const category = rule ? rule.category : defaultCategory(txType, desc, isIncome);
    const payMethod = rule ? (rule.pay_method || defaultPayMethod(txType, desc)) : defaultPayMethod(txType, desc);
    const hasRule = !!rule;

    results.push({
      _id: uid(), _selected: !skip, _type: isIncome ? 'income' : 'expense',
      _skipped: skip, _skipReason: skip ? (desc.includes('신한카드') ? '카드 결제대금' : '자동 제외') : '',
      _hasRule: hasRule, _imageFile: null,
      date, client: desc, description: txType, amount, category, pay_method: payMethod, memo,
    });
  }
  return results;
}

// ═══════════════════════════════════════════
// 세무사 전달용 엑셀 내보내기
// ═══════════════════════════════════════════

function exportForTax(items) {
  const rows = items.filter(i => i._selected).map(i => ({
    '구분': i._type === 'income' ? '입금(매출)' : '출금(지출)',
    '날짜': i.date,
    '거래처': i.client,
    '금액': i.amount,
    '분류': i.category,
    '결제수단': i.pay_method || '',
    '메모': i.memo || '',
  }));
  if (rows.length === 0) return alert('내보낼 항목이 없습니다');
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '거래내역');
  XLSX.writeFile(wb, `오름히_거래내역_${today()}.xlsx`);
}

// ═══════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════

export default function BankUpload({ data, add, addBulk, remove, update, S }) {
  const [items, setItems] = useState([]);
  const [fileType, setFileType] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const ref = useRef();

  // 분류 규칙
  const rules = data.categoryRules || [];

  // 파일 처리
  const handleFile = (file) => {
    if (!file) return;
    setError(''); setResult(null); setItems([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const parsed = parseShinhanBank(rawData, rules);
        if (!parsed || parsed.length === 0) {
          setError('지원하지 않는 엑셀 양식입니다.\n현재 신한은행 체크카드/법인계좌 거래내역만 지원합니다.');
          return;
        }
        setFileType('신한은행 체크카드/법인계좌');
        setItems(parsed);
      } catch (err) { setError('엑셀 파일 읽기 실패: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleItem = (id) => setItems(p => p.map(i => i._id === id ? { ...i, _selected: !i._selected } : i));
  const toggleAll = () => {
    const sel = items.filter(i => !i._skipped);
    const allSel = sel.every(i => i._selected);
    setItems(p => p.map(i => i._skipped ? i : { ...i, _selected: !allSel }));
  };

  // ─── 분류 변경 + 규칙 저장 팝업 ───
  const handleCategoryChange = async (id, newCategory) => {
    const item = items.find(i => i._id === id);
    if (!item) return;
    setItems(p => p.map(i => i._id === id ? { ...i, category: newCategory } : i));

    // 규칙 저장 여부 확인
    const existingRule = rules.find(r => r.client === item.client);
    if (existingRule) {
      if (existingRule.category !== newCategory) {
        if (confirm(`"${item.client}"의 분류를 "${newCategory}"로 기억할까요?\n(기존: ${existingRule.category} → 변경: ${newCategory})`)) {
          await remove('categoryRules', existingRule.id);
          await add('categoryRules', { client: item.client, category: newCategory, pay_method: item.pay_method, type: item._type });
          // 같은 거래처의 다른 항목도 업데이트
          setItems(p => p.map(i => i.client === item.client && i._id !== id ? { ...i, category: newCategory, _hasRule: true } : i._id === id ? { ...i, _hasRule: true } : i));
        }
      }
    } else {
      if (confirm(`"${item.client}" = "${newCategory}"\n이 분류를 기억할까요?`)) {
        await add('categoryRules', { client: item.client, category: newCategory, pay_method: item.pay_method, type: item._type });
        setItems(p => p.map(i => i.client === item.client ? { ...i, category: newCategory, _hasRule: true } : i));
      }
    }
  };

  // ─── 결제수단 변경 ───
  const handlePayMethodChange = (id, value) => {
    setItems(p => p.map(i => i._id === id ? { ...i, pay_method: value } : i));
  };

  // ─── 메모 변경 ───
  const handleMemoChange = (id, value) => {
    setItems(p => p.map(i => i._id === id ? { ...i, memo: value } : i));
  };

  // ─── 영수증 첨부 (직접 또는 보관함) ───
  const [receiptPopup, setReceiptPopup] = useState(null); // item._id or null

  const handleReceipt = (id, file) => {
    if (!file) return;
    setItems(p => p.map(i => i._id === id ? { ...i, _imageFile: file, _linkedReceiptId: null } : i));
    setReceiptPopup(null);
  };

  const handleLinkReceipt = (itemId, receipt) => {
    setItems(p => p.map(i => i._id === itemId ? { ...i, _imageFile: null, _linkedReceiptId: receipt.id, _linkedReceiptUrl: receipt.image_url } : i));
    setReceiptPopup(null);
  };

  const unlinkedReceipts = (data.receiptStorage || []).filter(r => !r.linked);

  // ─── 규칙 삭제 ───
  const handleDeleteRule = async (ruleId) => {
    if (!confirm('이 분류 규칙을 삭제하시겠습니까?')) return;
    await remove('categoryRules', ruleId);
  };

  // ─── 규칙 수정 ───
  const handleEditRule = async (rule, newCategory) => {
    await remove('categoryRules', rule.id);
    await add('categoryRules', { client: rule.client, category: newCategory, pay_method: rule.pay_method, type: rule.type });
    setEditingRule(null);
  };

  // ─── 중복 체크 ───
  const isDuplicate = (item) => {
    const existing = item._type === 'income' ? data.revenue : data.expenses;
    return existing.some(e => e.date === item.date && Math.abs(Number(e.amount) - Number(item.amount)) < 1 && e.client === item.client);
  };

  // ─── 일괄 저장 ───
  const handleSave = async () => {
    if (saving) return; // 중복 클릭 방지
    const selected = items.filter(i => i._selected);
    if (selected.length === 0) return alert('저장할 항목을 선택해주세요');
    const dupes = selected.filter(isDuplicate);
    if (dupes.length > 0 && !confirm(`⚠️ ${dupes.length}건의 중복 항목이 있습니다.\n그래도 저장하시겠습니까?`)) return;

    setSaving(true);
    let totalSuccess = 0, totalFail = 0;

    // 영수증 이미지가 있는 항목은 먼저 업로드
    for (const item of selected) {
      if (item._imageFile) {
        const url = await uploadImage(item._imageFile);
        item._imageUrl = url;
      } else if (item._linkedReceiptUrl) {
        item._imageUrl = item._linkedReceiptUrl;
        // 보관함 영수증을 연결됨으로 표시
        if (item._linkedReceiptId) {
          await update('receiptStorage', item._linkedReceiptId, { linked: true, linked_expense_id: item._id });
        }
      }
    }

    const incomes = selected.filter(i => i._type === 'income').map(i => ({
      date: i.date, client: i.client, description: i.description, amount: i.amount,
      category: i.category, memo: i.memo, image_url: i._imageUrl || null,
    }));
    const expenses = selected.filter(i => i._type === 'expense').map(i => ({
      date: i.date, client: i.client, description: i.description, amount: i.amount,
      category: i.category, pay_method: i.pay_method, memo: i.memo, image_url: i._imageUrl || null,
    }));

    if (incomes.length > 0) { const r = await addBulk('revenue', incomes); totalSuccess += r.success; totalFail += r.fail; }
    if (expenses.length > 0) { const r = await addBulk('expenses', expenses); totalSuccess += r.success; totalFail += r.fail; }

    setResult({ success: totalSuccess, fail: totalFail, incomes: incomes.length, expenses: expenses.length });
    setSaving(false);
  };

  // 통계
  const selectedItems = items.filter(i => i._selected);
  const totalIncome = selectedItems.filter(i => i._type === 'income').reduce((s, i) => s + i.amount, 0);
  const totalExpense = selectedItems.filter(i => i._type === 'expense').reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageTitle>거래내역 업로드 (엑셀)</PageTitle>

      <div style={S.note}>
        · 신한은행 체크카드/법인계좌 거래내역 엑셀 파일을 올려주세요<br />
        · 저장된 분류 규칙에 따라 자동으로 분류됩니다 (수정 가능)<br />
        · 같은 파일을 다시 올리면 중복을 감지합니다<br />
        · 신용카드 이용내역은 추후 지원 예정입니다
      </div>

      {/* ═══ 분류 규칙 관리 ═══ */}
      <div style={{ ...S.card, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowRules(!showRules)}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>📋 분류 규칙 ({rules.length}개)</div>
          <span style={{ fontSize: 12, color: C.txd }}>{showRules ? '▲ 접기' : '▼ 펼치기'}</span>
        </div>

        {showRules && (
          <div style={{ marginTop: 12 }}>
            {rules.length === 0 ? (
              <div style={{ fontSize: 12, color: C.txm, padding: 10 }}>저장된 규칙이 없습니다. 거래내역 미리보기에서 분류를 변경하면 자동으로 규칙이 저장됩니다.</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {rules.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: `1px solid ${C.bd}`, fontSize: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{r.client}</span>
                      <span style={{ color: C.txd, margin: '0 8px' }}>→</span>
                      {editingRule === r.id ? (
                        <select style={miniSel} value={r.category} onChange={e => handleEditRule(r, e.target.value)}>
                          {(r.type === 'income' ? REV_CATS : [...EXP_CATS, '급여']).map(c => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: C.ok, fontWeight: 600 }}>{r.category}</span>
                      )}
                      {r.pay_method && <span style={{ color: C.txd, marginLeft: 8 }}>({r.pay_method})</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditingRule(editingRule === r.id ? null : r.id)} style={{ background: 'none', border: `1px solid ${C.ac}33`, borderRadius: 4, padding: '2px 8px', color: C.ac, cursor: 'pointer', fontSize: 10 }}>
                        {editingRule === r.id ? '취소' : '수정'}
                      </button>
                      <button onClick={() => handleDeleteRule(r.id)} style={{ background: 'none', border: `1px solid ${C.no}33`, borderRadius: 4, padding: '2px 8px', color: C.no, cursor: 'pointer', fontSize: 10 }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 파일 업로드 ═══ */}
      {items.length === 0 && !error && !result && (
        <div style={S.card}>
          <div onClick={() => ref.current?.click()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }} onDragOver={e => e.preventDefault()} onDragEnter={e => e.currentTarget.style.borderColor = C.ac} onDragLeave={e => e.currentTarget.style.borderColor = C.bd} style={{ border: `2px dashed ${C.bd}`, borderRadius: 12, padding: 50, textAlign: 'center', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.ac} onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}>
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
          <div style={{ color: C.no, fontWeight: 600 }}>⚠️ 오류</div>
          <div style={{ color: C.txd, fontSize: 13, whiteSpace: 'pre-line', marginTop: 4 }}>{error}</div>
          <button style={{ ...S.btn, marginTop: 12, background: C.sf2, color: C.txd }} onClick={() => { setError(''); setItems([]); }}>다시 시도</button>
        </div>
      )}

      {/* ═══ 저장 완료 ═══ */}
      {result && (
        <div style={{ ...S.card, borderColor: C.ok + '44' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ok, marginBottom: 10 }}>✅ 저장 완료</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div style={statBox}><div style={statLabel}>매출 등록</div><div style={{ ...statVal, color: C.ok }}>{result.incomes}건</div></div>
            <div style={statBox}><div style={statLabel}>지출 등록</div><div style={{ ...statVal, color: C.no }}>{result.expenses}건</div></div>
            <div style={statBox}><div style={statLabel}>성공 / 실패</div><div style={statVal}>{result.success} / {result.fail}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btn} onClick={() => { setItems([]); setResult(null); setFileType(''); }}>새 파일 업로드</button>
            <button style={{ ...S.btn, background: C.ok }} onClick={() => exportForTax(items)}>📊 세무사 전달용 엑셀 다운로드</button>
          </div>
        </div>
      )}

      {/* ═══ 미리보기 테이블 ═══ */}
      {items.length > 0 && !result && (
        <>
          <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>📋 {fileType}</div>
              <div style={{ fontSize: 12, color: C.txd, marginTop: 3 }}>
                총 {items.length}건 (입금 {items.filter(i => i._type === 'income').length}건 / 출금 {items.filter(i => i._type === 'expense').length}건)
                {items.filter(i => i._skipped).length > 0 && <span style={{ color: C.warn }}> · 자동 제외 {items.filter(i => i._skipped).length}건</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.btn, background: C.ok }} onClick={() => exportForTax(items)}>📊 세무사 엑셀</button>
              <button style={{ ...S.btn, background: C.sf2, color: C.txd }} onClick={() => { setItems([]); setFileType(''); }}>취소</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : `저장 (${selectedItems.length}건)`}</button>
            </div>
          </div>

          {/* 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>선택된 매출 ({selectedItems.filter(i => i._type === 'income').length}건)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ok }}>₩{fmt(totalIncome)}</div>
            </div>
            <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.txd }}>선택된 지출 ({selectedItems.filter(i => i._type === 'expense').length}건)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.no }}>₩{fmt(totalExpense)}</div>
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
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
                  <th style={th}>영수증</th>
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
                      <td style={td}><input type="checkbox" checked={item._selected} onChange={() => toggleItem(item._id)} disabled={skipped} /></td>
                      <td style={td}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: item._type === 'income' ? C.ok + '22' : C.no + '22', color: item._type === 'income' ? C.ok : C.no }}>
                          {item._type === 'income' ? '입금' : '출금'}
                        </span>
                      </td>
                      <td style={{ ...td, color: textColor, whiteSpace: 'nowrap', fontSize: 12 }}>{item.date}</td>
                      <td style={{ ...td, color: textColor, fontSize: 12, maxWidth: 180 }}>
                        {item.client}
                        {item._hasRule && <span style={{ fontSize: 9, color: C.ac, marginLeft: 4 }}>📋</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: item._type === 'income' ? C.ok : C.no, whiteSpace: 'nowrap' }}>₩{fmt(item.amount)}</td>
                      <td style={td}>
                        {skipped ? <span style={{ fontSize: 11, color: C.txm }}>{item._skipReason}</span> : (
                          <select style={miniSel} value={item.category} onChange={e => handleCategoryChange(item._id, e.target.value)}>
                            {(item._type === 'income' ? REV_CATS : [...EXP_CATS, '급여']).map(c => <option key={c}>{c}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={td}>
                        {!skipped && item._type === 'expense' && (
                          <select style={miniSel} value={item.pay_method} onChange={e => handlePayMethodChange(item._id, e.target.value)}>
                            {PAY_METHODS.map(p => <option key={p}>{p}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={td}>
                        {!skipped && <input style={miniInp} placeholder="메모" value={item.memo} onChange={e => handleMemoChange(item._id, e.target.value)} />}
                      </td>
                      <td style={{ ...td, position: 'relative' }}>
                        {!skipped && (
                          <>
                            {item._imageFile ? (
                              <span style={{ color: C.ok, fontSize: 13 }}>✅ 첨부</span>
                            ) : item._linkedReceiptUrl ? (
                              <span style={{ color: C.ok, fontSize: 13 }}>✅ 연결</span>
                            ) : (
                              <span onClick={() => setReceiptPopup(receiptPopup === item._id ? null : item._id)} style={{ cursor: 'pointer', color: C.txm, fontSize: 16 }}>📎</span>
                            )}
                            {receiptPopup === item._id && (
                              <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 8, padding: 8, minWidth: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                <label style={{ display: 'block', padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderRadius: 6, color: C.ac, fontWeight: 600 }}>
                                  📁 직접 첨부
                                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleReceipt(item._id, e.target.files?.[0])} />
                                </label>
                                {unlinkedReceipts.length > 0 && (
                                  <>
                                    <div style={{ fontSize: 10, color: C.txm, padding: '6px 10px 2px', borderTop: `1px solid ${C.bd}`, marginTop: 4 }}>📸 보관함에서 연결</div>
                                    <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                                      {unlinkedReceipts.map(r => (
                                        <div key={r.id} onClick={() => handleLinkReceipt(item._id, r)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 11 }} onMouseEnter={e => e.currentTarget.style.background = C.sf2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                          {r.image_url && <img src={r.image_url} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />}
                                          <div>
                                            <div>{r.client || '미입력'}</div>
                                            <div style={{ color: C.txm }}>{r.date}{r.amount > 0 ? ` · ₩${fmt(r.amount)}` : ''}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {unlinkedReceipts.length === 0 && (
                                  <div style={{ fontSize: 11, color: C.txm, padding: '4px 10px' }}>보관함에 영수증이 없습니다</div>
                                )}
                              </div>
                            )}
                          </>
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

          {/* 하단 버튼 */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={{ ...S.btn, background: C.ok }} onClick={() => exportForTax(items)}>📊 세무사 전달용 엑셀</button>
            <button style={{ ...S.btn, background: C.sf2, color: C.txd }} onClick={() => { setItems([]); setFileType(''); }}>취소</button>
            <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : `저장 (${selectedItems.length}건)`}</button>
          </div>
        </>
      )}
    </div>
  );
}

const th = { padding: '9px 10px', textAlign: 'left', fontSize: 11, color: '#8890a6', fontWeight: 700, borderBottom: '1px solid #2a2f42', whiteSpace: 'nowrap' };
const td = { padding: '7px 10px', borderBottom: '1px solid #2a2f42', fontSize: 12.5 };
const miniSel = { background: '#1e2230', border: '1px solid #2a2f42', borderRadius: 5, padding: '4px 6px', color: '#e4e7ed', fontSize: 11, outline: 'none' };
const miniInp = { background: '#1e2230', border: '1px solid #2a2f42', borderRadius: 5, padding: '4px 8px', color: '#e4e7ed', fontSize: 11, outline: 'none', width: 90 };
const statBox = { padding: 10, background: '#1e2230', borderRadius: 8, textAlign: 'center' };
const statLabel = { fontSize: 11, color: '#8890a6' };
const statVal = { fontSize: 18, fontWeight: 700 };
