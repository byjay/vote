import {
  json,
  readJson,
  parseJson,
  isAdminAuthed,
  store,
  BALLOT_PREFIX,
  VOTED_PREFIX,
  mergeConfig,
  votedKey,
} from "../../_utils.js";

// 익명 투표용지(ballot:<surveyId>:*)를 한 번의 쿼리로 읽어 문항별 집계
async function tally(db, surveyId, questions) {
  const prefix = `${BALLOT_PREFIX}${surveyId}:`;
  const rows = await db.getByPrefix(prefix);

  const results = {};
  for (const q of questions) {
    results[q.id] = {};
    if (q.type === "choice") {
      for (const opt of q.options) {
        results[q.id][opt] = 0;
      }
    } else {
      results[q.id] = { for: 0, against: 0 };
    }
  }

  for (const row of rows) {
    const ballot = parseJson(row.v, null);
    if (!ballot) continue;
    for (const q of questions) {
      const v = ballot[q.id];
      if (v !== undefined && v !== null) {
        if (results[q.id][v] === undefined) {
          results[q.id][v] = 0;
        }
        results[q.id][v] += 1;
      }
    }
  }
  return results;
}

// GET /api/admin/results?survey=...
export async function onRequestGet({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);

  const url = new URL(request.url);
  const surveyId = url.searchParams.get("survey") || "1";
  const db = store(env);
  const config = mergeConfig(parseJson(await db.get(`config:${surveyId}`), null));

  // voter_record:<surveyId>:* 에서 실명 기록 조회
  const voterPrefix = `voter_record:${surveyId}:`;
  let voterRecords = [];
  try {
    const rows = await db.getByPrefix(voterPrefix);
    voterRecords = rows.map((r) => parseJson(r.v, null)).filter(Boolean);
  } catch (e) {}

  const votedCount = voterRecords.length;
  const results = await tally(db, surveyId, config.questions);

  return json({
    questions: config.questions,
    results,
    totalMembers: votedCount,
    votedCount,
    voterRecords,   // 이름·전화번호·이메일·시각 기록
  });
}

// POST /api/admin/results { action: "reset", surveyId }
export async function onRequestPost({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(request);
  if (!body || body.action !== "reset") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const surveyId = String(body.surveyId || "1").trim();
  const db = store(env);

  // 투표용지 삭제
  await db.deleteByPrefix(`${BALLOT_PREFIX}${surveyId}:`);
  // 참여 여부 기록 삭제
  await db.deleteByPrefix(`${VOTED_PREFIX}${surveyId}:`);
  // 실명 기록 삭제
  await db.deleteByPrefix(`voter_record:${surveyId}:`);

  return json({ ok: true });
}
