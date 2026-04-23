// ============================================
// 모바일 최적화 앱
//
// 탭 구성:
//   홈     - 대시보드 (매출/지출 총액 + TOP10 + 카테고리 요약)
//   지출   - 빠른 지출 등록 + 목록 (수정/삭제)
//   📸    - 영수증 촬영 + 갤러리 (수정/삭제)
//   체크   - 사유 미입력 목록 + 최근 거래
//   메모   - 메모 CRUD
//
// 추후 수정 용이하도록 각 탭을 독립 함수로 분리
// ============================================

import React, { useState, useMemo, useRef } from 'react';
import { C, EXP_CATS, REV_CATS, PAY_METHODS } from '../config';
import { fmt, today, uid, sumBy, filterMonth } from '../utils';
import { uploadImage, scanReceipt } from '../store';

// ═══════════════════════════════════════════
// 공통 스타일
// ═══════════════════════════════════════════

const MB = {
  page: { padding:'16px 16px 90px', minHeight:'100vh', background:C.bg },
  card: { background:C.sf, border:`1px solid ${C.bd}`, borderRadius:14, padding:16, marginBottom:12 },
  inp: { background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:10, padding:'12px 14px', color:C.tx, fontSize:16, outline:'none', width:'100%', boxSizing:'border-box' },
  sel: { background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:10, padding:'12px 14px', color:C.tx, fontSize:16, outline:'none', width:'100%', boxSizing:'border-box', appearance:'auto' },
  btn: { background:C.ac, color:'#fff', border:'none', borderRadius:10, padding:'14px 0', cursor:'pointer', fontWeight:700, fontSize:16, width:'100%' },
  btnSm: { background:C.ac, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13 },
  btnDel: { background:C.no, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13 },
  btnGhost: { background:'transparent', border:`1px solid ${C.bd}`, borderRadius:8, padding:'8px 16px', cursor:'pointer', color:C.txd, fontSize:13 },
  label: { fontSize:12, color:C.txd, marginBottom:5, display:'block' },
  title: { fontSize:20, fontWeight:800, marginBottom:16 },
  subtitle: { fontSize:15, fontWeight:700, marginBottom:10 },
  divider: { height:1, background:C.bd, margin:'12px 0' },
};

// ═══════════════════════════════════════════
// 탭 1: 홈 (대시보드)
// ═══════════════════════════════════════════

function HomeTab({ data }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const { revenue, expenses } = data;

  const monthRevenue = useMemo(() => filterMonth(revenue, month), [revenue, month]);
  const monthExpenses = useMemo(() => filterMonth(expenses, month), [expenses, month]);
  const totalRev = sumBy(monthRevenue, 'amount');
  const totalExp = sumBy(monthExpenses, 'amount');

  // 지출 TOP10 (거래처별)
  const expTop10 = useMemo(() => {
    const map = {};
    monthExpenses.forEach(e => {
      const k = e.client || e.description || '기타';
      map[k] = (map[k] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [monthExpenses]);

  // 매출 TOP10 (거래처별)
  const revTop10 = useMemo(() => {
    const map = {};
    monthRevenue.forEach(r => {
      const k = r.client || r.description || '기타';
      map[k] = (map[k] || 0) + Number(r.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [monthRevenue]);

  // 카테고리별 지출
  const catSummary = useMemo(() => {
    const map = {};
    monthExpenses.forEach(e => {
      const k = e.category || '기타';
      map[k] = (map[k] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // 사유 미입력 건수
  const noMemoCount = monthExpenses.filter(e => !e.memo || e.memo.trim() === '').length;

  const maxCat = catSummary.length > 0 ? catSummary[0][1] : 1;

  return (
    <div style={MB.page}>
      {/* 월 선택 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={MB.title}>📊 대시보드</div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...MB.inp, width:'auto', fontSize:13, padding:'8px 12px' }} />
      </div>

      {/* 사유 미입력 알림 */}
      {noMemoCount > 0 && (
        <div style={{ background:C.warn+'15', border:`1px solid ${C.warn}44`, borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontSize:13, color:C.warn, fontWeight:600 }}>사유 미입력 {noMemoCount}건</span>
        </div>
      )}

      {/* 매출/지출 총액 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ ...MB.card, textAlign:'center', padding:14 }}>
          <div style={{ fontSize:12, color:C.txd }}>이번 달 매출</div>
          <div style={{ fontSize:20, fontWeight:800, color:C.ok, marginTop:4 }}>₩{fmt(totalRev)}</div>
          <div style={{ fontSize:11, color:C.txd, marginTop:2 }}>{monthRevenue.length}건</div>
        </div>
        <div style={{ ...MB.card, textAlign:'center', padding:14 }}>
          <div style={{ fontSize:12, color:C.txd }}>이번 달 지출</div>
          <div style={{ fontSize:20, fontWeight:800, color:C.no, marginTop:4 }}>₩{fmt(totalExp)}</div>
          <div style={{ fontSize:11, color:C.txd, marginTop:2 }}>{monthExpenses.length}건</div>
        </div>
      </div>

      {/* 카테고리별 지출 */}
      {catSummary.length > 0 && (
        <div style={MB.card}>
          <div style={MB.subtitle}>📂 카테고리별 지출</div>
          {catSummary.map(([cat, amt]) => (
            <div key={cat} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                <span>{cat}</span>
                <span style={{ fontWeight:600 }}>₩{fmt(amt)}</span>
              </div>
              <div style={{ background:C.sf2, borderRadius:4, height:6, overflow:'hidden' }}>
                <div style={{ width:`${(amt / maxCat) * 100}%`, height:'100%', background:C.ac, borderRadius:4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 지출 TOP10 */}
      {expTop10.length > 0 && (
        <div style={MB.card}>
          <div style={MB.subtitle}>🔥 지출 TOP10</div>
          {expTop10.map(([name, amt], i) => (
            <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i < expTop10.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:i < 3 ? C.no : C.txd, width:20 }}>{i + 1}</span>
                <span style={{ fontSize:13 }}>{name}</span>
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:C.no }}>₩{fmt(amt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 매출 TOP10 */}
      {revTop10.length > 0 && (
        <div style={MB.card}>
          <div style={MB.subtitle}>💰 매출 TOP10</div>
          {revTop10.map(([name, amt], i) => (
            <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i < revTop10.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:i < 3 ? C.ok : C.txd, width:20 }}>{i + 1}</span>
                <span style={{ fontSize:13 }}>{name}</span>
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:C.ok }}>₩{fmt(amt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 탭 2: 지출 (등록 + 목록 + 수정/삭제)
// ═══════════════════════════════════════════

function ExpenseTab({ data, add, remove, update }) {
  const { expenses, clients } = data;
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [f, sF] = useState({ date:today(), client:'', description:'', amount:'', category:'식대', pay_method:'법인카드', memo:'' });

  const recent = useMemo(() => [...expenses].reverse().slice(0, 30), [expenses]);

  const resetForm = () => sF({ date:today(), client:'', description:'', amount:'', category:'식대', pay_method:'법인카드', memo:'' });

  const handleSubmit = async () => {
    if (!f.amount) return alert('금액을 입력해주세요');
    if (editItem) {
      await update('expenses', editItem.id, { ...f, amount:Number(f.amount) });
      setEditItem(null);
    } else {
      await add('expenses', { ...f, amount:Number(f.amount) });
    }
    resetForm();
    setShowForm(false);
  };

  const startEdit = (item) => {
    sF({ date:item.date || today(), client:item.client || '', description:item.description || '', amount:String(item.amount || ''), category:item.category || '식대', pay_method:item.pay_method || '법인카드', memo:item.memo || '' });
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (confirm(`"${item.client || item.description}" ₩${fmt(item.amount)}을 삭제하시겠습니까?`)) {
      await remove('expenses', item.id);
    }
  };

  return (
    <div style={MB.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={MB.title}>💳 지출 관리</div>
        <button onClick={() => { resetForm(); setEditItem(null); setShowForm(!showForm); }} style={{ ...MB.btnSm, background:showForm ? C.txm : C.ac }}>
          {showForm ? '닫기' : '+ 등록'}
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div style={{ ...MB.card, borderColor:editItem ? C.warn+'66' : C.ac+'44' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12, color:editItem ? C.warn : C.ac }}>
            {editItem ? '✏️ 수정' : '➕ 새 지출 등록'}
          </div>
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <label style={MB.label}>날짜</label>
              <input type="date" style={MB.inp} value={f.date} onChange={e => sF({...f, date:e.target.value})} />
            </div>
            <div>
              <label style={MB.label}>거래처</label>
              <input style={MB.inp} placeholder="예: 스타벅스" value={f.client} onChange={e => sF({...f, client:e.target.value})} list="m-clients" />
              <datalist id="m-clients">{(clients || []).map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={MB.label}>금액</label>
                <input type="number" style={MB.inp} placeholder="금액" value={f.amount} onChange={e => sF({...f, amount:e.target.value})} />
              </div>
              <div>
                <label style={MB.label}>분류</label>
                <select style={MB.sel} value={f.category} onChange={e => sF({...f, category:e.target.value})}>{EXP_CATS.map(c => <option key={c}>{c}</option>)}</select>
              </div>
            </div>
            <div>
              <label style={MB.label}>결제수단</label>
              <select style={MB.sel} value={f.pay_method} onChange={e => sF({...f, pay_method:e.target.value})}>{PAY_METHODS.map(p => <option key={p}>{p}</option>)}</select>
            </div>
            <div>
              <label style={MB.label}>내용</label>
              <input style={MB.inp} placeholder="무엇을 구매했는지" value={f.description} onChange={e => sF({...f, description:e.target.value})} />
            </div>
            <div>
              <label style={MB.label}>메모 (누구랑, 왜)</label>
              <input style={MB.inp} placeholder="예: 클라이언트 미팅 식사" value={f.memo} onChange={e => sF({...f, memo:e.target.value})} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...MB.btn, flex:1 }} onClick={handleSubmit}>{editItem ? '수정 완료' : '등록'}</button>
              {editItem && <button style={{ ...MB.btnDel, padding:'13px 20px' }} onClick={() => { setEditItem(null); resetForm(); setShowForm(false); }}>취소</button>}
            </div>
          </div>
        </div>
      )}

      {/* 최근 지출 목록 */}
      <div style={MB.subtitle}>최근 지출 ({recent.length}건)</div>
      {recent.length === 0 ? (
        <div style={{ ...MB.card, textAlign:'center', color:C.txm, padding:30 }}>등록된 지출이 없습니다</div>
      ) : recent.map(item => (
        <div key={item.id} style={{ ...MB.card, padding:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{item.client || item.description || '-'}</div>
              <div style={{ fontSize:11, color:C.txd, marginTop:3 }}>
                {item.date} · {item.category || '미분류'}
                {item.pay_method && <span> · {item.pay_method}</span>}
              </div>
              {item.memo && <div style={{ fontSize:12, color:C.txd, marginTop:3 }}>💬 {item.memo}</div>}
              {!item.memo && <div style={{ fontSize:11, color:C.warn, marginTop:3 }}>⚠️ 사유 미입력</div>}
            </div>
            <div style={{ textAlign:'right', flexShrink:0, marginLeft:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.no }}>₩{fmt(item.amount)}</div>
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                <button onClick={() => startEdit(item)} style={{ background:'none', border:`1px solid ${C.ac}44`, borderRadius:6, padding:'4px 10px', color:C.ac, fontSize:11, cursor:'pointer' }}>수정</button>
                <button onClick={() => handleDelete(item)} style={{ background:'none', border:`1px solid ${C.no}44`, borderRadius:6, padding:'4px 10px', color:C.no, fontSize:11, cursor:'pointer' }}>삭제</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 탭 3: 영수증 보관함
//
// 흐름:
//   모바일: 촬영 → AI 스캔 시도 → 수동 폴백 → 보관함 저장
//   PC: 엑셀 업로드 시 보관함에서 영수증 연결
// ═══════════════════════════════════════════

function ReceiptTab({ data, add, remove, update }) {
  const receipts = data.receiptStorage || [];
  const [capturing, setCapturing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [editId, setEditId] = useState(null);
  const [f, sF] = useState({ date: today(), client: '', amount: '', memo: '' });
  const fileRef = useRef();
  const galleryRef = useRef();

  const sorted = useMemo(() => {
    const unlinked = receipts.filter(r => !r.linked);
    const linked = receipts.filter(r => r.linked);
    return [...unlinked.reverse(), ...linked.reverse()];
  }, [receipts]);

  const unlinkedCount = receipts.filter(r => !r.linked).length;

  // 촬영 후 처리
  const handleCapture = async (file) => {
    if (!file) return;
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCapturedPreview(e.target.result);
    reader.readAsDataURL(file);
    setCapturing(true);
    setAiResult(null);

    // AI 스캔 시도
    setScanning(true);
    const result = await scanReceipt(file);
    setScanning(false);

    if (result && result.date) {
      setAiResult(result);
      sF({
        date: result.date || today(),
        client: result.client || '',
        amount: String(result.amount || ''),
        memo: result.description || '',
      });
    } else {
      sF({ date: today(), client: '', amount: '', memo: '' });
    }
  };

  // 보관함에 저장
  const handleSave = async () => {
    if (!capturedFile) return;
    const image_url = await uploadImage(capturedFile);
    if (!image_url) return alert('이미지 업로드 실패');

    await add('receiptStorage', {
      image_url,
      date: f.date || today(),
      amount: Number(f.amount) || 0,
      client: f.client || '',
      memo: f.memo || '',
      linked: false,
      linked_expense_id: null,
    });

    sF({ date: today(), client: '', amount: '', memo: '' });
    setCapturedFile(null);
    setCapturedPreview(null);
    setCapturing(false);
    setAiResult(null);
  };

  // 수정
  const startEdit = (item) => {
    sF({ date: item.date || '', client: item.client || '', amount: String(item.amount || ''), memo: item.memo || '' });
    setEditId(item.id);
  };

  const handleUpdate = async () => {
    await update('receiptStorage', editId, { date: f.date, client: f.client, amount: Number(f.amount) || 0, memo: f.memo });
    setEditId(null);
    sF({ date: today(), client: '', amount: '', memo: '' });
  };

  // 삭제
  const handleDelete = async (item) => {
    if (confirm('이 영수증을 삭제하시겠습니까?')) {
      await remove('receiptStorage', item.id);
    }
  };

  return (
    <div style={MB.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={MB.title}>📸 영수증 보관함</div>
        {unlinkedCount > 0 && (
          <span style={{ fontSize: 12, color: C.warn, fontWeight: 600 }}>미연결 {unlinkedCount}건</span>
        )}
      </div>

      {!capturing ? (
        <>
          {/* 촬영 + 갤러리 버튼 */}
          <div style={{ ...MB.card, textAlign: 'center', padding: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div onClick={() => fileRef.current?.click()} style={{ flex: 1, cursor: 'pointer', padding: 20, background: C.sf2, borderRadius: 12, border: `1px solid ${C.bd}` }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ac }}>촬영하기</div>
                <div style={{ fontSize: 11, color: C.txd, marginTop: 3 }}>카메라로 촬영</div>
              </div>
              <div onClick={() => galleryRef.current?.click()} style={{ flex: 1, cursor: 'pointer', padding: 20, background: C.sf2, borderRadius: 12, border: `1px solid ${C.bd}` }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ac }}>앨범에서 선택</div>
                <div style={{ fontSize: 11, color: C.txd, marginTop: 3 }}>저장된 사진 업로드</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.txm, marginTop: 10 }}>보관함에 저장 → PC에서 거래내역과 연결</div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCapture(e.target.files[0])} />
            <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCapture(e.target.files[0])} />
          </div>

          {/* 보관함 목록 */}
          {sorted.length > 0 && (
            <>
              <div style={MB.subtitle}>📋 보관함 ({sorted.length}건)</div>
              {sorted.map(item => (
                <div key={item.id} style={{ ...MB.card, padding: 12, borderColor: item.linked ? C.ok + '33' : C.bd }}>
                  {editId === item.id ? (
                    /* 수정 모드 */
                    <div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        {item.image_url && <img src={item.image_url} alt="영수증" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.bd}` }} />}
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.warn }}>✏️ 수정 중</div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={MB.label}>날짜</label>
                            <input type="date" style={{ ...MB.inp, fontSize: 14, padding: '10px 12px' }} value={f.date} onChange={e => sF({ ...f, date: e.target.value })} />
                          </div>
                          <div>
                            <label style={MB.label}>금액</label>
                            <input type="number" style={{ ...MB.inp, fontSize: 14, padding: '10px 12px' }} value={f.amount} onChange={e => sF({ ...f, amount: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label style={MB.label}>거래처</label>
                          <input style={{ ...MB.inp, fontSize: 14, padding: '10px 12px' }} value={f.client} onChange={e => sF({ ...f, client: e.target.value })} />
                        </div>
                        <div>
                          <label style={MB.label}>메모</label>
                          <input style={{ ...MB.inp, fontSize: 14, padding: '10px 12px' }} value={f.memo} onChange={e => sF({ ...f, memo: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...MB.btnSm, flex: 1 }} onClick={handleUpdate}>수정 완료</button>
                          <button style={MB.btnGhost} onClick={() => setEditId(null)}>취소</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 보기 모드 */
                    <div style={{ display: 'flex', gap: 12 }}>
                      {item.image_url && <img src={item.image_url} alt="영수증" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.bd}` }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{item.client || '거래처 미입력'}</span>
                          {item.linked ? (
                            <span style={{ fontSize: 9, background: C.ok + '22', color: C.ok, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>연결됨</span>
                          ) : (
                            <span style={{ fontSize: 9, background: C.warn + '22', color: C.warn, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>미연결</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: C.txd, marginTop: 2 }}>
                          {item.date || '날짜 미입력'}
                          {item.amount > 0 && <span> · ₩{fmt(item.amount)}</span>}
                        </div>
                        {item.memo && <div style={{ fontSize: 11, color: C.txm, marginTop: 2 }}>💬 {item.memo}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => startEdit(item)} style={{ background: 'none', border: `1px solid ${C.ac}44`, borderRadius: 6, padding: '4px 10px', color: C.ac, fontSize: 11, cursor: 'pointer' }}>수정</button>
                        <button onClick={() => handleDelete(item)} style={{ background: 'none', border: `1px solid ${C.no}44`, borderRadius: 6, padding: '4px 10px', color: C.no, fontSize: 11, cursor: 'pointer' }}>삭제</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {sorted.length === 0 && (
            <div style={{ ...MB.card, textAlign: 'center', color: C.txm, padding: 20, fontSize: 13 }}>
              보관함이 비어있습니다. 영수증을 촬영해주세요.
            </div>
          )}
        </>
      ) : (
        /* 촬영 후: 미리보기 + 입력 */
        <div style={MB.card}>
          {scanning ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 30, marginBottom: 10, animation: 'pulse 1.5s ease infinite' }}>🔍</div>
              <div style={{ fontSize: 14, color: C.ac, fontWeight: 600 }}>영수증을 분석하고 있습니다...</div>
              <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.95)}}`}</style>
            </div>
          ) : (
            <>
              {aiResult ? (
                <div style={{ background: C.ok + '12', border: `1px solid ${C.ok}33`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.ok, fontWeight: 600 }}>
                  ✅ AI 자동 인식 완료 — 확인 후 저장해주세요
                </div>
              ) : (
                <div style={{ background: C.warn + '12', border: `1px solid ${C.warn}33`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.warn }}>
                  📝 자동 인식 불가 — 직접 입력해주세요
                </div>
              )}

              {capturedPreview && (
                <img src={capturedPreview} alt="미리보기" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginBottom: 12, background: C.sf2 }} />
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={MB.label}>날짜</label>
                    <input type="date" style={MB.inp} value={f.date} onChange={e => sF({ ...f, date: e.target.value })} />
                  </div>
                  <div>
                    <label style={MB.label}>금액</label>
                    <input type="number" style={MB.inp} placeholder="금액" value={f.amount} onChange={e => sF({ ...f, amount: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={MB.label}>거래처</label>
                  <input style={MB.inp} placeholder="가게 이름" value={f.client} onChange={e => sF({ ...f, client: e.target.value })} />
                </div>
                <div>
                  <label style={MB.label}>메모 (누구랑, 왜)</label>
                  <input style={MB.inp} placeholder="예: 클라이언트 미팅 식사" value={f.memo} onChange={e => sF({ ...f, memo: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...MB.btn, flex: 1 }} onClick={handleSave}>보관함에 저장</button>
                  <button style={{ ...MB.btnGhost, padding: '14px 20px' }} onClick={() => { setCapturing(false); setCapturedFile(null); setCapturedPreview(null); setAiResult(null); }}>취소</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 탭 4: 체크 (사유 미입력 + 최근 거래)
// ═══════════════════════════════════════════

function CheckTab({ data, update }) {
  const { expenses, revenue } = data;
  const [editMemo, setEditMemo] = useState({});

  // 사유 미입력 (메모 없는 지출)
  const noMemo = useMemo(() => expenses.filter(e => !e.memo || e.memo.trim() === '').reverse().slice(0, 50), [expenses]);

  // 최근 전체 거래 (매출+지출 합쳐서)
  const recentAll = useMemo(() => {
    const all = [
      ...revenue.map(r => ({ ...r, _type: 'income' })),
      ...expenses.map(e => ({ ...e, _type: 'expense' })),
    ];
    return all.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);
  }, [revenue, expenses]);

  const saveMemo = async (item) => {
    const memo = editMemo[item.id];
    if (!memo || memo.trim() === '') return;
    await update('expenses', item.id, { memo: memo.trim() });
    setEditMemo(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  };

  return (
    <div style={MB.page}>
      <div style={MB.title}>✅ 체크</div>

      {/* 사유 미입력 */}
      <div style={{ ...MB.subtitle, color:C.warn }}>⚠️ 사유 미입력 ({noMemo.length}건)</div>
      {noMemo.length === 0 ? (
        <div style={{ ...MB.card, textAlign:'center', color:C.ok, padding:20 }}>👍 모든 지출에 사유가 입력되어 있습니다</div>
      ) : noMemo.slice(0, 20).map(item => (
        <div key={item.id} style={{ ...MB.card, padding:12, borderColor:C.warn+'33' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{item.client || item.description || '-'}</div>
              <div style={{ fontSize:11, color:C.txd }}>{item.date} · {item.category}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.no }}>₩{fmt(item.amount)}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              style={{ ...MB.inp, fontSize:13, padding:'9px 12px' }}
              placeholder="누구랑, 왜 사용했는지 입력"
              value={editMemo[item.id] || ''}
              onChange={e => setEditMemo(prev => ({ ...prev, [item.id]: e.target.value }))}
            />
            <button onClick={() => saveMemo(item)} disabled={!editMemo[item.id]} style={{ ...MB.btnSm, opacity:editMemo[item.id] ? 1 : 0.4, whiteSpace:'nowrap' }}>입력</button>
          </div>
        </div>
      ))}

      {noMemo.length > 20 && <div style={{ fontSize:12, color:C.txd, textAlign:'center', marginBottom:12 }}>+ {noMemo.length - 20}건 더 있음</div>}

      {/* 최근 거래 내역 */}
      <div style={{ ...MB.divider, margin:'20px 0' }} />
      <div style={MB.subtitle}>📋 최근 거래 내역</div>
      {recentAll.map(item => (
        <div key={item.id + item._type} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.bd}` }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500 }}>{item.client || item.description || '-'}</div>
            <div style={{ fontSize:11, color:C.txd }}>{item.date} · {item.category || '-'}</div>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:item._type === 'income' ? C.ok : C.no }}>
            {item._type === 'income' ? '+' : '-'}₩{fmt(item.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 탭 5: 메모
// ═══════════════════════════════════════════

function MemoTab({ data, add, remove, update }) {
  const { notes } = data;
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [f, sF] = useState({ title:'', content:'' });

  const sorted = useMemo(() => [...(notes || [])].reverse(), [notes]);

  const handleSubmit = async () => {
    if (!f.title && !f.content) return alert('내용을 입력해주세요');
    if (editItem) {
      await update('notes', editItem.id, f);
      setEditItem(null);
    } else {
      await add('notes', { ...f, date: today() });
    }
    sF({ title:'', content:'' });
    setShowForm(false);
  };

  const startEdit = (item) => {
    sF({ title: item.title || '', content: item.content || '' });
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      await remove('notes', item.id);
    }
  };

  return (
    <div style={MB.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={MB.title}>📝 메모</div>
        <button onClick={() => { sF({ title:'', content:'' }); setEditItem(null); setShowForm(!showForm); }} style={{ ...MB.btnSm, background:showForm ? C.txm : C.ac }}>
          {showForm ? '닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 메모 작성/수정 */}
      {showForm && (
        <div style={{ ...MB.card, borderColor:editItem ? C.warn+'66' : C.ac+'44' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12, color:editItem ? C.warn : C.ac }}>
            {editItem ? '✏️ 수정' : '➕ 새 메모'}
          </div>
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <label style={MB.label}>제목</label>
              <input style={MB.inp} placeholder="메모 제목" value={f.title} onChange={e => sF({...f, title:e.target.value})} />
            </div>
            <div>
              <label style={MB.label}>내용</label>
              <textarea style={{ ...MB.inp, minHeight:100, resize:'vertical', fontFamily:'inherit' }} placeholder="메모 내용" value={f.content} onChange={e => sF({...f, content:e.target.value})} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...MB.btn, flex:1 }} onClick={handleSubmit}>{editItem ? '수정 완료' : '저장'}</button>
              {editItem && <button style={{ ...MB.btnGhost, padding:'13px 20px' }} onClick={() => { setEditItem(null); sF({ title:'', content:'' }); setShowForm(false); }}>취소</button>}
            </div>
          </div>
        </div>
      )}

      {/* 메모 목록 */}
      {sorted.length === 0 ? (
        <div style={{ ...MB.card, textAlign:'center', color:C.txm, padding:30 }}>메모가 없습니다</div>
      ) : sorted.map(item => (
        <div key={item.id} style={{ ...MB.card, padding:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              {item.title && <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{item.title}</div>}
              {item.content && <div style={{ fontSize:13, color:C.txd, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{item.content}</div>}
              <div style={{ fontSize:10, color:C.txm, marginTop:4 }}>{item.date || ''}</div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:10 }}>
              <button onClick={() => startEdit(item)} style={{ background:'none', border:`1px solid ${C.ac}44`, borderRadius:6, padding:'4px 10px', color:C.ac, fontSize:11, cursor:'pointer' }}>수정</button>
              <button onClick={() => handleDelete(item)} style={{ background:'none', border:`1px solid ${C.no}44`, borderRadius:6, padding:'4px 10px', color:C.no, fontSize:11, cursor:'pointer' }}>삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 하단 네비게이션
// ═══════════════════════════════════════════

const NAV_ITEMS = [
  { id:'home', icon:'🏠', label:'홈' },
  { id:'expense', icon:'💳', label:'지출' },
  { id:'receipt', icon:'📸', label:'영수증' },
  { id:'check', icon:'✅', label:'체크' },
  { id:'memo', icon:'📝', label:'메모' },
];

function BottomNav({ tab, setTab, noMemoCount }) {
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, height:65, background:C.sf, borderTop:`1px solid ${C.bd}`, display:'flex', justifyContent:'space-around', alignItems:'center', zIndex:50, paddingBottom:'env(safe-area-inset-bottom)' }}>
      {NAV_ITEMS.map(item => {
        const active = tab === item.id;
        const showBadge = item.id === 'check' && noMemoCount > 0;
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 12px', position:'relative', minWidth:50 }}>
            <span style={{ fontSize:item.id === 'receipt' ? 26 : 22, filter:active ? 'none' : 'grayscale(0.5)', opacity:active ? 1 : 0.5 }}>{item.icon}</span>
            <span style={{ fontSize:10, fontWeight:active ? 700 : 400, color:active ? C.ac : C.txm }}>{item.label}</span>
            {showBadge && (
              <span style={{ position:'absolute', top:2, right:4, background:C.no, color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' }}>
                {noMemoCount > 99 ? '99+' : noMemoCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════

export default function MobileApp({ data, add, remove, update }) {
  const [tab, setTab] = useState('home');

  // 사유 미입력 건수 (체크 탭 뱃지용)
  const noMemoCount = useMemo(() => (data.expenses || []).filter(e => !e.memo || e.memo.trim() === '').length, [data.expenses]);

  return (
    <div style={{ fontFamily:"'Noto Sans KR',-apple-system,sans-serif", color:C.tx, background:C.bg, minHeight:'100vh' }}>
      {/* 상단 헤더 */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:48, background:C.sf, borderBottom:`1px solid ${C.bd}`, display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>
        <span style={{ fontSize:15, fontWeight:800, color:C.ac }}>주식회사 오름히</span>
      </div>

      {/* 콘텐츠 (상단 48px + 하단 65px 패딩) */}
      <div style={{ paddingTop:48 }}>
        {tab === 'home' && <HomeTab data={data} />}
        {tab === 'expense' && <ExpenseTab data={data} add={add} remove={remove} update={update} />}
        {tab === 'receipt' && <ReceiptTab data={data} add={add} remove={remove} update={update} />}
        {tab === 'check' && <CheckTab data={data} update={update} />}
        {tab === 'memo' && <MemoTab data={data} add={add} remove={remove} update={update} />}
      </div>

      {/* 하단 네비게이션 */}
      <BottomNav tab={tab} setTab={setTab} noMemoCount={noMemoCount} />
    </div>
  );
}
