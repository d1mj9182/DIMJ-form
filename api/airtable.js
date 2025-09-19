/**
 * DIMJ-form Proxy Server v2.0 - UPDATED 2025-09-18
 * 완전 새로운 버전 - 4가지 핵심 문제 해결
 * - 이모지/특수문자 제거(필드키 정규화)
 * - 빈 레코드 필터링 (fields: {} 제거)
 * - createdTime 기준 최신순(내림차순) 정렬
 * - 캐시 무효화 헤더로 Vercel/CDN 캐시 영향 제거
 *
 * 필요 ENV (Vercel → Project Settings → Environment Variables)
 *  - AIRTABLE_API_KEY
 *  - AIRTABLE_BASE_ID
 *  - AIRTABLE_TABLE_NAME
 */

const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'OPTIONS'];

// 🔥🔥🔥 초강력 이모지 무시 시스템 - 모든 이모지 완전 제거 🔥🔥🔥
// 에어테이블 이모지 컬럼명을 완전히 무시하고 한글만 인식
function cleanFieldNames(fields = {}) {
  const cleaned = {};

  console.log('🔍 원본 에어테이블 필드명들:', Object.keys(fields));

  for (const rawKey in fields) {
    if (!Object.prototype.hasOwnProperty.call(fields, rawKey)) continue;

    // 🔥 ULTRA 강력 이모지 완전 제거 - 모든 특수문자 삭제 🔥
    let cleanKey = rawKey
      // 1차: 모든 이모지 유니코드 범위 완전 삭제
      .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/[\u{E000}-\u{F8FF}]/gu, '')
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
      // 2차: 모든 심볼 및 특수문자 완전 삭제
      .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ0-9]/g, '')
      // 3차: 남은 공백들 완전 제거
      .replace(/\s+/g, '')
      .trim();

    console.log(`🔄 ULTRA 변환: "${rawKey}" → "${cleanKey}"`);

    // 강력한 키워드 매칭 시스템 - 부분 문자열도 인식
    let finalKey = cleanKey;

    // 핵심 키워드만 추출하여 강제 매핑
    if (cleanKey.includes('접수') || cleanKey.includes('일시') || cleanKey.includes('시간')) {
      finalKey = '접수일시';
    } else if (cleanKey.includes('이름') || cleanKey.includes('성명')) {
      finalKey = '이름';
    } else if (cleanKey.includes('연락') || cleanKey.includes('전화') || cleanKey.includes('휴대폰')) {
      finalKey = '연락처';
    } else if (cleanKey.includes('통신사') || cleanKey.includes('통신')) {
      finalKey = '통신사';
    } else if (cleanKey.includes('주요') || cleanKey.includes('서비스')) {
      finalKey = '주요서비스';
    } else if (cleanKey.includes('기타') || cleanKey.includes('추가')) {
      finalKey = '기타서비스';
    } else if (cleanKey.includes('상담') || cleanKey.includes('희망')) {
      finalKey = '상담희망시간';
    } else if (cleanKey.includes('개인정보') || cleanKey.includes('동의')) {
      finalKey = '개인정보동의';
    } else if (cleanKey.includes('상태') || cleanKey.includes('진행')) {
      finalKey = '상태';
    } else if (cleanKey.includes('사은품') || cleanKey.includes('금액') || cleanKey.includes('혜택')) {
      finalKey = '사은품금액';
    } else if (cleanKey.includes('IP') || cleanKey.includes('주소')) {
      finalKey = 'IP주소';
    }

    // 값이 존재할 때만 추가
    if (fields[rawKey] !== undefined && fields[rawKey] !== null && fields[rawKey] !== '') {
      cleaned[finalKey] = fields[rawKey];
      console.log(`✅ ULTRA 매핑 성공: "${finalKey}" = "${fields[rawKey]}"`);
    }
  }

  console.log('🎯 ULTRA 최종 정리된 필드들:', Object.keys(cleaned));
  return cleaned;
}

function isNonEmptyFields(fields) {
  return fields && typeof fields === 'object' && Object.keys(fields).length > 0;
}

function sortByCreatedTimeDesc(records) {
  return records.slice().sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
}

async function fetchAirtablePage({ apiKey, baseId, tableName, offset = undefined }) {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
  // 필요시 select, filterByFormula 등을 추가 가능. 지금은 풀페치 + 백엔드에서 정제
  if (offset) url.searchParams.set('offset', offset);

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Airtable API ${resp.status}: ${text || 'Unknown error'}`);
  }

  return resp.json();
}

async function fetchAllAirtableRecords({ apiKey, baseId, tableName }) {
  let all = [];
  let offset;
  // Airtable pagination 대응
  do {
    const page = await fetchAirtablePage({ apiKey, baseId, tableName, offset });
    all = all.concat(page.records || []);
    offset = page.offset;
  } while (offset);
  return all;
}

module.exports = async function handler(req, res) {
  // CORS(필요시 도메인 제한)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // CDN/브라우저 캐시 무효화 (임의 숫자 변동 제거에 중요)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!ALLOWED_METHODS.includes(req.method)) return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return res.status(500).json({
        success: false,
        error: 'Missing environment variables: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME',
      });
    }

    // GET: 데이터 조회
    if (req.method === 'GET') {
      const rawRecords = await fetchAllAirtableRecords({ apiKey, baseId, tableName });
      console.log(`[PROXY] 원본 레코드 수: ${rawRecords.length}`);

      // 1) 빈 레코드 제거
      const nonEmpty = rawRecords.filter(r => isNonEmptyFields(r.fields));
      console.log(`[PROXY] 빈 레코드 제거 후: ${nonEmpty.length}`);

      // 2) 필드 키 클린업(이모지/특수문자 제거) - 강화된 로그
      const cleanedRecords = nonEmpty.map(r => {
        console.log(`[PROXY] 레코드 ${r.id} 처리 중...`);
        const cleanedFields = cleanFieldNames(r.fields);
        return {
          id: r.id,
          createdTime: r.createdTime,
          fields: cleanedFields,
        };
      });

      // 3) 최신순 정렬 (createdTime 내림차순)
      const sorted = sortByCreatedTimeDesc(cleanedRecords);

      console.log(`[PROXY v2.0] GET 처리 완료: ${sorted.length}개 유효 레코드`);

      // 디버깅: 첫 번째 레코드 상세 정보
      if (sorted.length > 0) {
        console.log(`[PROXY] 첫 번째 레코드 필드:`, sorted[0].fields);
      }

      return res.status(200).json({
        success: true,
        version: "2.0-EMOJI-KILLER",
        timestamp: new Date().toISOString(),
        totalRecords: rawRecords.length,
        validRecords: sorted.length,
        records: sorted,
        message: "🔥 초강력 이모지 무시 시스템 적용"
      });
    }

    // PATCH: 레코드 업데이트 (관리자 상태 변경용)
    if (req.method === 'PATCH') {
      const { recordId, fields } = req.body;

      if (!recordId || !fields) {
        return res.status(400).json({
          success: false,
          error: 'recordId와 fields가 필요합니다'
        });
      }

      const updateUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
      const updateResp = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields })
      });

      if (!updateResp.ok) {
        const errorText = await updateResp.text().catch(() => '');
        throw new Error(`Airtable PATCH ${updateResp.status}: ${errorText}`);
      }

      const updatedRecord = await updateResp.json();
      console.log(`[PROXY v2.0] PATCH 완료: ${recordId} 업데이트`);

      return res.status(200).json({
        success: true,
        message: '레코드 업데이트 완료',
        record: updatedRecord
      });
    }

    // POST: 새 레코드 생성 (폼 제출용)
    if (req.method === 'POST') {
      const { fields } = req.body;

      if (!fields) {
        return res.status(400).json({
          success: false,
          error: 'fields가 필요합니다'
        });
      }

      // 🔥 ULTRA 강력 필드명 자동 감지 시스템 🔥
      // 에어테이블의 실제 컬럼명을 동적으로 찾아서 매핑
      console.log(`[PROXY] POST 요청 필드들:`, fields);

      // 먼저 에어테이블에서 실제 컬럼 구조를 가져와서 매핑 테이블 생성
      const sampleRecords = await fetchAirtablePage({ apiKey, baseId, tableName });
      const realColumnNames = sampleRecords.records && sampleRecords.records.length > 0
        ? Object.keys(sampleRecords.records[0].fields || {})
        : [];

      console.log(`[PROXY] 에어테이블 실제 컬럼명들:`, realColumnNames);

      // 동적 매핑 생성
      const dynamicReverseMapping = {};
      for (const realCol of realColumnNames) {
        // 실제 컬럼명에서 이모지 제거하여 깨끗한 키 생성
        const cleanCol = realCol
          .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
          .replace(/[\u{2600}-\u{27BF}]/gu, '')
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
          .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
          .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
          .replace(/[\u{E000}-\u{F8FF}]/gu, '')
          .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
          .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
          .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ0-9]/g, '')
          .replace(/\s+/g, '')
          .trim();

        // 키워드 기반 매핑
        let mappedKey = cleanCol;
        if (cleanCol.includes('접수') || cleanCol.includes('일시')) mappedKey = '접수일시';
        else if (cleanCol.includes('이름')) mappedKey = '이름';
        else if (cleanCol.includes('연락')) mappedKey = '연락처';
        else if (cleanCol.includes('통신사')) mappedKey = '통신사';
        else if (cleanCol.includes('주요') && cleanCol.includes('서비스')) mappedKey = '주요서비스';
        else if (cleanCol.includes('기타')) mappedKey = '기타서비스';
        else if (cleanCol.includes('상담')) mappedKey = '상담희망시간';
        else if (cleanCol.includes('개인정보')) mappedKey = '개인정보동의';
        else if (cleanCol.includes('상태')) mappedKey = '상태';
        else if (cleanCol.includes('사은품') || cleanCol.includes('금액')) mappedKey = '사은품금액';
        else if (cleanCol.includes('IP')) mappedKey = 'IP주소';

        dynamicReverseMapping[mappedKey] = realCol;
      }

      console.log(`[PROXY] 동적 역매핑 테이블:`, dynamicReverseMapping);

      const originalFields = {};
      for (const [cleanKey, value] of Object.entries(fields)) {
        const originalKey = dynamicReverseMapping[cleanKey] || cleanKey;
        originalFields[originalKey] = value;
        console.log(`[PROXY] 매핑: "${cleanKey}" → "${originalKey}" = "${value}"`);
      }

      console.log(`[PROXY] 최종 POST 필드들:`, originalFields);

      const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
      const createResp = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: originalFields })
      });

      if (!createResp.ok) {
        const errorText = await createResp.text().catch(() => '');
        throw new Error(`Airtable POST ${createResp.status}: ${errorText}`);
      }

      const newRecord = await createResp.json();
      console.log(`[PROXY v2.0] POST 완료: 새 레코드 생성`);

      return res.status(201).json({
        success: true,
        message: '새 레코드 생성 완료',
        record: newRecord
      });
    }

  } catch (err) {
    console.error('[Airtable Proxy Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' });
  }
};// Force redeploy 1758153367
