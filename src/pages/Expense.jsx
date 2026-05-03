import React, { useState, useMemo, useRef } from 'react';
import { C, EXP_CATS, PAY_METHODS, pmColor } from '../config';
import { fmt, today, exportToExcel, checkDuplicate } from '../utils';
import { uploadImage } from '../store';
import { PageTitle, NoteBox, FormGrid, DataTable, SummaryBar, FilterBar, Badge, ExportBtn, DateRangeFilter, filterDateRange } from '../components/ui';

export default function Expense({ data, add, remove, update, S }) {
  const { expenses: items, clients, favorites } = data;
  const [f, sF] = useState({ date:today(), pay_method:'법인카드', client:'', description:'', amount:'', category:'식대', card_name:'', memo:'' });
  const [fil, sFil] = useState('전체');
  const [showFav, setShowFav] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editMemoId, setEditMemoId] = useState(null);
  const [editMemoVal, setEditMemoVal] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [pickerOpenFor, setPickerOpenFor] = useState(null); // 영수증 선택 모달 대상 지출 id
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc | date_asc | amount_desc | amount_asc
  const [receiptFil, setReceiptFil] = useState('전체'); // 전체 | 등록 | 미등록
  const receiptRef = useRef(null);
  const receiptTargetId = useRef(null);

  const isCard = ['법인카드','개인카드','체크카드'].includes(f.pay_method);

  const submit = async () => {
    if (!f.amount) return alert('금액을 입력해주세요');
    const dup = checkDuplicate(items, f);
    if (dup && !confirm(`⚠️ 같은 날짜에 같은 금액(₩${fmt(f.amount)})의 거래가 있습니다.\n거래처: ${dup.client || '-'}\n그래도 등록하시겠습니까?`)) return;
    if (await add('expenses', { ...f, amount:Number(f.amount) }))
      sF({ ...f, client:'', description:'', amount:'', card_name:'', memo:'' });
  };

  const saveFav = async () => {
    const label = prompt('즐겨찾기 이름을 입력하세요 (예: "매달 사무실 임대료")');
    if (!label) return;
    await add('favorites', { label, pay_method:f.pay_method, client:f.client, description:f.description, amount:Number(f.amount)||0, category:f.category, table_name:'expenses' });
    alert('즐겨찾기에 저장되었습니다!');
  };

  const loadFav = (fav) => {
    sF({ date:today(), pay_method:fav.pay_method||'법인카드', client:fav.client||'', description:fav.description||'', amount:String(fav.amount||''), category:fav.category||'식대', card_name:'', memo:'' });
    setShowFav(false);
  };

  const handleCategoryChange = async (row, newCat) => {
    await update('expenses', row.id, { category: newCat });
  };

  const startMemoEdit = (row) => {
    setEditMemoId(row.id);
    setEditMemoVal(row.memo || '');
  };

  const saveMemo = async (id) => {
    await update('expenses', id, { memo: editMemoVal });
    setEditMemoId(null);
    setEditMemoVal('');
  };

  // 영수증첨부 → 모달 열기
  const openReceiptPicker = (rowId) => {
    setPickerOpenFor(rowId);
  };

  // 모달에서: 새 파일 업로드
  const triggerNewFileUpload = (rowId) => {
    receiptTargetId.current = rowId;
    receiptRef.current?.click();
    setPickerOpenFor(null);
  };

  const handleReceiptFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !receiptTargetId.current) return;
    const id = receiptTargetId.current;
    setUploadingId(id);
    try {
      const image_url = await uploadImage(file);
      if (image_url) {
        await update('expenses', id, { image_url });
      } else {
        alert('이미지 업로드에 실패했습니다. Supabase Storage 설정을 확인해주세요.');
      }
    } catch (err) {
      alert('업로드 중 오류가 발생했습니다.');
    }
    setUploadingId(null);
    receiptTargetId.current = null;
    if (receiptRef.current) receiptRef.current.value = '';
  };

  // 모달에서: 보관함 영수증 선택
  const linkFromStorage = async (expenseId, receipt) => {
    setUploadingId(expenseId);
    try {
      await update('expenses', expenseId, { image_url: receipt.image_url });
      await update('receiptStorage', receipt.id, { linked: true, linked_expense_id: expenseId });
    } catch (err) {
      alert('연결 중 오류가 발생했습니다.');
    }
    setUploadingId(null);
    setPickerOpenFor(null);
  };

  // 매칭 점수 계산 (높을수록 우선): 2=날짜+금액, 1=날짜만, 0=불일치
  const matchScore = (receipt, expense) => {
    if (!receipt || !expense) return 0;
    const sameDate = receipt.date && expense.date && receipt.date === expense.date;
    const sameAmount = Math.abs(Number(receipt.amount || 0) - Number(expense.amount || 0)) < 1;
    if (sameDate && sameAmount) return 2;
    if (sameDate) return 1;
    return 0;
  };

  const filtered = useMemo(() => {
    let result = filterDateRange(items, dateFrom, dateTo);
    if (fil !== '전체') result = result.filter(i => (i.pay_method || i.payMethod) === fil);
    if (receiptFil === '등록') result = result.filter(i => i.image_url);
    else if (receiptFil === '미등록') result = result.filter(i => !i.image_url);
    // 정렬 적용
    const sorted = [...result];
    if (sortBy === 'date_desc') sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    else if (sortBy === 'date_asc') sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    else if (sortBy === 'amount_desc') sorted.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    else if (sortBy === 'amount_asc') sorted.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    return sorted;
  }, [items, dateFrom, dateTo, fil, receiptFil, sortBy]);
  const total = filtered.reduce((s,i) => s+Number(i.amount), 0);
  const expFavs = (favorites || []).filter(fv => fv.table_name === 'expenses');
  const receiptStats = useMemo(() => {
    const base = items.filter(i => {
      const dateOk = (!dateFrom || i.date >= dateFrom) && (!dateTo || i.date <= dateTo);
      const payOk = fil === '전체' || (i.pay_method || i.payMethod) === fil;
      return dateOk && payOk;
    });
    return {
      withReceipt: base.filter(i => i.image_url).length,
      withoutReceipt: base.filter(i => !i.image_url).length,
    };
  }, [items, dateFrom, dateTo, fil]);

  const cols = [
    { key:'date', label:'날짜' },
    { key:'pay_method', label:'결제수단', render:r => <Badge color={pmColor(r.pay_method||r.payMethod||'기타')} S={S}>{r.pay_method||r.payMethod||'기타'}</Badge> },
    { key:'client', label:'사용처', style:{ fontWeight:500 } },
    { key:'description', label:'내용' },
    { key:'category', label:'분류', render:r => (
      <select value={r.category || '기타'} onChange={e => handleCategoryChange(r, e.target.value)}
        style={{ background:C.sf2, color:C.txd, border:`1px solid ${C.bd}`, borderRadius:6, padding:'3px 6px', fontSize:11, cursor:'pointer', outline:'none' }}>
        {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )},
    { key:'amount', label:'금액', style:{ fontWeight:600, color:C.no }, render:r => `₩${fmt(r.amount)}` },
    { key:'memo', label:'메모', render:r => editMemoId === r.id ? (
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <input value={editMemoVal} onChange={e => setEditMemoVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveMemo(r.id)}
          style={{ ...S.inp, padding:'4px 8px', fontSize:12, width:120 }} autoFocus placeholder="메모 입력" />
        <button onClick={() => saveMemo(r.id)} style={{ background:C.ac, color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>저장</button>
        <button onClick={() => setEditMemoId(null)} style={{ background:'none', border:`1px solid ${C.bd}`, borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', color:C.txd }}>취소</button>
      </div>
    ) : (
      <span onClick={() => startMemoEdit(r)} style={{ cursor:'pointer', fontSize:12, color: r.memo ? C.tx : C.txm }}>
        {r.memo || '메모 입력'}
      </span>
    )},
    { key:'image_url', label:'영수증', render:r => r.image_url ? (
      <a href={r.image_url} target="_blank" rel="noopener" style={{ color:C.ac, fontSize:11, textDecoration:'underline' }}>보기</a>
    ) : uploadingId === r.id ? (
      <span style={{ fontSize:11, color:C.txm }}>업로드중...</span>
    ) : (
      <button onClick={() => openReceiptPicker(r.id)}
        style={{ background:'none', border:`1px solid ${C.ac}44`, borderRadius:6, padding:'3px 8px', fontSize:11, color:C.ac, cursor:'pointer', whiteSpace:'nowrap' }}>
        영수증첨부
      </button>
    )},
  ];

  return (
    <div>
      <input ref={receiptRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleReceiptFile} />
      <PageTitle>지출 관리</PageTitle>
      <NoteBox S={S}>카드 · 현금 · 계좌이체 · 네이버페이 · 배달의민족 · 카카오페이 등 모든 지출 통합관리 | ⚠️ 같은 날짜·금액 중복 입력 시 경고</NoteBox>
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>지출 등록</div>
          <div style={{ display:'flex', gap:6 }}>
            {expFavs.length > 0 && <button onClick={() => setShowFav(!showFav)} style={{ ...S.btn, background:C.yel, padding:'6px 12px', fontSize:12 }}>⭐ 즐겨찾기</button>}
            <button onClick={saveFav} style={{ ...S.btn, background:C.sf2, color:C.txd, border:`1px solid ${C.bd}`, padding:'6px 12px', fontSize:12 }}>⭐ 현재 저장</button>
            <ExportBtn onClick={() => exportToExcel(filtered, '지출', '지출내역')} S={S} />
          </div>
        </div>

        {showFav && expFavs.length > 0 && (
          <div style={{ marginBottom:12, padding:10, background:C.sf2, borderRadius:8 }}>
            <div style={{ fontSize:12, color:C.txd, marginBottom:6 }}>⭐ 즐겨찾기 클릭 시 자동 입력:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {expFavs.map(fv => (
                <button key={fv.id} onClick={() => loadFav(fv)} style={{ ...S.btn, background:C.yel+'22', color:C.yel, border:`1px solid ${C.yel}44`, padding:'5px 10px', fontSize:12 }}>
                  {fv.label} (₩{fmt(fv.amount)})
                </button>
              ))}
            </div>
          </div>
        )}

        <FormGrid cols={4}>
          <input style={S.inp} type="date" value={f.date} onChange={e => sF({...f,date:e.target.value})} />
          <select style={S.sel} value={f.pay_method} onChange={e => sF({...f,pay_method:e.target.value})}>{PAY_METHODS.map(p => <option key={p}>{p}</option>)}</select>
          <select style={S.sel} value={f.category} onChange={e => sF({...f,category:e.target.value})}>{EXP_CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input style={S.inp} type="number" placeholder="금액(원)" value={f.amount} onChange={e => sF({...f,amount:e.target.value})} />
        </FormGrid>
        <FormGrid cols={3}>
          <div><input style={S.inp} placeholder="사용처/거래처" value={f.client} onChange={e => sF({...f,client:e.target.value})} list="ex-c" /><datalist id="ex-c">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
          <input style={S.inp} placeholder="내용" value={f.description} onChange={e => sF({...f,description:e.target.value})} />
          {isCard ? <input style={S.inp} placeholder="카드명/승인번호" value={f.card_name} onChange={e => sF({...f,card_name:e.target.value})} /> : <input style={S.inp} placeholder="메모" value={f.memo} onChange={e => sF({...f,memo:e.target.value})} />}
        </FormGrid>
        <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}><button style={S.btn} onClick={submit}>등록</button></div>
      </div>
      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onReset={() => { setDateFrom(''); setDateTo(''); }} S={S} />
      <FilterBar options={['전체',...PAY_METHODS]} value={fil} onChange={sFil} S={S} />

      {/* ─── 정렬 + 영수증 필터 ─── */}
      <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', margin:'10px 0 8px', padding:'10px 12px', background:C.sf2, borderRadius:8, border:`1px solid ${C.bd}` }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.txd, fontWeight:600 }}>정렬:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ ...S.sel, padding:'5px 10px', fontSize:12, width:'auto', minWidth:140 }}>
            <option value="date_desc">날짜 ↓ (최신순)</option>
            <option value="date_asc">날짜 ↑ (오래된순)</option>
            <option value="amount_desc">금액 ↓ (높은순)</option>
            <option value="amount_asc">금액 ↑ (낮은순)</option>
          </select>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.txd, fontWeight:600 }}>영수증:</span>
          {[
            { key:'전체', label:'전체', count: receiptStats.withReceipt + receiptStats.withoutReceipt },
            { key:'등록', label:'등록됨', count: receiptStats.withReceipt, color: C.ok },
            { key:'미등록', label:'미등록', count: receiptStats.withoutReceipt, color: C.warn },
          ].map(opt => {
            const active = receiptFil === opt.key;
            return (
              <button key={opt.key} onClick={() => setReceiptFil(opt.key)}
                style={{
                  padding:'5px 12px', borderRadius:6, fontSize:12, cursor:'pointer',
                  border: `1px solid ${active ? (opt.color || C.ac) : C.bd}`,
                  background: active ? (opt.color || C.ac)+'22' : 'transparent',
                  color: active ? (opt.color || C.ac) : C.txd,
                  fontWeight: active ? 600 : 400,
                }}>
                {opt.label} ({opt.count})
              </button>
            );
          })}
        </div>
      </div>

      <SummaryBar label={`${fil==='전체'?'조회 지출':fil+' 지출'}${receiptFil!=='전체'?' · 영수증 '+receiptFil:''} (${filtered.length}건)`} amount={total} color={C.no} S={S} />
      <DataTable columns={cols} data={filtered} onDelete={id => remove('expenses',id)} emptyText="지출 내역 없음" S={S} />

      {/* ─── 영수증 첨부 모달 ─── */}
      {pickerOpenFor && (() => {
        const expense = items.find(i => i.id === pickerOpenFor);
        if (!expense) return null;

        const allReceipts = (data.receiptStorage || []).filter(r => !r.linked);
        // 매칭 점수 + 정렬 (높은 점수 우선)
        const scored = allReceipts.map(r => ({ ...r, _score: matchScore(r, expense) }));
        scored.sort((a, b) => b._score - a._score || (b.date || '').localeCompare(a.date || ''));

        const exactMatchCount = scored.filter(r => r._score === 2).length;
        const dateMatchCount = scored.filter(r => r._score === 1).length;

        return (
          <div onClick={() => setPickerOpenFor(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:C.sf, borderRadius:12, border:`1px solid ${C.bd}`, width:'100%', maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* 헤더 */}
              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.bd}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>영수증 첨부</div>
                  <div style={{ fontSize:11, color:C.txd, marginTop:3 }}>
                    {expense.date} · {expense.client || '-'} · ₩{fmt(expense.amount)}
                  </div>
                </div>
                <button onClick={() => setPickerOpenFor(null)} style={{ background:'none', border:'none', fontSize:20, color:C.txd, cursor:'pointer' }}>✕</button>
              </div>

              {/* 새 파일 업로드 */}
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.bd}` }}>
                <button onClick={() => triggerNewFileUpload(pickerOpenFor)}
                  style={{ ...S.btn, width:'100%', padding:'12px', fontSize:13 }}>
                  📎 새 파일 업로드 (이미지 선택)
                </button>
              </div>

              {/* 보관함 매칭 안내 */}
              <div style={{ padding:'10px 20px', background:C.sf2, fontSize:11, color:C.txd, display:'flex', gap:14, flexWrap:'wrap' }}>
                <span>📸 영수증 보관함 ({allReceipts.length}건)</span>
                {exactMatchCount > 0 && <span style={{ color:C.no, fontWeight:600 }}>🔴 날짜+금액 일치 {exactMatchCount}건</span>}
                {dateMatchCount > 0 && <span style={{ color:C.ok, fontWeight:600 }}>🟢 날짜 일치 {dateMatchCount}건</span>}
              </div>

              {/* 보관함 목록 */}
              <div style={{ overflowY:'auto', flex:1 }}>
                {scored.length === 0 ? (
                  <div style={{ padding:30, textAlign:'center', color:C.txm, fontSize:12 }}>보관함에 미연결 영수증이 없습니다</div>
                ) : (
                  scored.map(r => {
                    const bg = r._score === 2 ? C.no+'18' : r._score === 1 ? C.ok+'15' : 'transparent';
                    const border = r._score === 2 ? `1px solid ${C.no}55` : r._score === 1 ? `1px solid ${C.ok}55` : `1px solid ${C.bd}`;
                    const tag = r._score === 2 ? <span style={{ fontSize:10, fontWeight:700, color:C.no, background:C.no+'22', padding:'2px 6px', borderRadius:4 }}>날짜+금액 일치</span>
                              : r._score === 1 ? <span style={{ fontSize:10, fontWeight:700, color:C.ok, background:C.ok+'22', padding:'2px 6px', borderRadius:4 }}>날짜 일치</span>
                              : null;
                    return (
                      <div key={r.id}
                        style={{ display:'flex', gap:12, padding:'10px 20px', borderBottom:`1px solid ${C.bd}`, background:bg, alignItems:'center' }}>
                        {r.image_url && (
                          <img src={r.image_url} alt="" style={{ width:48, height:48, objectFit:'cover', borderRadius:6, border, flexShrink:0 }} />
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:600 }}>{r.client || '(거래처 없음)'}</span>
                            {tag}
                          </div>
                          <div style={{ fontSize:11, color:C.txd }}>
                            {r.date || '-'} · ₩{fmt(r.amount || 0)}
                            {r.memo && <> · {r.memo}</>}
                          </div>
                        </div>
                        <button onClick={() => linkFromStorage(pickerOpenFor, r)}
                          style={{ ...S.btn, padding:'6px 14px', fontSize:12, flexShrink:0 }}>
                          연결
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 푸터 */}
              <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.bd}`, display:'flex', justifyContent:'flex-end' }}>
                <button onClick={() => setPickerOpenFor(null)}
                  style={{ background:'none', border:`1px solid ${C.bd}`, color:C.txd, padding:'7px 14px', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
