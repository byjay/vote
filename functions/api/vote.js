import {
  json,
  readJson,
  parseJson,
  votedKey,
  mergeConfig,
  isQuestionVisible,
  store,
  BALLOT_PREFIX,
  normalizePhone,
  decryptPhone,
} from "../_utils.js";

// POST /api/vote
// body: { surveyId, voterkey, sessionToken, answers }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.voterkey !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const { voterkey, sessionToken, answers } = body;
  const surveyId = String(body.surveyId || "1").trim();

  const db = store(env);

  // 1. 임시 세션 토큰 검증
  const sessionKey = "vote_session:" + surveyId + ":" + voterkey;
  const rawSession = await db.get(sessionKey);
  if (!rawSession) {
    return json({ valid: false, error: "투표 권한이 없거나 인증 세션이 만료되었습니다." }, 401);
  }

  const session = parseJson(rawSession, null);
  if (!session || Date.now() > session.expiresAt) {
    await db.delete(sessionKey);
    return json({ valid: false, error: "인증 세션이 만료되었습니다. 다시 휴대폰 인증을 진행해 주세요." }, 401);
  }

  // 2. 회원 실명 정보 획득 (members DB 대조)
  const rawMembers = await db.get("members");
  const members = parseJson(rawMembers, []);
  const member = members.find((m) => String(m.id) === voterkey);

  if (!member) {
    return json({ error: "존재하지 않는 회원 번호입니다." }, 400);
  }

  const email = member.email ? member.email.trim().toLowerCase() : "";
  const voter = {
    id: voterkey,
    name: member.name || "참여자",
    email: email,
  };

  // 이미 투표했는지 확인
  const alreadyVoted = Boolean(await db.get(votedKey(surveyId, voter.id)));

  // voterHash 구하기 (SHA-256)
  const msgUint8 = new TextEncoder().encode(voter.id);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const voterHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // answers가 없으면 로그인 인증체크만 수행
  if (answers === undefined || answers === null) {
    let votedInfo = null;
    if (alreadyVoted) {
      try {
        const record = parseJson(await db.get("voter_record:" + surveyId + ":" + voterkey), null);
        const ballot = parseJson(await db.get(BALLOT_PREFIX + surveyId + ":" + voterHash), null);
        votedInfo = {
          timestamp: record ? record.timestamp : null,
          answers: ballot || null
        };
      } catch (e) {}
    }

    return json({
      valid: true,
      id: voter.id,
      name: voter.name,
      email: voter.email,
      voted: alreadyVoted,
      votedInfo,
    });
  }

  // 중복 투표 차단
  if (alreadyVoted) {
    return json({ error: "이미 투표에 참여하셨습니다. 중복 투표는 허용되지 않습니다." }, 400);
  }

  if (typeof answers !== "object" || Array.isArray(answers)) {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const config = mergeConfig(parseJson(await db.get("config:" + surveyId), null));
  const byId = new Map(config.questions.map((q) => [q.id, q]));

  // 알 수 없는 문항 응답 차단
  for (const key of Object.keys(answers)) {
    if (!byId.has(key)) return json({ error: "알 수 없는 문항입니다." }, 400);
  }

  const cleanAnswers = {};
  for (const q of config.questions) {
    if (isQuestionVisible(q, byId, answers)) {
      const val = answers[q.id];
      if (q.type === "choice") {
        if (!val || typeof val !== "string" || !q.options.includes(val)) {
          return json({ error: "[" + q.text + "] 문항에 올바른 선택지를 입력해 주세요." }, 400);
        }
      } else {
        if (val !== "for" && val !== "against") {
          return json({ error: "[" + q.text + "] 문항에 가/부 응답을 완료해 주세요." }, 400);
        }
      }
      cleanAnswers[q.id] = val;
    }
  }

  // 3. 익명 투표용지 저장: voterkey 해싱
  await db.put(BALLOT_PREFIX + surveyId + ":" + voterHash, JSON.stringify(cleanAnswers));

  // 4. 참여 완료 플래그 세팅 (voterkey 기준)
  await db.put(votedKey(surveyId, voter.id), "1");

  // 5. 투표 기록 저장 (플레이스토어 심사용 수단 및 마스킹 번호 포함)
  const surveyTitle = config.title || "기본 설문";
  const channel = session.channel || "sms";
  const decrypted = await decryptPhone(member.phone || "");
  const phoneMasked = decrypted.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-$2-****");

  await db.put("voter_record:" + surveyId + ":" + voterkey, JSON.stringify({
    name: voter.name,
    email: voter.email,
    phone: phoneMasked,
    channel: channel,
    channelName: channel === "kakao" ? "카카오톡" : "문자(SMS)",
    timestamp: new Date().toISOString(),
    surveyTitle,
  }));

  // 투표 완료 후 사용된 세션 토큰 즉각 폐기
  await db.delete(sessionKey);

  return json({ ok: true });
}