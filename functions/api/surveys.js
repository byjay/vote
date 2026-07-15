import { json, parseJson, store } from "../_utils.js";

// GET /api/surveys -> 투표자용 설문 목록 조회 (공개)
export async function onRequestGet({ env }) {
  const db = store(env);
  const raw = await db.get("surveys");
  let surveys = parseJson(raw, null);
  if (!surveys || !Array.isArray(surveys) || surveys.length === 0) {
    surveys = [{ id: "1", title: "기본 설문" }];
    await db.put("surveys", JSON.stringify(surveys));
  }
  return json({ surveys });
}
