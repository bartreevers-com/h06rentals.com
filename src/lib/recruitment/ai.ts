import "server-only";
import type { Vacancy } from "../db/schema";

/**
 * AI-assisted candidate analysis — strictly an assistant, never a decider.
 *
 * The model summarises what the candidate actually submitted, cites every
 * observation back to a specific answer, lists what's missing, and suggests
 * follow-up interview questions. It is explicitly forbidden from scoring,
 * ranking, rejecting, or inferring protected characteristics; official
 * assessment comes only from human scorecards. Output is always rendered
 * under the mandatory human-review label.
 *
 * Requires ANTHROPIC_API_KEY. Video/audio transcription is not yet wired
 * (needs a speech-to-text provider) — the analysis covers written answers.
 */

export const AI_LABEL = "AI-assisted summary. This is not a hiring decision and must be reviewed by a human.";

const MODEL = process.env.RECRUITMENT_AI_MODEL ?? "claude-sonnet-5";

export interface AiResult {
  model: string;
  summary: string;
  evidence: { observation: string; source: string; quote: string }[];
  missingInfo: string[];
  followUpQuestions: string[];
}

const SYSTEM = `You assist H06 Rentals' recruitment team by organising evidence from job applications. You are an assistant, not a decision-maker.

Hard rules:
- Never recommend rejecting or hiring anyone, never rank candidates, never produce scores.
- Never judge attractiveness, personality, accent, or anything inferred from face or voice.
- Never infer or mention age, disability, religion, ethnicity, or sexuality.
- Never invent evidence. Every observation must quote the candidate's actual words and name its source field.
- If information is absent, list it under missing information instead of guessing.

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{"summary": "3-5 sentence neutral summary of what the candidate submitted",
 "evidence": [{"observation": "what this shows relevant to a listed competency", "source": "the field or question it came from", "quote": "the candidate's exact words"}],
 "missing_info": ["information the panel would want but the application does not contain"],
 "follow_up_questions": ["specific interview questions grounded in this application"]}`;

export async function analyseApplication(opts: {
  vacancy: Vacancy;
  form: Record<string, unknown>;
  files: { kind: string; filename: string }[];
}): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "AI assistant not configured — add ANTHROPIC_API_KEY in Vercel env (Settings → Environment Variables) and redeploy.",
    );
  }

  const { vacancy, form, files } = opts;
  const answers = vacancy.questions
    .map((q) => `Question: ${q.label}\nAnswer: ${String(form[q.id] ?? "(not answered)")}`)
    .join("\n\n");
  const standard = [
    ["Location", form.location],
    ["Availability", form.availability],
    ["Portfolio / links", form.portfolio],
    ["Employment status", form.employmentStatus],
    ["Notice period", form.noticePeriod],
    ["Conflict of interest", form.conflictOfInterest, form.conflictDetails],
    ["Brand commitments", form.brandConflict, form.brandConflictDetails],
  ]
    .filter(([, v]) => v)
    .map((row) => `${row[0]}: ${row.slice(1).filter(Boolean).join(" — ")}`)
    .join("\n");
  const competencies = vacancy.competencies.map((c) => `${c.name} (weight ${c.weight})`).join(", ");

  const user = `Vacancy: ${vacancy.title}
Approved competencies: ${competencies}

Candidate's standard details:
${standard || "(none provided)"}

Candidate's answers:
${answers || "(no questions on this vacancy)"}

Files submitted (contents NOT available to you — do not speculate about them): ${files.map((f) => `${f.kind}: ${f.filename}`).join(", ") || "none"}

Organise the evidence per your rules.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const raw = data.content.find((c) => c.type === "text")?.text ?? "";
  const jsonText = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: {
    summary?: string;
    evidence?: { observation?: string; source?: string; quote?: string }[];
    missing_info?: string[];
    follow_up_questions?: string[];
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI returned an unreadable response — try again");
  }

  return {
    model: MODEL,
    summary: String(parsed.summary ?? "").slice(0, 4000),
    evidence: (parsed.evidence ?? [])
      .filter((e) => e && e.observation && e.quote)
      .map((e) => ({
        observation: String(e.observation).slice(0, 500),
        source: String(e.source ?? "application").slice(0, 200),
        quote: String(e.quote).slice(0, 500),
      })),
    missingInfo: (parsed.missing_info ?? []).map((m) => String(m).slice(0, 300)),
    followUpQuestions: (parsed.follow_up_questions ?? []).map((q) => String(q).slice(0, 300)),
  };
}
