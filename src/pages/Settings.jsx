import React, { useState, useRef } from 'react';
import { C, FONT_SIZES } from '../config';
import { hashPin, exportAllToExcel } from '../utils';
import { saveSettings, exportBackup, importBackup } from '../store';
import { PageTitle, NoteBox } from '../components/ui';

export default function Settings({ data, settings, setSettings, restoreBackup, S }) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  // 글자 크기 변경
  const changeFontSize = async (size) => {
    setSettings(prev => ({ ...prev, font_size: size }));
    await saveSettings({ font_size: size });
  };

  // 비밀번호 설정
  const setPassword = async () => {
    if (pin.length < 4) return setMsg('비밀번호는 4자리 이상이어야 합니다');
    if (pin !== pinConfirm) return setMsg('비밀번호가 일치하지 않습니다');
    const hash = await hashPin(pin);
    await saveSettings({ pin_hash: hash });
    setSettings(prev => ({ ...prev, pin_hash: hash }));
    setPin(''); setPinConfirm('');
    setMsg('✅ 비밀번호가 설정되었습니다');
  };

  // 비밀번호 해제
  const removePassword = async () => {
    if (!confirm('비밀번호를 해제하시겠습니까?')) return;
    await saveSettings({ pin_hash: null });
    setSettings(prev => ({ ...prev, pin_hash: null }));
    setMsg('✅ 비밀번호가 해제되었습니다');
  };

  // JSON 백업
  const handleJsonBackup = () => exportBackup(data);

  // 엑셀 백업
  const handleExcelBackup = () => exportAllToExcel(data);

  // 복원
  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = await importBackup(file);
      if (!confirm('현재 데이터에 백업 데이터가 추가됩니다. 계속하시겠습니까?')) return;
      await restoreBackup(backup);
      setMsg('✅ 백업이 복원되었습니다. 페이지를 새로고침합니다...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { setMsg('❌ ' + err.message); }
  };

  return (
    <div>
      <PageTitle>설정</PageTitle>

      {msg && (
        <div style={{...S.card, borderColor: msg.includes('✅') ? C.ok+'44' : C.no+'44', background: msg.includes('✅') ? C.ok+'08' : C.no+'08'}}>
          <div style={{fontWeight:600, color: msg.includes('✅') ? C.ok : C.no}}>{msg}</div>
        </div>
      )}

      {/* 글자 크기 */}
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>🔤 글자 크기</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {Object.entries(FONT_SIZES).map(([key, size]) => (
            <button
              key={key}
              onClick={() => changeFontSize(key)}
              style={{
                padding:'10px 20px', borderRadius:8, cursor:'pointer',
                border: `2px solid ${settings.font_size === key ? C.ac : C.bd}`,
                background: settings.font_size === key ? C.ac+'18' : C.sf2,
                color: settings.font_size === key ? C.ac : C.tx,
                fontSize: size,
              }}
            >
              {key === 'small' ? '작게' : key === 'medium' ? '보통' : key === 'large' ? '크게' : '아주 크게'}
              <div style={{fontSize:11,color:C.txd,marginTop:2}}>{size}px</div>
            </button>
          ))}
        </div>
      </div>

      {/* 비밀번호 */}
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>🔒 비밀번호 잠금</div>
        {settings.pin_hash ? (
          <div>
            <div style={{color:C.ok,marginBottom:10}}>✅ 비밀번호가 설정되어 있습니다</div>
            <button onClick={removePassword} style={{...S.btn,background:C.no,padding:'8px 16px',fontSize:13}}>비밀번호 해제</button>
          </div>
        ) : (
          <div>
            <div style={{color:C.txd,marginBottom:10}}>비밀번호를 설정하면 앱 접속 시 비밀번호를 입력해야 합니다</div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <input style={{...S.inp,width:150}} type="password" placeholder="비밀번호 (4자리 이상)" value={pin} onChange={e => setPin(e.target.value)} />
              <input style={{...S.inp,width:150}} type="password" placeholder="비밀번호 확인" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} />
              <button onClick={setPassword} style={S.btn}>설정</button>
            </div>
          </div>
        )}
      </div>

      {/* 백업 */}
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>💾 데이터 백업 / 복원</div>
        <NoteBox S={S}>만약을 대비해 정기적으로 백업하세요. JSON 백업은 복원이 가능하고, 엑셀 백업은 보기 편합니다.</NoteBox>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={handleJsonBackup} style={S.btn}>📥 JSON 백업 (복원 가능)</button>
          <button onClick={handleExcelBackup} style={{...S.btn,background:C.ok}}>📥 엑셀 백업</button>
          <button onClick={() => fileRef.current?.click()} style={{...S.btn,background:C.warn}}>📤 JSON 복원</button>
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={handleRestore} />
        </div>
      </div>

      {/* 정보 */}
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>ℹ️ 시스템 정보</div>
        <div style={{fontSize:12,color:C.txd,lineHeight:1.8}}>
          주식회사 오름히 회계관리 시스템 v4.0<br/>
          데이터: {Object.values(data).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)}건<br/>
          저장소: {settings.pin_hash ? '🔒 잠금 설정됨' : '🔓 잠금 없음'}
        </div>
      </div>
    </div>
  );
}
