import { json, parseJson, mergeConfig, store } from "../_utils.js";

// GET /api/config?survey=...
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("survey") || "1";
  const raw = await store(env).get(`config:${surveyId}`);
  return json(mergeConfig(parseJson(raw, null)));
}
