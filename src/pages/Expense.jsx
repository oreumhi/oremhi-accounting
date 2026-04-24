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

  const triggerReceiptUpload = (rowId) => {
    receiptTargetId.current = rowId;
    receiptRef.current?.click();
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

  const filtered = useMemo(() => {
    let result = filterDateRange(items, dateFrom, dateTo);
    if (fil !== '전체') result = result.filter(i => (i.pay_method || i.payMethod) === fil);
    return result;
  }, [items, dateFrom, dateTo, fil]);
  const total = filtered.reduce((s,i) => s+Number(i.amount), 0);
  const expFavs = (favorites || []).filter(fv => fv.table_name === 'expenses');

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
      <button onClick={() => triggerReceiptUpload(r.id)}
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
      <SummaryBar label={`${fil==='전체'?'조회 지출':fil+' 지출'} (${filtered.length}건)`} amount={total} color={C.no} S={S} />
      <DataTable columns={cols} data={[...filtered].reverse()} onDelete={id => remove('expenses',id)} emptyText="지출 내역 없음" S={S} />
    </div>
  );
}
