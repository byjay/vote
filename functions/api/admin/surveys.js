import {
  json,
  readJson,
  parseJson,
  isAdminAuthed,
  store,
  BALLOT_PREFIX,
  VOTED_PREFIX,
} from "../../_utils.js";

// GET /api/admin/surveys  -> 관리자용 설문 목록 조회
export async function onRequestGet({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);
  const db = store(env);
  const raw = await db.get("surveys");
  let surveys = parseJson(raw, null);
  if (!surveys || !Array.isArray(surveys) || surveys.length === 0) {
    surveys = [{ id: "1", title: "기본 설문" }];
    await db.put("surveys", JSON.stringify(surveys));
  }
  return json({ surveys });
}

// POST /api/admin/surveys
export async function onRequestPost({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(request);
  if (!body || typeof body.action !== "string") {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const db = store(env);
  const raw = await db.get("surveys");
  let surveys = parseJson(raw, []);

  if (body.action === "create") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!id || !title) return json({ error: "설문 ID와 제목이 필요합니다." }, 400);
    if (!/^[a-zA-Z0-9_-]{1,16}$/.test(id)) {
      return json({ error: "설문 ID는 1~16자의 영문, 숫자, -, _만 사용 가능합니다." }, 400);
    }
    if (surveys.some((s) => s.id === id)) {
      return json({ error: "이미 존재하는 설문 ID입니다." }, 400);
    }
    surveys.push({ id, title });
    await db.put("surveys", JSON.stringify(surveys));
    return json({ ok: true, surveys });
  }

  if (body.action === "delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json({ error: "삭제할 설문 ID가 필요합니다." }, 400);
    if (id === "1" && surveys.length === 1) {
      return json({ error: "최소 1개의 설문은 유지되어야 합니다." }, 400);
    }

    surveys = surveys.filter((s) => s.id !== id);
    if (surveys.length === 0) {
      // 설문이 아예 비어있게 되는 것 방지
      surveys = [{ id: "1", title: "기본 설문" }];
    }
    await db.put("surveys", JSON.stringify(surveys));

    // 해당 설문 관련 데이터 모두 파기
    await db.delete(`config:${id}`);
    await db.deleteByPrefix(`${BALLOT_PREFIX}${id}:`);
    await db.deleteByPrefix(`${VOTED_PREFIX}${id}:`);

    return json({ ok: true, surveys });
  }

  return json({ error: "알 수 없는 동작입니다." }, 400);
}
