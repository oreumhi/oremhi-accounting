export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY를 설정해주세요' });
  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: '이미지가 없습니다' });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type:mediaType||'image/jpeg', data:image } },
          { type:'text', text:'이 영수증을 분석. 순수 JSON만 응답:\n{"date":"YYYY-MM-DD","client":"상호명","description":"품목요약","amount":숫자,"pay_method":"법인카드|개인카드|체크카드|현금|계좌이체|네이버페이|카카오페이|배달의민족|쿠팡페이|토스|기타","category":"광고비|사무용품|통신비|교통비|주유비|주차비|식대|배달비|접대비|임대료|수도광열비|보험료|세금공과|수리비|택배비|도서인쇄비|교육훈련비|경조사비|소모품|구독료|복리후생비|감가상각비|기타"}\n영수증 아니면 {"error":"영수증이 아닙니다"}' }
        ]}]
      })
    });
    if (!r.ok) return res.status(500).json({ error: 'AI 서비스 오류' });
    const d = await r.json();
    const text = d.content?.map(c => c.text||'').join('')||'';
    return res.status(200).json(JSON.parse(text.replace(/```json|```/g,'').trim()));
  } catch (e) { return res.status(500).json({ error: '분석 실패: ' + e.message }); }
}
