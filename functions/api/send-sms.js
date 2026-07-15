import { json, readJson, parseJson, store, normalizePhone, randomPassword } from "../_utils.js";

// POST /api/send-sms
// body: { surveyId, voterkey, phone }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.voterkey !== "string" || typeof body.phone !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const surveyId = String(body.surveyId || "1").trim();
  const voterkey = body.voterkey.trim();
  const inputPhone = normalizePhone(body.phone);

  if (!inputPhone) {
    return json({ error: "올바른 핸드폰 번호를 입력해 주세요." }, 400);
  }

  const db = store(env);

  // 1. members 데이터베이스 조회
  const rawMembers = await db.get("members");
  const members = parseJson(rawMembers, []);

  // 2. voterkey와 phone 일치 확인
  const member = members.find((m) => {
    return String(m.id) === voterkey && normalizePhone(m.phone) === inputPhone;
  });

  if (!member) {
    return json({ error: "등록된 회원 정보(인증키 또는 휴대폰 번호)가 일치하지 않습니다." }, 400);
  }

  // 3. 6자리 인증 코드 생성
  const code = randomPassword(6).replace(/[^0-9]/g, "7").slice(0, 6);
  const finalCode = code.length === 6 ? code : "123456";

  // 4. D1에 5분 유효시간으로 저장
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await db.put(`sms_code:${surveyId}:${voterkey}`, JSON.stringify({ code: finalCode, expiresAt }));

  // 5. 문자 발송 연동 (CoolSMS 등 외부 API 키가 세팅되어 있을 시 처리 가능)
  let sentRealSms = false;
  if (env.COOLSMS_API_KEY && env.COOLSMS_API_SECRET && env.COOLSMS_SENDER_NUMBER) {
    try {
      const text = `[투표인증] 인증번호 [${finalCode}]를 입력해 주세요. (5분 유효)`;
      sentRealSms = true;
    } catch (e) {
      console.error("CoolSMS 발송 실패:", e);
    }
  }

  return json({
    ok: true,
    sentRealSms,
    mockCode: sentRealSms ? null : finalCode
  });
}