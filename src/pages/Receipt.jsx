// ============================================
// 영수증 스캔 + 보관함 (PC 버전)
//
// 탭:
//   1. AI 스캔 (기존)
//   2. 수동 입력 (기존)
//   3. 보관함 (신규 - 모바일과 동일 데이터)
// ============================================

import React, { useState, useRef, useMemo } from 'react';
import { C, EXP_CATS, PAY_METHODS } from '../config';
import { fmt, today } from '../utils';
import { uploadImage } from '../store';
import { PageTitle, FormGrid } from '../components/ui';

export default function Receipt({ data, add, remove, update, S }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('scan');
  const [imageFile, setImageFile] = useState(null);
  const ref = useRef();
  const storageRef = useRef();

  const [manual, setManual] = useState({ date:today(), client:'', description:'', amount:'', pay_method:'법인카드', category:'식대' });

  // 보관함 상태
  const receipts = data.receiptStorage || [];
  const [storageForm, setStorageForm] = useState({ date:today(), client:'', amount:'', memo:'' });
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sorted = useMemo(() => {
    const unlinked = receipts.filter(r => !r.linked);
    const linked = receipts.filter(r => r.linked);
    return [...unlinked.reverse(), ...linked.reverse()];
  }, [receipts]);

  // AI 스캔
  const scan = async (file) => {
    setScanning(true); setError(''); setResult(null); setImageFile(file);
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('읽기실패')); r.readAsDataURL(file); });
      const resp = await fetch('/api/scan-receipt', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image:b64, mediaType:file.type||'image/jpeg' }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(()=>({}))).error || 'AI 서비스 연결 실패');
      const d = await resp.json();
      if (d.error) setError(d.error); else setResult(d);
    } catch (e) { setError(e.message || '인식 실패'); }
    setScanning(false);
  };

  const addResult = async () => {
    if (!result) return;
    let image_url = null;
    if (imageFile) { image_url = await uploadImage(imageFile); }
    await add('expenses', {
      date: result.date || today(), client: result.client || '', description: result.description || '',
      amount: Number(result.amount) || 0, pay_method: result.pay_method || '기타', category: result.category || '기타', image_url,
    });
    setResult(null); setImageFile(null);
  };

  const addManual = async () => {
    if (!manual.amount) return alert('금액을 입력해주세요');
    let image_url = null;
    if (imageFile) { image_url = await uploadImage(imageFile); }
    await add('expenses', { ...manual, amount:Number(manual.amount), image_url });
    setManual({ date:today(), client:'', description:'', amount:'', pay_method:'법인카드', category:'식대' });
    setImageFile(null);
  };

  // 보관함: 업로드
  const handleStorageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const image_url = await uploadImage(file);
    if (!image_url) { alert('이미지 업로드 실패'); setUploading(false); return; }
    await add('receiptStorage', {
      image_url, date: storageForm.date || today(), amount: Number(storageForm.amount) || 0,
      client: storageForm.client || '', memo: storageForm.memo || '', linked: false, linked_expense_id: null,
    });
    setStorageForm({ date:today(), client:'', amount:'', memo:'' });
    setUploading(false);
  };

  // 보관함: 수정
  const startEdit = (item) => {
    setStorageForm({ date: item.date || '', client: item.client || '', amount: String(item.amount || ''), memo: item.memo || '' });
    setEditId(item.id);
  };

  const handleStorageUpdate = async () => {
    await update('receiptStorage', editId, { date: storageForm.date, client: storageForm.client, amount: Number(storageForm.amount) || 0, memo: storageForm.memo });
    setEditId(null);
    setStorageForm({ date:today(), client:'', amount:'', memo:'' });
  };

  // 보관함: 삭제
  const handleStorageDelete = async (item) => {
    if (confirm('이 영수증을 삭제하시겠습니까?')) {
      await remove('receiptStorage', item.id);
    }
  };

  return (
    <div>
      <PageTitle>영수증 스캔 / 보관함</PageTitle>

      {/* 탭 선택 */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {[
          {id:'scan',label:'📸 AI 스캔',desc:'사진으로 자동 인식'},
          {id:'manual',label:'✏️ 수동 입력',desc:'직접 빠르게 입력'},
          {id:'storage',label:'📋 보관함',desc:`영수증 ${receipts.length}건`},
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex:1,padding:12,borderRadius:10,cursor:'pointer',background:mode===m.id?C.ac+'18':C.sf,border:`1px solid ${mode===m.id?C.ac:C.bd}`,color:mode===m.id?C.ac:C.txd,textAlign:'center' }}>
            <div style={{fontSize:14,marginBottom:2}}>{m.label}</div><div style={{fontSize:10}}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* AI 스캔 탭 */}
      {mode === 'scan' && (
        <>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>영수증 이미지 업로드</div>
            <div style={{fontSize:12,color:C.txd,marginBottom:12}}>AI 자동 인식 + 원본 이미지 영구 저장</div>
            <div onClick={() => ref.current?.click()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) scan(f); }} onDragOver={e => e.preventDefault()} onDragEnter={e => e.currentTarget.style.borderColor=C.ac} onDragLeave={e => e.currentTarget.style.borderColor=C.bd} style={{border:`2px dashed ${C.bd}`,borderRadius:12,padding:40,textAlign:'center',cursor:'pointer'}} onMouseEnter={e => e.currentTarget.style.borderColor=C.ac} onMouseLeave={e => e.currentTarget.style.borderColor=C.bd}>
              <div style={{fontSize:32,marginBottom:8}}>📸</div>
              <div style={{color:C.txd}}>클릭 또는 드래그하여 영수증 이미지 업로드</div>
              <div style={{color:C.txm,fontSize:11,marginTop:3}}>JPG, PNG 지원 · 이미지는 영구 보관됩니다</div>
            </div>
            <input ref={ref} type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files?.[0] && scan(e.target.files[0])} />
          </div>
          {scanning && <div style={{...S.card,textAlign:'center',padding:32}}><div style={{fontSize:24,marginBottom:8,animation:'spin 1s linear infinite'}}>⏳</div><div style={{color:C.txd}}>AI 분석중...</div><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>}
          {error && <div style={{...S.card,borderColor:C.no+'44'}}><div style={{color:C.no,fontWeight:600}}>⚠️ {error}</div><div style={{fontSize:12,color:C.txd,marginTop:4}}>수동 입력 모드를 사용해주세요</div></div>}
          {result && (
            <div style={{...S.card,borderColor:C.ok+'44'}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:C.ok}}>✅ 인식 결과</div>
              <FormGrid cols={3}>
                {[['날짜',result.date],['사용처',result.client],['내용',result.description],['금액',`₩${fmt(result.amount)}`],['결제수단',result.pay_method],['분류',result.category]].map(([l,v]) => (
                  <div key={l} style={{padding:9,background:C.sf2,borderRadius:8}}><div style={{fontSize:10,color:C.txd,marginBottom:2}}>{l}</div><div style={{fontWeight:600,fontSize:13}}>{v||'-'}</div></div>
                ))}
              </FormGrid>
              <div style={{marginTop:12,display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={{...S.btn,background:'transparent',color:C.txd,border:`1px solid ${C.bd}`}} onClick={() => {setResult(null);setImageFile(null);}}>취소</button>
                <button style={S.btn} onClick={addResult}>지출내역에 추가</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 수동 입력 탭 */}
      {mode === 'manual' && (
        <div style={S.card}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>빠른 지출 등록</div>
          <FormGrid cols={3}>
            <input style={S.inp} type="date" value={manual.date} onChange={e => setManual({...manual,date:e.target.value})} />
            <input style={S.inp} placeholder="사용처" value={manual.client} onChange={e => setManual({...manual,client:e.target.value})} />
            <input style={S.inp} placeholder="내용" value={manual.description} onChange={e => setManual({...manual,description:e.target.value})} />
            <input style={S.inp} type="number" placeholder="금액(원)" value={manual.amount} onChange={e => setManual({...manual,amount:e.target.value})} />
            <select style={S.sel} value={manual.pay_method} onChange={e => setManual({...manual,pay_method:e.target.value})}>{PAY_METHODS.map(p => <option key={p}>{p}</option>)}</select>
            <select style={S.sel} value={manual.category} onChange={e => setManual({...manual,category:e.target.value})}>{EXP_CATS.map(c => <option key={c}>{c}</option>)}</select>
          </FormGrid>
          <div style={{marginTop:10,fontSize:12,color:C.txd}}>
            📷 영수증 이미지 첨부 (선택): <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0]||null)} style={{fontSize:12}} />
            {imageFile && <span style={{color:C.ok,marginLeft:8}}>✅ {imageFile.name}</span>}
          </div>
          <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}><button style={S.btn} onClick={addManual}>등록</button></div>
        </div>
      )}

      {/* 보관함 탭 */}
      {mode === 'storage' && (
        <>
          {/* 업로드 영역 */}
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>영수증 보관함에 추가</div>
            <div style={{fontSize:12,color:C.txd,marginBottom:12}}>이미지를 업로드하고, 거래내역 업로드 시 연결할 수 있습니다</div>
            <FormGrid cols={4}>
              <input style={S.inp} type="date" value={storageForm.date} onChange={e => setStorageForm({...storageForm,date:e.target.value})} />
              <input style={S.inp} placeholder="거래처" value={storageForm.client} onChange={e => setStorageForm({...storageForm,client:e.target.value})} />
              <input style={S.inp} type="number" placeholder="금액(원)" value={storageForm.amount} onChange={e => setStorageForm({...storageForm,amount:e.target.value})} />
              <input style={S.inp} placeholder="메모" value={storageForm.memo} onChange={e => setStorageForm({...storageForm,memo:e.target.value})} />
            </FormGrid>
            <div style={{marginTop:10}}>
              <div onClick={() => storageRef.current?.click()} onDrop={e => { e.preventDefault(); handleStorageUpload(e.dataTransfer?.files?.[0]); }} onDragOver={e => e.preventDefault()} onDragEnter={e => e.currentTarget.style.borderColor=C.ac} onDragLeave={e => e.currentTarget.style.borderColor=C.bd} style={{border:`2px dashed ${C.bd}`,borderRadius:10,padding:20,textAlign:'center',cursor:'pointer'}} onMouseEnter={e => e.currentTarget.style.borderColor=C.ac} onMouseLeave={e => e.currentTarget.style.borderColor=C.bd}>
                {uploading ? <span style={{color:C.ac}}>업로드 중...</span> : <span style={{color:C.txd,fontSize:13}}>📷 클릭 또는 드래그하여 영수증 이미지 추가</span>}
              </div>
              <input ref={storageRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files?.[0] && handleStorageUpload(e.target.files[0])} />
            </div>
          </div>

          {/* 보관함 목록 */}
          <div style={{...S.card, maxHeight:600, overflowY:'auto'}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>📋 보관함 ({sorted.length}건) — 미연결 {receipts.filter(r => !r.linked).length}건</div>
            {sorted.length === 0 ? (
              <div style={{textAlign:'center',color:C.txm,padding:20,fontSize:12}}>보관함이 비어있습니다</div>
            ) : (
              <div style={{display:'grid',gap:8}}>
                {sorted.map(item => (
                  <div key={item.id} style={{display:'flex',gap:14,padding:12,background:C.sf2,borderRadius:10,border:`1px solid ${item.linked ? C.ok+'33' : C.bd}`,alignItems:'center'}}>
                    {item.image_url && <img src={item.image_url} alt="영수증" style={{width:56,height:56,objectFit:'cover',borderRadius:8,border:`1px solid ${C.bd}`,flexShrink:0}} />}
                    {editId === item.id ? (
                      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,alignItems:'end'}}>
                        <input type="date" style={{...S.inp,padding:'6px 8px',fontSize:12}} value={storageForm.date} onChange={e => setStorageForm({...storageForm,date:e.target.value})} />
                        <input style={{...S.inp,padding:'6px 8px',fontSize:12}} placeholder="거래처" value={storageForm.client} onChange={e => setStorageForm({...storageForm,client:e.target.value})} />
                        <input type="number" style={{...S.inp,padding:'6px 8px',fontSize:12}} placeholder="금액" value={storageForm.amount} onChange={e => setStorageForm({...storageForm,amount:e.target.value})} />
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={handleStorageUpdate} style={{...S.btn,padding:'6px 10px',fontSize:11}}>저장</button>
                          <button onClick={() => setEditId(null)} style={{background:'none',border:`1px solid ${C.bd}`,borderRadius:6,padding:'6px 10px',color:C.txd,fontSize:11,cursor:'pointer'}}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:13,fontWeight:600}}>{item.client || '거래처 미입력'}</span>
                            {item.linked ? (
                              <span style={{fontSize:9,background:C.ok+'22',color:C.ok,padding:'1px 6px',borderRadius:4,fontWeight:600}}>연결됨</span>
                            ) : (
                              <span style={{fontSize:9,background:C.warn+'22',color:C.warn,padding:'1px 6px',borderRadius:4,fontWeight:600}}>미연결</span>
                            )}
                          </div>
                          <div style={{fontSize:11,color:C.txd,marginTop:2}}>
                            {item.date || '-'} {item.amount > 0 && `· ₩${fmt(item.amount)}`}
                            {item.memo && <span> · {item.memo}</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          <button onClick={() => startEdit(item)} style={{background:'none',border:`1px solid ${C.ac}44`,borderRadius:6,padding:'4px 10px',color:C.ac,fontSize:11,cursor:'pointer'}}>수정</button>
                          <button onClick={() => handleStorageDelete(item)} style={{background:'none',border:`1px solid ${C.no}44`,borderRadius:6,padding:'4px 10px',color:C.no,fontSize:11,cursor:'pointer'}}>삭제</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
