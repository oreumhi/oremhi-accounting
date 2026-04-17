export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY를 설정해주세요' });

  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: '이미지가 없습니다' });

    const prompt = '이 영수증을 분석. 순수 JSON만 응답:\n{"date":"YYYY-MM-DD","client":"상호명","description":"품목요약","amount":숫자,"pay_method":"법인카드|개인카드|체크카드|현금|계좌이체|네이버페이|카카오페이|배달의민족|쿠팡페이|토스|기타","category":"광고비|사무용품|통신비|교통비|주유비|주차비|식대|배달비|접대비|임대료|수도광열비|보험료|세금공과|수리비|택배비|도서인쇄비|교육훈련비|경조사비|소모품|구독료|복리후생비|감가상각비|기타"}\n영수증 아니면 {"error":"영수증이 아닙니다"}';

    // 모델 목록 (순서대로 시도)
    const models = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
    let lastError = '';

    for (const model of models) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
                { type: 'text', text: prompt },
              ],
            }],
          }),
        });

        if (r.ok) {
          const d = await r.json();
          const text = d.content?.map(c => c.text || '').join('') || '';
          const cleaned = text.replace(/```json|```/g, '').trim();
          return res.status(200).json(JSON.parse(cleaned));
        }

        const errBody = await r.text();
        lastError = `${model}: ${r.status} ${errBody}`;
        // 인증 오류면 다른 모델 시도해도 소용없음
        if (r.status === 401 || r.status === 403) {
          return res.status(500).json({ error: 'API 키가 유효하지 않습니다. 키를 확인해주세요.' });
        }
        // 그 외 오류면 다음 모델 시도
        continue;
      } catch (fetchErr) {
        lastError = `${model}: ${fetchErr.message}`;
        continue;
      }
    }

    return res.status(500).json({ error: 'AI 서비스 연결 실패: ' + lastError });
  } catch (e) {
    return res.status(500).json({ error: '분석 실패: ' + e.message });
  }
}
