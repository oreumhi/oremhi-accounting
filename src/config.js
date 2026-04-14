// ============================================
// 설정: 색상, 스타일, 상수
// 카테고리/결제수단/탭을 변경하려면 이 파일을 수정하세요
// ============================================

// ─── 색상 ───
export const C = {
  bg:'#0c0e14', sf:'#151820', sf2:'#1e2230', sf3:'#272b3a', bd:'#2a2f42',
  ac:'#5b8def', ok:'#3dd9a0', no:'#f07070', warn:'#f5a445', yel:'#f0c746',
  pur:'#9d7ff0', pink:'#ed6ea0', cyan:'#45c8dc',
  tx:'#e4e7ed', txd:'#8890a6', txm:'#555c74',
};

// ─── 글자 크기 ───
export const FONT_SIZES = { small: 13, medium: 14, large: 16, xlarge: 18 };

// ─── 스타일 생성 함수 (글자크기 반영) ───
export function getStyles(fontSize = 14) {
  return {
    card: { background:C.sf, border:`1px solid ${C.bd}`, borderRadius:14, padding:20, marginBottom:14, fontSize },
    inp: { background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:8, padding:'10px 14px', color:C.tx, fontSize, outline:'none', width:'100%', boxSizing:'border-box' },
    sel: { background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:8, padding:'10px 14px', color:C.tx, fontSize, outline:'none', width:'100%', boxSizing:'border-box' },
    btn: { background:C.ac, color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize },
    btnO: a => ({ background:a?C.ac:'transparent', color:a?'#fff':C.ac, border:`1px solid ${C.ac}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:fontSize-1, fontWeight:500 }),
    tbl: { width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize },
    th: { padding:'11px 13px', textAlign:'left', fontSize:fontSize-3, color:C.txd, fontWeight:700, borderBottom:`1px solid ${C.bd}`, letterSpacing:0.5 },
    td: { padding:'10px 13px', borderBottom:`1px solid ${C.bd}`, fontSize:fontSize-0.5 },
    del: { background:'none', border:'none', color:C.txm, cursor:'pointer', fontSize:fontSize },
    note: { background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:10, padding:14, marginBottom:12, fontSize:fontSize-2, color:C.txd },
    badge: c => ({ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:fontSize-3, fontWeight:600, background:c+'20', color:c }),
  };
}

// ─── 탭 ───
export const TABS = [
  { id:'dashboard', label:'대시보드', icon:'📊' },
  { id:'revenue', label:'매출관리', icon:'📈' },
  { id:'expense', label:'지출관리', icon:'💳' },
  { id:'recurring', label:'정기지출', icon:'🔄' },
  { id:'bank', label:'통장관리', icon:'🏦' },
  { id:'clients', label:'거래처', icon:'🏢' },
  { id:'tax', label:'세금계산서', icon:'📄' },
  { id:'vat', label:'부가세', icon:'🧾' },
  { id:'payroll', label:'급여/원천세', icon:'👤' },
  { id:'budget', label:'예산관리', icon:'🎯' },
  { id:'reports', label:'리포트/분석', icon:'📋' },
  { id:'contracts', label:'계약/견적', icon:'📝' },
  { id:'docs', label:'증빙관리', icon:'📂' },
  { id:'receipt', label:'영수증스캔', icon:'📸' },
  { id:'notes', label:'메모장', icon:'📌' },
  { id:'settings', label:'설정', icon:'⚙️' },
];

// ─── 카테고리 ───
export const EXP_CATS = ['광고비','사무용품','통신비','교통비','주유비','주차비','식대','배달비','접대비','임대료','수도광열비','보험료','세금공과','수리비','택배비','도서인쇄비','교육훈련비','경조사비','소모품','구독료','복리후생비','감가상각비','기타'];
export const REV_CATS = ['광고대행수수료','컨설팅비','디자인제작비','영상제작비','미디어커미션','기타매출'];
export const PAY_METHODS = ['법인카드','개인카드','체크카드','현금','계좌이체','네이버페이','카카오페이','배달의민족','쿠팡페이','토스','기타'];
export const REC_TYPES = ['구독서비스','임대료','보험료','통신비','수도광열비','대출이자','리스료','유지보수비','기타'];
export const REC_CYCLES = ['매월','매분기','매년'];
export const DOC_TYPES = ['세금계산서','카드전표','현금영수증','간이영수증','계좌이체확인서','계약서','견적서','거래명세서','기타'];
export const CON_TYPES = ['계약서','견적서','발주서','용역계약','기타'];
export const CON_STATUSES = ['진행중','완료','대기','취소'];
export const TAX_STATUSES = ['발행완료','미발행','수정발행'];
export const DOC_STATUSES = ['보관완료','미수취','분실','재발행요청'];
export const VAT_Q = { 1:['01','02','03'], 2:['04','05','06'], 3:['07','08','09'], 4:['10','11','12'] };

// ─── 세금 신고 마감일 ───
export function getTaxDeadlines() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const deadlines = [
    { name: '원천세 신고', day: 10, months: [1,2,3,4,5,6,7,8,9,10,11,12], desc: '매월 10일' },
    { name: '부가세 확정신고', day: 25, months: [1,7], desc: '1월/7월 25일' },
    { name: '부가세 예정신고', day: 25, months: [4,10], desc: '4월/10월 25일' },
    { name: '법인세 신고', day: 31, months: [3], desc: '3월 31일' },
    { name: '연말정산', day: 10, months: [3], desc: '3월 10일' },
  ];
  const upcoming = [];
  deadlines.forEach(d => {
    d.months.forEach(dm => {
      let date;
      if (dm >= m) date = new Date(y, dm - 1, d.day);
      else date = new Date(y + 1, dm - 1, d.day);
      const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 60) {
        upcoming.push({ ...d, date: date.toISOString().slice(0, 10), daysLeft: diff });
      }
    });
  });
  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
}

// 결제수단 색상
export function pmColor(m) {
  if (['법인카드','개인카드','체크카드'].includes(m)) return C.ac;
  if (['네이버페이','카카오페이','토스','쿠팡페이'].includes(m)) return C.pur;
  if (m === '배달의민족') return C.cyan;
  return C.warn;
}
