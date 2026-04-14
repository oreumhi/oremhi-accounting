import React, { useState } from 'react';
import { C } from '../config';
import { PageTitle, NoteBox } from '../components/ui';

export default function Notes({ data, add, remove, update, S }) {
  const { notes } = data;
  const [f, sF] = useState({ title:'', content:'' });
  const [editing, setEditing] = useState(null);

  const submit = async () => {
    if (!f.title) return alert('제목을 입력해주세요');
    if (await add('notes', { ...f, pinned:false }))
      sF({ title:'', content:'' });
  };

  const togglePin = (id, cur) => update('notes', id, { pinned: !cur });

  const startEdit = (note) => { setEditing(note.id); sF({ title:note.title, content:note.content||'' }); };
  const saveEdit = async () => {
    if (editing) { await update('notes', editing, { title:f.title, content:f.content }); setEditing(null); sF({ title:'', content:'' }); }
  };
  const cancelEdit = () => { setEditing(null); sF({ title:'', content:'' }); };

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  return (
    <div>
      <PageTitle>메모장</PageTitle>
      <NoteBox S={S}>세무사 전화 내용, 처리할 일, 메모 등 간단히 기록</NoteBox>

      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>{editing ? '✏️ 메모 수정' : '📌 새 메모'}</div>
        <input style={{...S.inp,marginBottom:10}} placeholder="제목*" value={f.title} onChange={e => sF({...f,title:e.target.value})} />
        <textarea style={{...S.inp,minHeight:100,resize:'vertical'}} placeholder="내용을 입력하세요..." value={f.content} onChange={e => sF({...f,content:e.target.value})} />
        <div style={{marginTop:10,display:'flex',gap:8,justifyContent:'flex-end'}}>
          {editing && <button style={{...S.btn,background:'transparent',color:C.txd,border:`1px solid ${C.bd}`}} onClick={cancelEdit}>취소</button>}
          <button style={S.btn} onClick={editing ? saveEdit : submit}>{editing ? '수정 저장' : '메모 추가'}</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{...S.card,textAlign:'center',color:C.txd,padding:32}}>메모가 없습니다</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {sorted.map(n => (
            <div key={n.id} style={{...S.card,borderColor:n.pinned?C.yel+'44':C.bd,position:'relative'}}>
              {n.pinned && <span style={{position:'absolute',top:10,right:10,fontSize:14}}>📌</span>}
              <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{n.title}</div>
              {n.content && <div style={{fontSize:13,color:C.txd,whiteSpace:'pre-wrap',marginBottom:10,maxHeight:150,overflow:'auto'}}>{n.content}</div>}
              <div style={{display:'flex',gap:6,fontSize:12}}>
                <button onClick={() => togglePin(n.id,n.pinned)} style={{background:'none',border:`1px solid ${C.bd}`,borderRadius:6,padding:'3px 8px',color:C.txd,cursor:'pointer',fontSize:12}}>{n.pinned?'📌 해제':'📌 고정'}</button>
                <button onClick={() => startEdit(n)} style={{background:'none',border:`1px solid ${C.bd}`,borderRadius:6,padding:'3px 8px',color:C.ac,cursor:'pointer',fontSize:12}}>✏️ 수정</button>
                <button onClick={() => remove('notes',n.id)} style={{background:'none',border:`1px solid ${C.bd}`,borderRadius:6,padding:'3px 8px',color:C.no,cursor:'pointer',fontSize:12}}>🗑️ 삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
