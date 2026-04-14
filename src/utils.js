// ============================================
// 유틸리티 함수 모음
// ============================================

import * as XLSX from 'xlsx';

// 숫자 포맷
export const fmt = n => (!n && n !== 0) ? '0' : Number(n).toLocaleString('ko-KR');

// 날짜
export const today = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const thisYear = () => String(new Date().getFullYear());

// ID 생성
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 배열 합계
export const sumBy = (arr, field) => arr.reduce((s, i) => s + (Number(i[field]) || 0), 0);

// 월 필터
export const filterMonth = (arr, m, f = 'date') => arr.filter(i => i[f]?.startsWith(m));

// 연도 필터
export const filterYear = (arr, y, f = 'date') => arr.filter(i => i[f]?.startsWith(y));

// 정기지출 월간 환산
export const toMonthly = (amount, cycle) => {
  const a = Number(amount) || 0;
  if (cycle === '매년') return Math.round(a / 12);
  if (cycle === '매분기') return Math.round(a / 3);
  return a;
};

// ─── 급여 계산 ───
export function calcPayroll(base, bonus = 0, extra = 0) {
  const b = Number(base) || 0, bo = Number(bonus) || 0, ex = Number(extra) || 0;
  const gross = b + bo;
  const incomeTax = Math.round(gross * 0.033);
  const pension = Math.round(gross * 0.045);
  const health = Math.round(gross * 0.03545);
  const employ = Math.round(gross * 0.009);
  const totalDed = incomeTax + pension + health + employ + ex;
  return { gross, income_tax: incomeTax, pension, health, employ, total_ded: totalDed, net_pay: gross - totalDed };
}

// ─── 엑셀 내보내기 ───
export function exportToExcel(data, sheetName, fileName) {
  if (!data || data.length === 0) return alert('내보낼 데이터가 없습니다');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${today()}.xlsx`);
}

// 전체 데이터 엑셀 내보내기 (백업용)
export function exportAllToExcel(allData) {
  const wb = XLSX.utils.book_new();
  const sheets = {
    '매출': allData.revenue, '지출': allData.expenses, '정기지출': allData.recurring,
    '통장': allData.bank, '거래처': allData.clients, '세금계산서': allData.taxInvoices,
    '급여': allData.payroll, '계약': allData.contracts, '증빙': allData.documents,
    '메모': allData.notes, '예산': allData.budgets,
  };
  Object.entries(sheets).forEach(([name, data]) => {
    if (data && data.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name);
    }
  });
  XLSX.writeFile(wb, `오름히_회계백업_${today()}.xlsx`);
}

// ─── 중복 입력 감지 ───
export function checkDuplicate(items, newItem) {
  return items.find(i =>
    i.date === newItem.date &&
    Math.abs(Number(i.amount) - Number(newItem.amount)) < 1 &&
    i.client === newItem.client &&
    i.id !== newItem.id
  );
}

// ─── 전체 검색 ───
export function searchAll(data, query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  const searchIn = (items, type) => {
    items.forEach(item => {
      const text = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
      if (text.includes(q)) {
        results.push({ ...item, _type: type });
      }
    });
  };
  searchIn(data.revenue, '매출');
  searchIn(data.expenses, '지출');
  searchIn(data.recurring, '정기지출');
  searchIn(data.bank, '통장');
  searchIn(data.clients, '거래처');
  searchIn(data.taxInvoices, '세금계산서');
  searchIn(data.payroll, '급여');
  searchIn(data.contracts, '계약');
  searchIn(data.documents, '증빙');
  searchIn(data.notes, '메모');
  return results.slice(0, 30);
}

// ─── 간단한 비밀번호 해싱 (PIN용) ───
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'oremhi_salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
