// ============================================
// 메인 앱 - 비밀번호 잠금 + 라우팅 + 글자크기
// ============================================

import React, { useState, useEffect } from 'react';
import { C, FONT_SIZES, getStyles } from './config';
import { hashPin } from './utils';
import { useStore, loadSettings, saveSettings } from './store';
import { Layout } from './components/Layout';

import Dashboard from './pages/Dashboard';
import Revenue from './pages/Revenue';
import Expense from './pages/Expense';
import BankUpload from './pages/BankUpload';
import Recurring from './pages/Recurring';
import Bank from './pages/Bank';
import Clients from './pages/Clients';
import TaxInvoice from './pages/TaxInvoice';
import VAT from './pages/VAT';
import Payroll from './pages/Payroll';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import Contracts from './pages/Contracts';
import Docs from './pages/Docs';
import Receipt from './pages/Receipt';
import Notes from './pages/Notes';
import Settings from './pages/Settings';

// ─── 비밀번호 잠금 화면 ───
function PasswordLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const hash = await hashPin(pin);
    const settings = await loadSettings();
    if (hash === settings.pin_hash) {
      onUnlock();
    } else {
      setError('비밀번호가 틀렸습니다');
      setPin('');
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:24 }}>
      <div style={{ background:C.sf, border:`1px solid ${C.bd}`, borderRadius:16, padding:40, textAlign:'center', maxWidth:360, width:'100%' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, fontWeight:700, color:C.ac, marginBottom:6 }}>주식회사 오름히</div>
        <div style={{ fontSize:13, color:C.txd, marginBottom:24 }}>회계관리 시스템</div>
        <input
          style={{ background:C.sf2, border:`1px solid ${error?C.no:C.bd}`, borderRadius:8, padding:'12px 16px', color:C.tx, fontSize:18, outline:'none', width:'100%', boxSizing:'border-box', textAlign:'center', letterSpacing:8 }}
          type="password"
          placeholder="비밀번호"
          value={pin}
          onChange={e => { setPin(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          autoFocus
        />
        {error && <div style={{ color:C.no, fontSize:13, marginTop:8 }}>{error}</div>}
        <button onClick={submit} style={{ background:C.ac, color:'#fff', border:'none', borderRadius:8, padding:'12px 0', cursor:'pointer', fontWeight:600, fontSize:15, width:'100%', marginTop:16 }}>
          잠금 해제
        </button>
      </div>
    </div>
  );
}

// ─── 메인 앱 ───
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [settings, setSettings] = useState({ pin_hash:null, font_size:'medium' });
  const [locked, setLocked] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { data, loading, add, addBulk, remove, update, restoreBackup } = useStore();

  // 설정 로드
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s || { pin_hash:null, font_size:'medium' });
      // 비밀번호가 없으면 자동 잠금 해제
      if (!s?.pin_hash) setLocked(false);
      setSettingsLoaded(true);
    })();
  }, []);

  // 글자 크기
  const fontSize = FONT_SIZES[settings.font_size] || 14;
  const S = getStyles(fontSize);

  // 로딩
  if (!settingsLoaded || loading) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:28, animation:'pulse 1.5s ease infinite' }}>📊</div>
        <div style={{ color:C.txd, fontSize:14, fontFamily:'sans-serif' }}>데이터를 불러오는 중...</div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.95)}}`}</style>
      </div>
    );
  }

  // 비밀번호 잠금
  if (locked && settings.pin_hash) {
    return <PasswordLock onUnlock={() => setLocked(false)} />;
  }

  // 페이지 props
  const pp = { data, add, remove, update, S };

  return (
    <Layout tab={tab} setTab={setTab} data={data} fontSize={fontSize}>
      {tab === 'dashboard'  && <Dashboard {...pp} />}
      {tab === 'bankUpload' && <BankUpload {...pp} addBulk={addBulk} />}
      {tab === 'revenue'    && <Revenue {...pp} />}
      {tab === 'expense'    && <Expense {...pp} />}
      {tab === 'recurring'  && <Recurring {...pp} />}
      {tab === 'bank'       && <Bank {...pp} />}
      {tab === 'clients'    && <Clients {...pp} />}
      {tab === 'tax'        && <TaxInvoice {...pp} />}
      {tab === 'vat'        && <VAT {...pp} />}
      {tab === 'payroll'    && <Payroll {...pp} />}
      {tab === 'budget'     && <Budget {...pp} />}
      {tab === 'reports'    && <Reports {...pp} />}
      {tab === 'contracts'  && <Contracts {...pp} />}
      {tab === 'docs'       && <Docs {...pp} />}
      {tab === 'receipt'    && <Receipt {...pp} />}
      {tab === 'notes'      && <Notes {...pp} />}
      {tab === 'settings'   && <Settings {...pp} settings={settings} setSettings={setSettings} restoreBackup={restoreBackup} />}
    </Layout>
  );
}
