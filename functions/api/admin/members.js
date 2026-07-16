import {
  json,
  readJson,
  parseJson,
  isAdminAuthed,
  randomId,
  votedKey,
  store,
  MAX_MEMBERS,
  MAX_NAME_LEN,
  encryptPhone,
  decryptPhone,
  hashPhone,
} from "../../_utils.js";

async function getMembersWithVoted(env, surveyId) {
  const db = store(env);
  const raw = await db.get("members");
  const members = parseJson(raw, []);
  // 투표 여부는 설문별 개별 키로 조회
  const votedFlags = await Promise.all(
    members.map((m) => db.get(votedKey(surveyId, m.id)))
  );

  // 정보보호 및 플레이스토어 심사 대비 마스킹 처리
  const processed = [];
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const decrypted = await decryptPhone(m.phone);
    const phoneMasked = decrypted.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-$2-****");
    processed.push({
      ...m,
      phone: phoneMasked,
      voted: Boolean(votedFlags[i])
    });
  }
  return processed;
}

// GET /api/admin/members?survey=...
export async function onRequestGet({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("survey") || "1";
  return json({ members: await getMembersWithVoted(env, surveyId) });
}

// POST /api/admin/members
export async function handlePost({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(request);
  if (!body || typeof body.action !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const surveyId = String(body.surveyId || "1").trim();
  const db = store(env);

  if (body.action === "clear") {
    await db.put("members", JSON.stringify([]));
    await db.deleteByPrefix("voted:");
    await db.deleteByPrefix("ballot:");
    return json({ ok: true, members: [] });
  }

  if (body.action !== "create" && body.action !== "replace") {
    return json({ error: "알 수 없는 동작입니다." }, 400);
  }

  // members 페이로드 파싱: [{ name, email, phone }]
  const inputMembers = (Array.isArray(body.members) ? body.members : [])
    .filter((m) => m && typeof m.name === "string")
    .map((m) => ({
      name: m.name.trim().slice(0, MAX_NAME_LEN),
      email: typeof m.email === "string" ? m.email.trim().toLowerCase() : "",
      phone: typeof m.phone === "string" ? m.phone.trim() : "",
    }))
    .filter((m) => m.name);

  if (inputMembers.length === 0) {
    return json({ error: "등록할 대상자 목록이 비어 있거나 올바르지 않습니다." }, 400);
  }

  let members = [];
  if (body.action === "create") {
    const raw = await db.get("members");
    members = parseJson(raw, []);
  } else {
    // replace인 경우 투표 기록 클리어
    await db.deleteByPrefix("voted:");
    await db.deleteByPrefix("ballot:");
  }

  if (members.length + inputMembers.length > MAX_MEMBERS) {
    return json({ error: `대상자는 최대 ${MAX_MEMBERS}명까지 등록할 수 있습니다.` }, 400);
  }

  const existingEmails = new Set(members.map((m) => m.email).filter(Boolean));
  const existingIds = new Set(members.map((m) => m.id));

  for (const im of inputMembers) {
    if (im.email && existingEmails.has(im.email)) continue;
    let id;
    do {
      id = randomId(8);
    } while (existingIds.has(id));
    existingIds.add(id);
    if (im.email) {
      existingEmails.add(im.email);
    }

    // 휴대폰 번호 AES-256-GCM 암호화 및 검색용 솔티드 해시 매핑 저장
    const encrypted = await encryptPhone(im.phone);
    const hashed = await hashPhone(im.phone);
    members.push({
      id,
      name: im.name,
      email: im.email,
      phone: encrypted,
      phoneHash: hashed
    });
  }

  await db.put("members", JSON.stringify(members));

  return json({ ok: true, members: await getMembersWithVoted(env, surveyId) });
}

export async function onRequestPost(context) {
  try {
    return await handlePost(context);
  } catch (err) {
    return json({ error: err.message, stack: err.stack }, 500);
  }
}
