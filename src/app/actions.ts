"use server";

import { ALL_QUESTIONS, OTHER_PREFIX, type Answers, type Generation } from "@/lib/questions";

type SubmitResult = { ok: true } | { ok: false; error: string };

const MAX_TEXT = 200;
const GENERIC_ERROR = "Não foi possível enviar suas respostas. Tente novamente.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getValidText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TEXT) return null;
  return trimmed;
}

function getValidChoice(raw: unknown, options: string[] | undefined, allowOther: boolean | undefined): string | null {
  if (typeof raw !== "string") return null;
  if (options && options.includes(raw)) return raw;
  if (allowOther && raw.startsWith(OTHER_PREFIX)) {
    const text = getValidText(raw.slice(OTHER_PREFIX.length));
    if (text !== null) return OTHER_PREFIX + text;
  }
  return null;
}

function getValidCheckbox(raw: unknown, options: string[] | undefined, allowOther: boolean | undefined): string[] | null {
  if (!Array.isArray(raw)) return null;
  const maxItems = (options?.length ?? 0) + (allowOther ? 1 : 0);
  if (raw.length === 0 || raw.length > maxItems) return null;
  const result: string[] = [];
  for (const item of raw) {
    const choice = getValidChoice(item, options, allowOther);
    if (choice === null || result.includes(choice)) return null;
    if (choice.startsWith(OTHER_PREFIX) && result.some((r) => r.startsWith(OTHER_PREFIX))) return null;
    result.push(choice);
  }
  return result;
}

export async function submitSurvey(generation: Generation, answers: Answers): Promise<SubmitResult> {
  const gen: unknown = generation;
  if (gen !== "Z" && gen !== "Y") return { ok: false, error: GENERIC_ERROR };

  const rawAnswers: unknown = answers;
  if (!isRecord(rawAnswers)) return { ok: false, error: GENERIC_ERROR };

  const payload: Record<string, string> = {
    timestamp: new Date().toISOString(),
    geracao: gen === "Z" ? "Geração Z" : "Geração Y (Millennials)",
  };

  for (const question of ALL_QUESTIONS) {
    const raw = rawAnswers[question.id];
    const isEmpty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);

    if (isEmpty) {
      if (question.required) return { ok: false, error: GENERIC_ERROR };
      payload[question.id] = "";
      continue;
    }

    if (question.type === "text") {
      const text = getValidText(raw);
      if (text === null) return { ok: false, error: GENERIC_ERROR };
      payload[question.id] = text;
    } else if (question.type === "radio") {
      const choice = getValidChoice(raw, question.options, question.allowOther);
      if (choice === null) return { ok: false, error: GENERIC_ERROR };
      payload[question.id] = choice;
    } else {
      const choices = getValidCheckbox(raw, question.options, question.allowOther);
      if (choices === null) return { ok: false, error: GENERIC_ERROR };
      payload[question.id] = choices.join("; ");
    }
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!webhookUrl) return { ok: false, error: "Servidor não configurado." };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, data: payload }),
      redirect: "follow",
      cache: "no-store",
    });

    const responseText = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(responseText);
    } catch {
      throw new Error(`Resposta inválida do webhook (HTTP ${response.status})`);
    }

    if (!response.ok || !isRecord(json) || json.ok !== true) {
      throw new Error(`Webhook recusou: ${responseText.slice(0, 200)}`);
    }

    return { ok: true };
  } catch (error) {
    console.error("submitSurvey error", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
