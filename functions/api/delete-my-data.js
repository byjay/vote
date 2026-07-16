import { json, readJson, parseJson, votedKey, store } from "../_utils.js";

// POST /api/delete-my-data
// body: { surveyId, voterkey }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.voterkey !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const surveyId = String(body.surveyId || "1").trim();
  const voterkey = body.voterkey.trim();

  const db = store(env);

  // 1. members 데이터베이스 조회 및 해당 회원 완전 삭제 (Hard Delete)
  const rawMembers = await db.get("members");
  const members = parseJson(rawMembers, []);
  const updatedMembers = members.filter((m) => String(m.id) !== voterkey);

  await db.put("members", JSON.stringify(updatedMembers));

  // 2. 투표 참여 여부 플래그 및 실명 투표기록 파기 (개인 식별 데이터 완전 파기)
  await db.delete(votedKey(surveyId, voterkey));
  await db.delete(`voter_record:${surveyId}:${voterkey}`);
  await db.delete(`sms_code:${surveyId}:${voterkey}`);
  await db.delete(`vote_session:${surveyId}:${voterkey}`);

  // 주의: 익명 투표용지(ballot:*)는 해시 인덱스 기반으로 격리되어 
  // 특정 개인과 연결이 불가능한 상태(익명성 보장)이므로 투표 집계의 정합성을 위해 유지합니다.

  return json({ ok: true });
}
