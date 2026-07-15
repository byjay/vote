import { json, readJson, safeEqual, adminName } from "../../_utils.js";

// POST /api/admin/login  { name, password }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.password !== "string") {
    return json({ ok: false, error: "잘못된 요청입니다." }, 400);
  }
  if (!body.name || String(body.name).trim() !== adminName(env)) {
    return json({ ok: false, error: "관리자 이름이 올바르지 않습니다." }, 401);
  }
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "서버에 ADMIN_PASSWORD가 설정되어 있지 않습니다." }, 500);
  }
  if (safeEqual(body.password, env.ADMIN_PASSWORD)) {
    return json({ ok: true });
  }
  return json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, 401);
}
