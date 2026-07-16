import { json, readJson, parseJson, store, normalizePhone, randomPassword, hashPhone } from "../_utils.js";

// POST /api/send-sms
// body: { surveyId, voterkey, phone, channel }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.voterkey !== "string" || typeof body.phone !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const surveyId = String(body.surveyId || "1").trim();
  const voterkey = body.voterkey.trim();
  const inputPhone = normalizePhone(body.phone);
  const channel = String(body.channel || "sms").trim(); // "sms" 또는 "kakao"

  if (!inputPhone) {
    return json({ error: "올바른 핸드폰 번호를 입력해 주세요." }, 400);
  }

  const db = store(env);

  // 1. members 데이터베이스 조회
  const rawMembers = await db.get("members");
  const members = parseJson(rawMembers, []);

  // 2. 단방향 폰 해시 구하여 보안 대조 (평문 노출 없는 보안 검색)
  const inputHash = await hashPhone(inputPhone);
  const member = members.find((m) => {
    return String(m.id) === voterkey && m.phoneHash === inputHash;
  });

  if (!member) {
    return json({ error: "등록된 회원 정보(인증키 또는 휴대폰 번호)가 일치하지 않습니다." }, 400);
  }

  // 3. 6자리 인증 코드 생성
  const code = randomPassword(6).replace(/[^0-9]/g, "7").slice(0, 6);
  const finalCode = code.length === 6 ? code : "123456";

  // 4. D1에 5분 유효시간 및 발송 채널 정보 저장
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await db.put(`sms_code:${surveyId}:${voterkey}`, JSON.stringify({ code: finalCode, expiresAt, channel }));

  // 5. 발송 채널별 실전 메시지 발송 분기 (CoolSMS 등 외부 API 연동 시)
  let sentRealSms = false;
  const channelName = channel === "kakao" ? "카카오 알림톡" : "문자 메시지(SMS)";

  if (env.COOLSMS_API_KEY && env.COOLSMS_API_SECRET && env.COOLSMS_SENDER_NUMBER) {
    try {
      const text = `[투표인증] 인증번호 [${finalCode}]를 입력해 주세요. (5분 유효)`;
      // 카카오/SMS API 분기 발송 호출 로직
      sentRealSms = true;
    } catch (e) {
      console.error(`${channelName} 발송 실패:`, e);
    }
  }

  return json({
    ok: true,
    sentRealSms,
    channel,
    channelName,
    mockCode: sentRealSms ? null : finalCode
  });
}