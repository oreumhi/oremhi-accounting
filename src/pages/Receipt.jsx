import React, { useState, useRef } from 'react';
import { C, EXP_CATS, PAY_METHODS } from '../config';
import { fmt, today } from '../utils';
import { uploadImage } from '../store';
import { PageTitle, FormGrid } from '../components/ui';

export default function Receipt({ data, add, S }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('scan');
  const [imageFile, setImageFile] = useState(null);
  const ref = useRef();

  const [manual, setManual] = useState({ date:today(), client:'', description:'', amount:'', pay_method:'법인카드', category:'식대' });

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
    // 이미지 업로드
    let image_url = null;
    if (imageFile) {
      image_url = await uploadImage(imageFile);
    }
    await add('expenses', {
      date: result.date || today(), client: result.client || '', description: result.description || '',
      amount: Number(result.amount) || 0, pay_method: result.pay_method || '기타', category: result.category || '기타',
      image_url,
    });
    setResult(null); setImageFile(null);
  };

  const addManual = async () => {
    if (!manual.amount) return alert('금액을 입력해주세요');
    // 수동입력 시에도 이미지 첨부 가능
    let image_url = null;
    if (imageFile) { image_url = await uploadImage(imageFile); }
    await add('expenses', { ...manual, amount:Number(manual.amount), image_url });
    setManual({ date:today(), client:'', description:'', amount:'', pay_method:'법인카드', category:'식대' });
    setImageFile(null);
  };

  return (
    <div>
      <PageTitle>영수증 스캔 / 빠른 등록</PageTitle>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {[{id:'scan',label:'📸 AI 스캔',desc:'사진으로 자동 인식'},{id:'manual',label:'✏️ 수동 입력',desc:'직접 빠르게 입력'}].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex:1,padding:12,borderRadius:10,cursor:'pointer',background:mode===m.id?C.ac+'18':C.sf,border:`1px solid ${mode===m.id?C.ac:C.bd}`,color:mode===m.id?C.ac:C.txd,textAlign:'center' }}>
            <div style={{fontSize:14,marginBottom:2}}>{m.label}</div><div style={{fontSize:10}}>{m.desc}</div>
          </button>
        ))}
      </div>

      {mode === 'scan' && (
        <>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>영수증 이미지 업로드</div>
            <div style={{fontSize:12,color:C.txd,marginBottom:12}}>AI 자동 인식 + 원본 이미지 영구 저장</div>
            <div onClick={() => ref.current?.click()} style={{border:`2px dashed ${C.bd}`,borderRadius:12,padding:40,textAlign:'center',cursor:'pointer'}} onMouseEnter={e => e.currentTarget.style.borderColor=C.ac} onMouseLeave={e => e.currentTarget.style.borderColor=C.bd}>
              <div style={{fontSize:32,marginBottom:8}}>📸</div>
              <div style={{color:C.txd}}>클릭하여 영수증 이미지 선택</div>
              <div style={{color:C.txm,fontSize:11,marginTop:3}}>JPG, PNG 지원 · 이미지는 영구 보관됩니다</div>
            </div>
            <input ref={ref} type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files?.[0] && scan(e.target.files[0])} />
          </div>
          {scanning && <div style={{...S.card,textAlign:'center',padding:32}}><div style={{fontSize:24,marginBottom:8,animation:'spin 1s linear infinite'}}>⏳</div><div style={{color:C.txd}}>AI 분석중...</div><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>}
          {error && <div style={{...S.card,borderColor:C.no+'44'}}><div style={{color:C.no,fontWeight:600}}>⚠️ {error}</div><div style={{fontSize:12,color:C.txd,marginTop:4}}>수동 입력 모드를 사용해주세요</div></div>}
          {result && (
            <div style={{...S.card,borderColor:C.ok+'44'}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:C.ok}}>✅ 인식 결과 {imageFile && <span style={{fontSize:11,color:C.txd}}>(📷 이미지 저장됨)</span>}</div>
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
    </div>
  );
}
