import { json, readJson, parseJson, store, safeEqual } from "../_utils.js";

// POST /api/verify-sms
// body: { surveyId, voterkey, code }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.voterkey !== "string" || typeof body.code !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const surveyId = String(body.surveyId || "1").trim();
  const voterkey = body.voterkey.trim();
  const inputCode = body.code.trim();

  const db = store(env);

  // 1. D1에서 저장된 SMS 인증정보 조회
  const smsKey = `sms_code:${surveyId}:${voterkey}`;
  const rawSms = await db.get(smsKey);
  if (!rawSms) {
    return json({ error: "인증번호 전송 이력이 없거나 만료되었습니다." }, 400);
  }

  const smsInfo = parseJson(rawSms, null);
  if (!smsInfo || Date.now() > smsInfo.expiresAt) {
    await db.delete(smsKey);
    return json({ error: "인증 유효시간(5분)이 만료되었습니다. 다시 시도해 주세요." }, 400);
  }

  // 2. 인증코드 대조
  if (!safeEqual(smsInfo.code, inputCode)) {
    return json({ error: "인증번호가 올바르지 않습니다." }, 400);
  }

  // 인증 성공 시 일회성 코드 삭제
  await db.delete(smsKey);

  // 3. 투표 권한 세션 토큰 생성 (D1 임시 저장)
  const sessionToken = "sess_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const sessionData = {
    voterkey,
    surveyId,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1시간 유효
  };

  await db.put(`vote_session:${surveyId}:${voterkey}`, JSON.stringify(sessionData));

  // voterHash 구하기
  const msgUint8 = new TextEncoder().encode(voterkey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const voterHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return json({
    ok: true,
    sessionToken,
    voterHash
  });
}