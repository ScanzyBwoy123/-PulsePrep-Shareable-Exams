// Optional server-side AI endpoint for Netlify. Never put secrets in browser code.
// Configure OPENAI_API_KEY and AI_MODEL as Netlify environment variables.
// This function requires an AI provider account and may incur usage charges.
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});
const clean = v => typeof v === "string" ? v.trim() : "";
function validateQuestion(q) {
  if (!q || typeof q !== "object" || Array.isArray(q)) return null;
  const text = clean(q.text);
  const options = Array.isArray(q.options) ? q.options.map(clean) : [];
  const correct = Number(q.correct);
  if (!text || text.length > 2000 || options.length !== 4 || options.some(x => !x || x.length > 500)) return null;
  if (new Set(options.map(x => x.toLowerCase())).size !== 4 || !Number.isInteger(correct) || correct < 0 || correct > 3) return null;
  return { text, options, correct, explanation: clean(q.explanation).slice(0, 2000),
    difficulty: clean(q.difficulty).slice(0, 40), reference: "" };
}
export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST for question generation." });
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!key || !model) return json(503, { error: "AI generation is not configured. Set OPENAI_API_KEY and AI_MODEL as server-side environment variables." });
  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Request body must be valid JSON." }); }
  const subject = clean(input.subject), topic = clean(input.topic);
  const count = Number(input.count), difficulty = clean(input.difficulty), style = clean(input.style);
  const depth = clean(input.explanationDepth);
  if (!subject || subject.length > 100 || !topic || topic.length > 160) return json(400, { error: "Enter a subject (max 100 characters) and topic (max 160 characters)." });
  if (![5,10,15,20].includes(count)) return json(400, { error: "Question count must be 5, 10, 15, or 20." });
  if (!["Beginner","Intermediate","Advanced"].includes(difficulty)) return json(400, { error: "Invalid difficulty." });
  if (!["Direct multiple-choice","Clinical scenario","NCLEX-style practice"].includes(style)) return json(400, { error: "Invalid question style." });
  const prompt = `Create ${count} original nursing educational practice questions.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Style: ${style}
Explanation depth: ${depth}
Prefer clinical scenarios: ${Boolean(input.clinicalScenarios)}
Return only a JSON object of shape {"questions":[{"text":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","difficulty":"${difficulty}","reference":""}]}.
Rules: exactly four distinct answer options; correct is an integer 0-3; one best answer; no ambiguous wording; clinically sound explanation; avoid unsafe medication recommendations; do not invent references or citations (leave reference blank unless you can provide a verifiable source with exact title); flag uncertainty in the explanation where appropriate. These are educational questions and must be reviewed by a nursing educator.`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.4, response_format: { type: "json_object" },
        messages: [{ role: "system", content: "You generate structured nursing practice questions. Return valid JSON only." }, { role: "user", content: prompt }] })
    });
    if (!response.ok) {
      const status = response.status;
      if (status === 429) return json(429, { error: "AI provider rate limit or quota reached. Try later or check provider usage and billing." });
      if (status === 401 || status === 403) return json(502, { error: "AI provider authentication or permission failed. Check server-side environment variables." });
      return json(502, { error: `AI provider request failed (HTTP ${status}). Try again later.` });
    }
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return json(502, { error: "AI provider returned an unexpected response." });
    let parsed;
    try { parsed = JSON.parse(content); } catch { return json(502, { error: "AI provider did not return valid JSON." }); }
    if (!Array.isArray(parsed.questions)) return json(502, { error: "AI response did not include a questions array." });
    const questions = parsed.questions.map(validateQuestion).filter(Boolean);
    if (!questions.length) return json(502, { error: "No valid questions were returned. Try a different topic." });
    return json(200, { questions });
  } catch {
    return json(502, { error: "Could not contact the AI provider. Check network and provider status." });
  }
}