import {
  json,
  readJson,
  parseJson,
  isAdminAuthed,
  mergeConfig,
  store,
  DEFAULT_CONFIG,
  FONT_SIZES,
  SHOW_WHEN,
  MAX_QUESTIONS,
  MAX_TEXT_LEN,
  MAX_LABEL_LEN,
} from "../../_utils.js";

// GET /api/admin/config?survey=...
export async function onRequestGet({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("survey") || "1";
  const raw = await store(env).get(`config:${surveyId}`);
  return json(mergeConfig(parseJson(raw, null)));
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const QID_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;

// POST /api/admin/config
export async function onRequestPost({ request, env }) {
  if (!(await isAdminAuthed(request, env))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(request);
  if (!body) return json({ error: "잘못된 요청입니다." }, 400);

  const surveyId = String(body.surveyId || "1").trim();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return json({ error: "제목과 최소 1개 이상의 문항이 필요합니다." }, 400);
  }
  if (title.length > MAX_TEXT_LEN) {
    return json({ error: `제목은 ${MAX_TEXT_LEN}자 이내로 입력해 주세요.` }, 400);
  }
  if (body.questions.length > MAX_QUESTIONS) {
    return json({ error: `문항은 최대 ${MAX_QUESTIONS}개까지 가능합니다.` }, 400);
  }

  // 1차: 형식 검증 + ID 중복 검사
  const seenIds = new Set();
  const questions = [];
  for (const q of body.questions) {
    if (!q || typeof q.id !== "string" || typeof q.text !== "string") {
      return json({ error: "문항 형식이 올바르지 않습니다." }, 400);
    }
    const id = q.id.trim();
    const text = q.text.trim();
    if (!QID_PATTERN.test(id) || !text || text.length > MAX_TEXT_LEN) {
      return json({ error: "문항 형식이 올바르지 않습니다." }, 400);
    }
    if (seenIds.has(id)) {
      return json({ error: "문항 ID가 중복되었습니다." }, 400);
    }
    seenIds.add(id);

    const type = q.type === "choice" ? "choice" : "boolean";
    const options = Array.isArray(q.options)
      ? q.options.map(String).map((o) => o.trim()).filter(Boolean)
      : [];

    if (type === "choice" && options.length === 0) {
      return json({ error: `[${text}] 문항은 객관식이므로 최소 1개 이상의 선택지가 필요합니다.` }, 400);
    }

    questions.push({
      id,
      text,
      type,
      options,
      parentId: typeof q.parentId === "string" && q.parentId.trim() ? q.parentId.trim() : null,
      showWhen: SHOW_WHEN.includes(q.showWhen) ? q.showWhen : "any", // 만약 parentId가 객관식이면 showWhen은 특정 선택지 텍스트가 됨
    });
  }

  // 2차: 추가질문(parentId) 무결성 — 부모는 존재하는 문항이어야 함 (깊이 1 제한)
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const q of questions) {
    if (!q.parentId) continue;
    const parent = byId.get(q.parentId);
    if (!parent || parent.id === q.id || parent.parentId) {
      return json({ error: "추가질문의 상위 문항이 올바르지 않습니다." }, 400);
    }
    // 부모가 객관식인 경우, showWhen 조건 검증
    if (parent.type === "choice" && q.showWhen !== "any" && !parent.options.includes(q.showWhen)) {
      // showWhen이 부모 옵션 중 하나여야 함
      return json({ error: `추가질문 노출 조건(${q.showWhen})이 상위 문항의 선택지 목록에 없습니다.` }, 400);
    }
  }

  const d = body.design || {};
  const label = (v, fallback) =>
    typeof v === "string" && v.trim() && v.trim().length <= MAX_LABEL_LEN ? v.trim() : fallback;

  const config = {
    title,
    subtitle: typeof body.subtitle === "string" ? body.subtitle.slice(0, MAX_TEXT_LEN * 4) : "",
    questions,
    design: {
      fontSize: FONT_SIZES.includes(d.fontSize) ? d.fontSize : DEFAULT_CONFIG.design.fontSize,
      primaryColor: HEX_COLOR.test(d.primaryColor || "") ? d.primaryColor : DEFAULT_CONFIG.design.primaryColor,
      accentColor: HEX_COLOR.test(d.accentColor || "") ? d.accentColor : DEFAULT_CONFIG.design.accentColor,
      bgColor: HEX_COLOR.test(d.bgColor || "") ? d.bgColor : DEFAULT_CONFIG.design.bgColor,
      labelFor: label(d.labelFor, DEFAULT_CONFIG.design.labelFor),
      labelAgainst: label(d.labelAgainst, DEFAULT_CONFIG.design.labelAgainst),
      kakaoAppKey: typeof d.kakaoAppKey === "string" ? d.kakaoAppKey.trim().slice(0, 100) : "",
      firebaseConfig: typeof d.firebaseConfig === "string" ? d.firebaseConfig.trim().slice(0, 4000) : "",
      doneMessage: typeof d.doneMessage === "string" && d.doneMessage.trim()
        ? d.doneMessage.slice(0, MAX_TEXT_LEN * 2)
        : DEFAULT_CONFIG.design.doneMessage,
    },
  };

  await store(env).put(`config:${surveyId}`, JSON.stringify(config));
  return json({ ok: true, config });
}
