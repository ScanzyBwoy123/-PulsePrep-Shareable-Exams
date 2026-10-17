/* Shared exam validation and marking helpers. Imported text is data, never executable code. */
(function () {
  "use strict";
  const clean = value => typeof value === "string" ? value.trim() : "";
  function normalizeQuestion(q) {
    if (!q || typeof q !== "object" || Array.isArray(q)) throw new Error("A question must be an object.");
    const text = clean(q.text ?? q.question ?? q.question_text);
    const options = Array.isArray(q.options) ? q.options.map(clean) :
      [q.optionA ?? q.option_a, q.optionB ?? q.option_b, q.optionC ?? q.option_c, q.optionD ?? q.option_d].map(clean);
    let correct = q.correct ?? q.correctIndex ?? q.correct_answer;
    if (typeof correct === "string" && /^[A-D]$/i.test(correct.trim())) correct = correct.trim().toUpperCase().charCodeAt(0) - 65;
    correct = Number(correct);
    if (!text) throw new Error("Every question needs question text.");
    if (options.length !== 4 || options.some(option => !option)) throw new Error("Every question must have four non-empty options.");
    if (new Set(options.map(option => option.toLocaleLowerCase())).size !== 4) throw new Error("Each question must have four distinct options.");
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) throw new Error("Select a valid correct answer (A–D).");
    return { text, options, correct, explanation: clean(q.explanation), reference: clean(q.reference), difficulty: clean(q.difficulty) };
  }
  function normalizeExam(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Exam data must be a JSON object.");
    if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 200) throw new Error("An exam must contain between 1 and 200 questions.");
    const duration = Number(raw.duration || 0);
    if (!Number.isInteger(duration) || duration < 0 || duration > 300) throw new Error("Time limit must be between 0 and 300 minutes.");
    const exam = {
      title: clean(raw.title) || "Nursing Practice Exam",
      subject: clean(raw.subject) || "Nursing",
      topic: clean(raw.topic),
      difficulty: clean(raw.difficulty) || "Mixed",
      instructions: clean(raw.instructions) || "Choose the single best answer.",
      description: clean(raw.description),
      duration,
      questions: raw.questions.map(normalizeQuestion),
      version: 1
    };
    if (exam.title.length > 120 || exam.subject.length > 100 || exam.topic.length > 120 ||
        exam.instructions.length > 1000 || exam.description.length > 500) throw new Error("Some exam details exceed the allowed length.");
    return exam;
  }
  function mark(exam, answers) {
    let correct = 0, answered = 0;
    exam.questions.forEach((question, index) => {
      const answer = answers[index];
      if (Number.isInteger(answer) && answer >= 0 && answer < 4) {
        answered++;
        if (answer === question.correct) correct++;
      }
    });
    const total = exam.questions.length;
    const incorrect = answered - correct;
    const unanswered = total - answered;
    const percentage = Math.round((correct / total) * 1000) / 10;
    return { total, answered, correct, incorrect, unanswered, percentage,
      grade: percentage >= 80 ? "Strong performance" : percentage >= 60 ? "Developing knowledge" : "Keep practising" };
  }
  window.PulseExam = { normalizeQuestion, normalizeExam, mark };
})();