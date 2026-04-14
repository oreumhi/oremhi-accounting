// ============================================
// 레이아웃 (사이드바 + 검색 + 반응형)
// ============================================

import React, { useState, useEffect } from 'react';
import { C, TABS } from '../config';
import { hasSB } from '../store';
import { fmt, searchAll } from '../utils';

export function Layout({ tab, setTab, data, fontSize, children }) {
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const check = () => { setMobile(window.innerWidth < 768); };
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (search.length >= 2 && data) setResults(searchAll(data, search));
    else setResults([]);
  }, [search, data]);

  const go = (id) => { setTab(id); setMenu(false); setSearch(''); setResults([]); };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.tx, fontFamily:"'Noto Sans KR',-apple-system,sans-serif", fontSize }}>
      {/* 모바일 상단바 */}
      {mobile && (
        <div style={{ position:'fixed', top:0, left:0, right:0, height:50, background:C.sf, borderBottom:`1px solid ${C.bd}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', zIndex:20 }}>
          <button onClick={() => setMenu(!menuOpen)} style={{ background:'none', border:'none', color:C.tx, fontSize:20, cursor:'pointer' }}>{menuOpen ? '✕' : '☰'}</button>
          <span style={{ fontSize:14, fontWeight:700, color:C.ac }}>오름히 회계</span>
          <div style={{ width:28 }} />
        </div>
      )}

      {/* 오버레이 */}
      {mobile && menuOpen && <div onClick={() => setMenu(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:25 }} />}

      {/* 사이드바 */}
      <div style={{ width:200, background:C.sf, borderRight:`1px solid ${C.bd}`, position:'fixed', top:0, left:mobile?(menuOpen?0:-200):0, bottom:0, display:'flex', flexDirection:'column', zIndex:30, transition:mobile?'left 0.25s':'none' }}>
        <div style={{ padding:'16px 14px 12px', borderBottom:`1px solid ${C.bd}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.ac }}>주식회사 오름히</div>
          <div style={{ fontSize:10, color:C.txd, marginTop:2 }}>회계관리 시스템 v4.0</div>
        </div>

        {/* 검색 */}
        <div style={{ padding:'8px 8px 4px' }}>
          <input
            style={{ background:C.sf2, border:`1px solid ${C.bd}`, borderRadius:7, padding:'7px 10px', color:C.tx, fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' }}
            placeholder="🔍 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* 검색 결과 */}
        {results.length > 0 && (
          <div style={{ padding:'4px 8px 8px', maxHeight:200, overflowY:'auto' }}>
            {results.slice(0, 8).map(r => (
              <div key={r.id} style={{ padding:'5px 8px', borderRadius:5, background:C.sf2, marginBottom:3, fontSize:11, cursor:'pointer' }} onClick={() => setSearch('')}>
                <span style={{ color:C.ac, marginRight:4 }}>[{r._type}]</span>
                {r.description || r.client || r.name || r.title || '-'}
                {r.amount ? <span style={{ float:'right', color:C.txd }}>₩{fmt(r.amount)}</span> : null}
              </div>
            ))}
          </div>
        )}

        {/* 탭 메뉴 */}
        <div style={{ padding:'4px 5px', flex:1, overflowY:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => go(t.id)} style={{
              display:'flex', alignItems:'center', gap:7, width:'100%', padding:'8px 10px',
              border:'none', borderRadius:7, cursor:'pointer', fontSize:12, marginBottom:1,
              fontWeight:tab===t.id?600:400,
              background:tab===t.id?C.ac+'18':'transparent',
              color:tab===t.id?C.ac:C.txd,
            }}>
              <span style={{ fontSize:13 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'7px 10px', borderTop:`1px solid ${C.bd}`, fontSize:9.5, color:C.txm }}>
          💾 자동저장 · {hasSB ? '☁️ 클라우드' : '📱 로컬'}
        </div>
      </div>

      {/* 메인 */}
      <div style={{ marginLeft:mobile?0:200, padding:mobile?'64px 14px 20px':'20px 24px', minHeight:'100vh' }}>
        {children}
      </div>
    </div>
  );
}
