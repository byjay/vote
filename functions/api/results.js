import {
  json,
  parseJson,
  store,
  BALLOT_PREFIX,
  mergeConfig,
} from "../_utils.js";

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

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("survey") || "1";
  const db = store(env);
  const config = mergeConfig(parseJson(await db.get(`config:${surveyId}`), null));

  // 투표자 기록 조회 (구글 이메일 기준으로 저장된 실명+전화번호 레코드)
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
    totalMembers: votedCount,   // 투표한 사람 수 = 전체 기준
    votedCount,
    voterRecords,               // 관리자용: 누가 언제 투표했는지
  });
}
