// 공통 유틸 함수

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// 요청 본문 JSON을 안전하게 파싱 (실패 시 null 반환 - 500 에러 방지)
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// 저장값 JSON 파싱 (깨진 데이터 방어)
export function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// 타이밍 공격을 피하는 상수 시간 문자열 비교
export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// 모듈로 편향 없는 안전한 랜덤 문자열 생성
function randomFromChars(chars, len) {
  const max = 256 - (256 % chars.length);
  let out = "";
  while (out.length < len) {
    const buf = new Uint8Array(len * 2);
    crypto.getRandomValues(buf);
    for (const v of buf) {
      if (v < max) {
        out += chars[v % chars.length];
        if (out.length === len) break;
      }
    }
  }
  return out;
}

export function randomPassword(len = 6) {
  return randomFromChars("ABCDEFGHJKMNPQRSTUVWXYZ23456789", len);
}

export function randomId(len = 8) {
  return randomFromChars("abcdefghijkmnpqrstuvwxyz23456789", len);
}

// 전화번호 숫자만 추출하는 정규화 유틸
export function normalizePhone(p) {
  return String(p || "").replace(/[^0-9]/g, "");
}

// 관리자 이름: 환경변수 ADMIN_NAME 우선, 없으면 기본값
export function adminName(env) {
  return (env.ADMIN_NAME || "천세종").trim();
}

/* ════════════════════════════════════════════════════════════
   Firebase ID 토큰 검증 로직 제거 (모바일 전용 간소화)
   ──────────────────────────────────────────────────────────── */
export async function verifyFirebaseToken(token, expectedProjectId) {
  // 구글 로그인 미사용으로 항상 null 반환
  return null;
}

export async function isAdminAuthed(request, env) {
  const header = request.headers.get("x-admin-password") || "";
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer /i, "") || header;
  if (!token) return false;

  if (env.ADMIN_PASSWORD && safeEqual(token, env.ADMIN_PASSWORD)) return true;
  return false;
}

// D1 기반 key-value 저장소 어댑터
export function store(env) {
  const db = env.VOTE_DB;
  return {
    async get(k) {
      const row = await db.prepare("SELECT v FROM kv WHERE k = ?1").bind(k).first();
      return row ? row.v : null;
    },
    async put(k, v) {
      await db
        .prepare("INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v")
        .bind(k, String(v))
        .run();
    },
    async delete(k) {
      await db.prepare("DELETE FROM kv WHERE k = ?1").bind(k).run();
    },
    async listKeys(prefix) {
      const res = await db
        .prepare("SELECT k FROM kv WHERE k LIKE ?1 || '%'")
        .bind(prefix)
        .all();
      return (res.results || []).map((r) => r.k);
    },
    async getByPrefix(prefix) {
      const res = await db
        .prepare("SELECT k, v FROM kv WHERE k LIKE ?1 || '%'")
        .bind(prefix)
        .all();
      return res.results || [];
    },
    async deleteByPrefix(prefix) {
      await db
        .prepare("DELETE FROM kv WHERE k LIKE ?1 || '%'")
        .bind(prefix)
        .run();
    },
  };
}

export function votedKey(surveyId, memberId) {
  return `voted:${surveyId}:${memberId}`;
}

export const BALLOT_PREFIX = "ballot:";
export const VOTED_PREFIX = "voted:";

// 입력값 상한
export const MAX_QUESTIONS = 50;
export const MAX_MEMBERS = 500;
export const MAX_TEXT_LEN = 500;
export const MAX_NAME_LEN = 50;
export const MAX_LABEL_LEN = 20;

export const FONT_SIZES = ["small", "medium", "large", "xlarge"];
export const SHOW_WHEN = ["any", "for", "against"];

export const DEFAULT_CONFIG = {
  title: "회원 안건 투표",
  subtitle: "아래 안건에 대해 찬반 또는 선택지를 선택해 주세요.",
  questions: [{ id: "q1", text: "안건 1에 찬성하십니까?", type: "boolean", options: [], parentId: null, showWhen: "any" }],
  design: {
    fontSize: "medium",
    primaryColor: "#1e3a8a",
    accentColor: "#b08d3f",
    bgColor: "#f4f2ec",
    labelFor: "찬성",
    labelAgainst: "반대",
    doneMessage: "소중한 한 표에 감사드립니다.\n정상적으로 제출되었습니다.",
    kakaoAppKey: "",
    firebaseConfig: "",
  },
};

// 저장된 config에 기본값을 병합
export function mergeConfig(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const d = cfg.design && typeof cfg.design === "object" ? cfg.design : {};
  const questions = Array.isArray(cfg.questions) && cfg.questions.length
    ? cfg.questions.map((q) => ({
        id: String(q.id || ""),
        text: String(q.text || ""),
        type: q.type === "choice" ? "choice" : "boolean",
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        parentId: q.parentId ? String(q.parentId) : null,
        showWhen: SHOW_WHEN.includes(q.showWhen) ? q.showWhen : "any",
      }))
    : DEFAULT_CONFIG.questions;
  return {
    title: typeof cfg.title === "string" && cfg.title ? cfg.title : DEFAULT_CONFIG.title,
    subtitle: typeof cfg.subtitle === "string" ? cfg.subtitle : DEFAULT_CONFIG.subtitle,
    questions,
    design: {
      fontSize: FONT_SIZES.includes(d.fontSize) ? d.fontSize : DEFAULT_CONFIG.design.fontSize,
      primaryColor: d.primaryColor || DEFAULT_CONFIG.design.primaryColor,
      accentColor: d.accentColor || DEFAULT_CONFIG.design.accentColor,
      bgColor: d.bgColor || DEFAULT_CONFIG.design.bgColor,
      labelFor: d.labelFor || DEFAULT_CONFIG.design.labelFor,
      labelAgainst: d.labelAgainst || DEFAULT_CONFIG.design.labelAgainst,
      doneMessage: typeof d.doneMessage === "string" && d.doneMessage
        ? d.doneMessage
        : DEFAULT_CONFIG.design.doneMessage,
      kakaoAppKey: typeof d.kakaoAppKey === "string" ? d.kakaoAppKey.trim() : "",
      firebaseConfig: typeof d.firebaseConfig === "string" ? d.firebaseConfig.trim() : "",
    },
  };
}

export function isQuestionVisible(q, byId, answers) {
  if (!q.parentId) return true;
  const parent = byId.get(q.parentId);
  if (!parent) return false;
  const a = answers[parent.id];
  if (parent.type === "choice") {
    if (!a) return false;
    return q.showWhen === "any" || a === q.showWhen;
  }
  if (a !== "for" && a !== "against") return false;
  return q.showWhen === "any" || a === q.showWhen;
}

// ════════════════ 구글 플레이스토어 심사 기준 준수 암호화 모듈 ════════════════
const ENCRYPT_ALGO = "AES-GCM";

export async function encryptPhone(phone, secretKeyStr = "secret_vote_phone_key_secure_32b") {
  try {
    const enc = new TextEncoder();
    const keyBuf = enc.encode(secretKeyStr.padEnd(32, "0").slice(0, 32));
    const key = await crypto.subtle.importKey("raw", keyBuf, ENCRYPT_ALGO, false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt({ name: ENCRYPT_ALGO, iv }, key, enc.encode(phone));
    const cipherArr = new Uint8Array(cipherBuf);
    const combined = new Uint8Array(iv.length + cipherArr.length);
    combined.set(iv, 0);
    combined.set(cipherArr, iv.length);
    return Array.from(combined).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return phone;
  }
}

export async function decryptPhone(hexStr, secretKeyStr = "secret_vote_phone_key_secure_32b") {
  try {
    if (!/^[0-9a-fA-F]+$/.test(hexStr)) return hexStr;
    const combined = new Uint8Array(hexStr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const enc = new TextEncoder();
    const keyBuf = enc.encode(secretKeyStr.padEnd(32, "0").slice(0, 32));
    const key = await crypto.subtle.importKey("raw", keyBuf, ENCRYPT_ALGO, false, ["decrypt"]);
    const decryptedBuf = await crypto.subtle.decrypt({ name: ENCRYPT_ALGO, iv }, key, cipher);
    return new TextDecoder().decode(decryptedBuf);
  } catch (e) {
    return hexStr;
  }
}

export async function hashPhone(phone) {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone + "_vote_salt_value");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
