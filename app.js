(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const STORE = "pulseprep-shareable-exams-draft-v1";
  const SHARE_API =
    "https://pulseprep-shareable-exams-ai.ddangote701.workers.dev";

  let questions = [];
  let editing = -1;
  let studentExam = null;
  let answers = [];
  let current = 0;
  let startedAt = 0;
  let deadline = 0;
  let timer = null;
  let submitted = false;

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  function message(text, type = "ok") {
    const node = $("notice");
    node.textContent = text;
    node.className =
      "notice" +
      (type === "error" ? " error" : type === "warn" ? " warn" : "");
    node.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideMessage() {
    $("notice").hidden = true;
  }

  function readMeta() {
    return {
      title: $("examTitle").value,
      subject: $("examSubject").value,
      topic: $("examTopic").value,
      difficulty: $("examDifficulty").value,
      duration: Number($("examDuration").value),
      instructions: $("examInstructions").value,
      description: $("examDescription").value,
      questions
    };
  }

  function getExam() {
    return PulseExam.normalizeExam(readMeta());
  }

  function setMeta(exam) {
    $("examTitle").value = exam.title || "";
    $("examSubject").value = exam.subject || "";
    $("examTopic").value = exam.topic || "";
    $("examDifficulty").value = exam.difficulty || "Mixed";
    $("examDuration").value = exam.duration || 0;
    $("examInstructions").value = exam.instructions || "";
    $("examDescription").value = exam.description || "";

    questions = exam.questions.map(PulseExam.normalizeQuestion);
    editing = -1;
    renderQuestions();
  }

  function blankQuestion() {
    return {
      text: "",
      options: ["", "", "", ""],
      correct: 0,
      explanation: "",
      reference: "",
      difficulty: ""
    };
  }

  function renderQuestions() {
    const list = $("questionList");
    list.replaceChildren();

    $("questionCount").textContent = questions.length;
    $("emptyQuestions").hidden = questions.length > 0;

    questions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "question-card";

      const head = document.createElement("div");
      head.className = "question-head";

      const title = document.createElement("strong");
      title.textContent =
        "Question " +
        (index + 1) +
        (question.text
          ? " · " +
            question.text.slice(0, 65) +
            (question.text.length > 65 ? "…" : "")
          : " · Not completed");

      head.append(title);

      const actions = document.createElement("div");
      actions.className = "question-actions";

      [
        ["↑", () => move(index, -1), "Move up"],
        ["↓", () => move(index, 1), "Move down"],
        ["Edit", () => editQuestion(index), "Edit question"],
        ["Delete", () => deleteQuestion(index), "Delete question"]
      ].forEach(([label, action, aria]) => {
        const button = document.createElement("button");
        button.className =
          "mini-btn" + (label === "Delete" ? " danger" : "");
        button.textContent = label;
        button.setAttribute("aria-label", aria);

        button.disabled =
          (label === "↑" && index === 0) ||
          (label === "↓" && index === questions.length - 1);

        button.addEventListener("click", action);
        actions.append(button);
      });

      head.append(actions);
      card.append(head);

      if (editing === index) {
        const form = document.createElement("form");
        form.className = "question-form";

        form.innerHTML =
          '<label>Question text<textarea name="text" rows="3" required maxlength="2000"></textarea></label>' +
          '<div class="options-grid">' +
          [0, 1, 2, 3]
            .map(
              i =>
                '<label>Option ' +
                String.fromCharCode(65 + i) +
                '<input name="opt' +
                i +
                '" maxlength="500" required></label>'
            )
            .join("") +
          "</div>" +
          '<label>Correct answer<select name="correct">' +
          [0, 1, 2, 3]
            .map(
              i =>
                '<option value="' +
                i +
                '">Option ' +
                String.fromCharCode(65 + i) +
                "</option>"
            )
            .join("") +
          "</select></label>" +
          '<label>Explanation<textarea name="explanation" rows="3" maxlength="2000" placeholder="Explain why this is the best answer"></textarea></label>' +
          '<label>Educational reference (optional)<input name="reference" maxlength="300" placeholder="Verified source, guideline or textbook"></label>' +
          '<label>Question difficulty<select name="difficulty"><option value="">Use exam difficulty</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>' +
          '<div class="question-actions" style="margin-top:14px"><button class="btn btn-primary" type="submit">Save question</button><button class="btn btn-light" type="button" data-cancel>Cancel</button></div>';

        form.elements.text.value = question.text;

        question.options.forEach((value, i) => {
          form.elements["opt" + i].value = value;
        });

        form.elements.correct.value = question.correct;
        form.elements.explanation.value = question.explanation;
        form.elements.reference.value = question.reference;
        form.elements.difficulty.value = question.difficulty;

        form.addEventListener("submit", event => {
          event.preventDefault();

          const f = event.currentTarget;

          try {
            questions[index] = PulseExam.normalizeQuestion({
              text: f.elements.text.value,
              options: [0, 1, 2, 3].map(
                i => f.elements["opt" + i].value
              ),
              correct: Number(f.elements.correct.value),
              explanation: f.elements.explanation.value,
              reference: f.elements.reference.value,
              difficulty: f.elements.difficulty.value
            });

            editing = -1;
            renderQuestions();
            message("Question saved.");
          } catch (error) {
            message(error.message, "error");
          }
        });

        form.querySelector("[data-cancel]").addEventListener(
          "click",
          () => {
            editing = -1;
            renderQuestions();
          }
        );

        card.append(form);
      } else {
        const p = document.createElement("p");
        p.className = "muted";

        p.textContent =
          question.options.filter(Boolean).length +
          "/4 options filled" +
          (question.explanation
            ? " · Explanation added"
            : " · Explanation not added");

        card.append(p);
      }

      list.append(card);
    });
  }

  function addQuestion() {
    if (questions.length >= 200) {
      return message(
        "An exam can contain at most 200 questions.",
        "warn"
      );
    }

    questions.push(blankQuestion());
    editing = questions.length - 1;
    renderQuestions();

    $("questionList")
      .lastElementChild
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editQuestion(index) {
    editing = index;
    renderQuestions();
  }

  function deleteQuestion(index) {
    if (
      !confirm(
        "Delete question " +
          (index + 1) +
          "? This cannot be undone unless you saved a draft."
      )
    ) {
      return;
    }

    questions.splice(index, 1);

    if (editing === index) {
      editing = -1;
    } else if (editing > index) {
      editing--;
    }

    renderQuestions();
    message("Question deleted.");
  }

  function move(index, delta) {
    const next = index + delta;

    if (next < 0 || next >= questions.length) return;

    [questions[index], questions[next]] = [
      questions[next],
      questions[index]
    ];

    if (editing === index) {
      editing = next;
    } else if (editing === next) {
      editing = index;
    }

    renderQuestions();
  }

  function validate() {
    try {
      if (!questions.length) {
        throw new Error(
          "Add at least one question before previewing or sharing."
        );
      }

      return getExam();
    } catch (error) {
      message(error.message, "error");
      return null;
    }
  }

  function showView(which) {
    $("builderView").hidden = which !== "builder";
    $("previewView").hidden = which !== "preview";
    $("studentView").hidden = which !== "student";

    hideMessage();
    window.scrollTo(0, 0);
  }

  function preview() {
    const exam = validate();
    if (!exam) return;

    const box = $("previewContent");
    box.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = exam.title;
    box.append(heading);

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent =
      exam.subject +
      (exam.topic ? " · " + exam.topic : "") +
      " · " +
      exam.questions.length +
      " questions";

    box.append(meta);

    const instructions = document.createElement("p");
    instructions.textContent = exam.instructions;
    box.append(instructions);

    exam.questions.forEach((q, i) => {
      const item = document.createElement("div");
      item.className = "review-item";

      const h = document.createElement("h3");
      h.textContent = i + 1 + ". " + q.text;
      item.append(h);

      q.options.forEach((option, j) => {
        const p = document.createElement("p");

        p.textContent =
          String.fromCharCode(65 + j) +
          ". " +
          option +
          (j === q.correct ? " ✓ Correct answer" : "");

        if (j === q.correct) p.className = "good";

        item.append(p);
      });

      if (q.explanation) {
        const p = document.createElement("p");
        p.textContent = "Explanation: " + q.explanation;
        item.append(p);
      }

      if (q.reference) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Reference: " + q.reference;
        item.append(p);
      }

      box.append(item);
    });

    showView("preview");
  }

  function download(name, data, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = name;

    document.body.append(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportJSON() {
    const exam = validate();

    if (exam) {
      download(
        "pulseprep-exam.json",
        JSON.stringify(exam, null, 2),
        "application/json"
      );
    }
  }

  function importJSON(file) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const exam = PulseExam.normalizeExam(
          JSON.parse(reader.result)
        );

        if (
          !confirm(
            "Replace the current builder content with " +
              exam.questions.length +
              " imported question(s)? Save your current draft first if needed."
          )
        ) {
          return;
        }

        setMeta(exam);
        showView("builder");
        message("Exam JSON imported and validated.");
      } catch (error) {
        message("Import failed: " + error.message, "error");
      }
    };

    reader.onerror = () => {
      message(
        "The selected file could not be read.",
        "error"
      );
    };

    reader.readAsText(file);
  }

  /*
   * CREATE A SHORT SHARE LINK
   *
   * The complete exam is sent to the Cloudflare Worker.
   * The Worker stores the exam and returns a short ID.
   * The URL contains only that ID, not all the questions.
   */
  async function share() {
    const exam = validate();
    if (!exam) return;

    const button = $("shareBtn");
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Creating short link…";

    try {
      const response = await fetch(SHARE_API + "/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(exam)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The share service returned HTTP " +
              response.status +
              "."
        );
      }

      if (!data.id || !/^[a-f0-9]{12}$/.test(data.id)) {
        throw new Error(
          "The share service returned an invalid share code."
        );
      }

      const url =
        location.href.split("#")[0] + "#share=" + data.id;

      $("shareUrl").value = url;
      $("shareArea").hidden = false;

      $("shareHint").textContent =
        "Short practice link. The exam is intended to expire after 30 days, depending on the share service configuration. Anyone with the link can open it. Answers and explanations are included for practice and may be inspected. Student results are not sent to a teacher.";

      message(
        "Short link created. Open it in a private tab to test it before sharing."
      );
    } catch (error) {
      message(
        "Could not create a short link: " +
          error.message +
          " You can still download the standalone HTML or export the exam JSON.",
        "error"
      );
    } finally {
      button.disabled = false;
      button.textContent = originalText || "Create share link";
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        $("shareUrl").value
      );

      message("Link copied to clipboard.");
    } catch {
      $("shareUrl").focus();
      $("shareUrl").select();

      message(
        "Automatic copying was blocked. The link is selected; use your device’s Copy command.",
        "warn"
      );
    }
  }

  function standaloneHTML(exam) {
    const payload = JSON.stringify(exam)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");

    const title = esc(exam.title);

    return (
      '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" +
      title +
      "</title><style>" +
      "body{font:16px/1.6 system-ui,sans-serif;max-width:800px;margin:auto;padding:20px;color:#1b2c42}" +
      "h1{color:#102b50}.card{border:1px solid #dce4ef;border-radius:14px;padding:18px;margin:16px 0}" +
      ".choice{display:block;padding:12px;border:1px solid #ddd;border-radius:9px;margin:8px 0}" +
      ".btn{background:#1768c4;color:white;border:0;border-radius:9px;padding:12px 17px;font-weight:bold}" +
      "button{cursor:pointer}.good{color:#16834a}.bad{color:#c0393d}.muted{color:#64748b}" +
      ".score{background:#eaf3ff;padding:15px;border-radius:12px}" +
      "@media print{button{display:none}}" +
      '</style></head><body><h1>' +
      title +
      "</h1><p>" +
      esc(exam.subject) +
      (exam.topic ? " · " + esc(exam.topic) : "") +
      " · " +
      exam.questions.length +
      " questions</p><p>" +
      esc(exam.instructions) +
      '</p><p class="muted">Standalone practice exam. Answers are included in this file.</p>' +
      '<div id="app"></div><script>const EXAM=' +
      payload +
      ';const root=document.getElementById("app");let answers=Array(EXAM.questions.length).fill(null),idx=0,done=false;function el(t,c,txt){const n=document.createElement(t);if(c)n.className=c;if(txt!==undefined)n.textContent=txt;return n}function render(){root.replaceChildren();if(done){let correct=0,answered=0;EXAM.questions.forEach((q,i)=>{if(Number.isInteger(answers[i])){answered++;if(answers[i]===q.correct)correct++}});let score=el("div","score");score.append(el("h2","","Score: "+correct+"/"+EXAM.questions.length+" ("+Math.round(correct/EXAM.questions.length*100)+"%)"));score.append(el("p","","Answered: "+answered+" · Incorrect: "+(answered-correct)+" · Unanswered: "+(EXAM.questions.length-answered)));root.append(score);EXAM.questions.forEach((q,i)=>{let d=el("div","card");d.append(el("h3","",(i+1)+". "+q.text));q.options.forEach((o,j)=>d.append(el("p",j===q.correct?"good":answers[i]===j?"bad":"",String.fromCharCode(65+j)+". "+o+(j===q.correct?" — Correct answer":answers[i]===j?" — Your answer":""))));if(q.explanation)d.append(el("p","","Explanation: "+q.explanation));if(q.reference)d.append(el("p","muted","Reference: "+q.reference));root.append(d)});let b=el("button","btn","Restart practice");b.onclick=()=>{answers=Array(EXAM.questions.length).fill(null);idx=0;done=false;render()};root.append(b);let p=el("button","btn","Print / Save PDF");p.style.marginLeft="8px";p.onclick=()=>print();root.append(p);return}const q=EXAM.questions[idx],d=el("div","card");d.append(el("h2","","Question "+(idx+1)+" of "+EXAM.questions.length));d.append(el("div","","Progress: "+Math.round((idx+1)/EXAM.questions.length*100)+"%"));d.append(el("h3","",q.text));q.options.forEach((o,j)=>{let label=el("label","choice"),input=document.createElement("input");input.type="radio";input.name="answer";input.checked=answers[idx]===j;input.onchange=()=>answers[idx]=j;label.append(input,document.createTextNode(" "+String.fromCharCode(65+j)+". "+o));d.append(label)});let nav=el("p","");let prev=el("button","btn","Previous");prev.disabled=idx===0;prev.onclick=()=>{idx--;render()};nav.append(prev);let next=el("button","btn",idx===EXAM.questions.length-1?"Submit exam":"Next");next.style.marginLeft="8px";next.onclick=()=>{if(idx===EXAM.questions.length-1){if(confirm("Submit your answers now?")){done=true;render()}}else{idx++;render()}};nav.append(next);d.append(nav);root.append(d);let jumps=el("div","card");jumps.append(el("strong","","Jump to question"));let row=el("p","");EXAM.questions.forEach((_,i)=>{let b=el("button","btn",String(i+1));b.style.margin="4px";b.style.background=answers[i]===null?"#eaf3ff":"#dff5e7";b.style.color="#102b50";b.onclick=()=>{idx=i;render()};row.append(b)});jumps.append(row);root.append(jumps)}render();<\\/script></body></html>'
    );
  }

  function downloadStandalone() {
    const exam = validate();

    if (exam) {
      download(
        "pulseprep-practice-exam.html",
        standaloneHTML(exam),
        "text/html"
      );
    }
  }

  async function generateAI() {
    const status = $("aiStatus");
    const subject = $("aiSubject").value.trim();
    const topic = $("aiTopic").value.trim();

    if (!subject || !topic) {
      status.textContent =
        "Enter both a subject and a topic first.";
      return;
    }

    status.textContent =
      "Contacting the configured server-side AI endpoint…";

    const request = {
      subject,
      topic,
      count: Number($("aiCount").value),
      difficulty: $("aiDifficulty").value,
      style: $("aiStyle").value,
      explanationDepth: $("aiDepth").value,
      clinicalScenarios: $("aiClinical").checked
    };

    try {
      const response = await fetch(SHARE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            "AI endpoint returned HTTP " +
              response.status +
              "."
        );
      }

      if (!Array.isArray(data.questions) || !data.questions.length) {
        throw new Error(
          "The AI endpoint returned no valid questions."
        );
      }

      const validated = data.questions.map(
        PulseExam.normalizeQuestion
      );

      if (
        !confirm(
          "AI generated " +
            validated.length +
            " question(s). Review them before use. Add them to this draft?"
        )
      ) {
        status.textContent = "Generated questions discarded.";
        return;
      }

      const old = questions.length;
      questions.push(...validated);
      renderQuestions();

      status.textContent =
        validated.length +
        " questions added for your review. Edit or delete them before sharing.";

      message(
        questions.length -
          old +
          " AI-generated questions added. Review clinical accuracy and references before use.",
        "warn"
      );
    } catch (error) {
      status.textContent =
        "AI generation unavailable: " +
        error.message +
        " Manual exam building remains available.";
    }
  }

  function saveSession() {
    try {
      sessionStorage.setItem(
        "pulseprep-student-session",
        JSON.stringify({
          key: location.hash.slice(0, 200),
          answers,
          current,
          startedAt,
          deadline,
          submitted
        })
      );
    } catch {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem("pulseprep-student-session");
    } catch {}
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(
        "pulseprep-student-session"
      );

      if (!raw) return false;

      const data = JSON.parse(raw);

      if (
        data.key !== location.hash.slice(0, 200) ||
        !studentExam
      ) {
        return false;
      }

      if (
        !Array.isArray(data.answers) ||
        data.answers.length !== studentExam.questions.length
      ) {
        return false;
      }

      answers = data.answers.map(a =>
        Number.isInteger(a) && a >= 0 && a < 4 ? a : null
      );

      current = Number.isInteger(data.current)
        ? Math.min(
            Math.max(data.current, 0),
            studentExam.questions.length - 1
          )
        : 0;

      startedAt = Number(data.startedAt) || 0;
      deadline = Number(data.deadline) || 0;
      submitted = Boolean(data.submitted);

      if (deadline && Date.now() >= deadline) {
        submitted = true;
      }

      return startedAt > 0;
    } catch {
      return false;
    }
  }

  function timerText() {
    const seconds = Math.max(
      0,
      Math.ceil((deadline - Date.now()) / 1000)
    );

    return (
      Math.floor(seconds / 60) +
      ":" +
      String(seconds % 60).padStart(2, "0")
    );
  }

  function startTimer() {
    clearInterval(timer);

    if (!deadline || submitted) return;

    timer = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(timer);
        submitExam(true);
        return;
      }

      const node = $("timer");

      if (node) node.textContent = timerText();
    }, 1000);
  }

  function submitExam(auto = false) {
    if (submitted) return;

    submitted = true;
    clearInterval(timer);
    saveSession();
    renderStudent();

    if (auto) {
      message(
        "Time expired. Your answers were submitted automatically.",
        "warn"
      );
    }
  }

  function renderStudent() {
    const root = $("studentContent");
    root.replaceChildren();

    if (!studentExam) return;

    const exam = studentExam;

    if (!startedAt) {
      const hero = document.createElement("div");
      hero.className = "student-hero";

      const h = document.createElement("h2");
      h.textContent = exam.title;
      hero.append(h);

      const p = document.createElement("p");
      p.textContent =
        exam.subject + (exam.topic ? " · " + exam.topic : "");
      hero.append(p);

      const meta = document.createElement("div");
      meta.className = "student-meta";

      [
        exam.questions.length + " questions",
        exam.duration
          ? exam.duration + " minute time limit"
          : "No time limit",
        exam.difficulty
      ].forEach(value => {
        const tag = document.createElement("span");
        tag.className = "pill";
        tag.textContent = value;
        meta.append(tag);
      });

      hero.append(meta);

      const ins = document.createElement("p");
      ins.textContent = exam.instructions;
      hero.append(ins);

      const warning = document.createElement("p");
      warning.textContent =
        "Practice exam only. Answers are stored in this browser session; results are not sent to a teacher.";
      hero.append(warning);

      const start = document.createElement("button");
      start.className = "btn btn-primary";
      start.textContent = "Start examination";

      start.addEventListener("click", () => {
        startedAt = Date.now();
        deadline = exam.duration
          ? startedAt + exam.duration * 60000
          : 0;

        saveSession();
        renderStudent();

        if (deadline) startTimer();
      });

      hero.append(start);
      root.append(hero);
      return;
    }

    if (submitted) {
      renderResults(root);
      return;
    }

    const q = exam.questions[current];
    const panel = document.createElement("section");
    panel.className = "panel";

    const top = document.createElement("div");
    top.className = "panel-title";

    const heading = document.createElement("h3");
    heading.textContent =
      "Question " + (current + 1) + " of " + exam.questions.length;

    top.append(heading);

    if (deadline) {
      const clock = document.createElement("strong");
      clock.id = "timer";
      clock.textContent = timerText();
      clock.setAttribute("aria-label", "Time remaining");
      top.append(clock);
    }

    panel.append(top);

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width =
      ((current + 1) / exam.questions.length) * 100 + "%";

    track.append(fill);
    panel.append(track);

    const questionText = document.createElement("div");
    questionText.className = "exam-question";
    questionText.textContent = q.text;
    panel.append(questionText);

    q.options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "choice";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "studentAnswer";
      input.value = index;
      input.checked = answers[current] === index;
      input.setAttribute(
        "aria-label",
        "Option " + String.fromCharCode(65 + index)
      );

      input.addEventListener("change", () => {
        answers[current] = index;
        saveSession();
        renderStudent();
      });

      const span = document.createElement("span");
      span.textContent =
        String.fromCharCode(65 + index) + ". " + option;

      label.append(input, span);
      panel.append(label);
    });

    const jumps = document.createElement("div");
    jumps.className = "question-jump";

    exam.questions.forEach((_, index) => {
      const button = document.createElement("button");

      button.className =
        "jump-btn" +
        (answers[index] !== null ? " answered" : "") +
        (index === current ? " current" : "");

      button.textContent = index + 1;
      button.setAttribute(
        "aria-label",
        "Go to question " +
          (index + 1) +
          (answers[index] === null ? ", unanswered" : ", answered")
      );

      button.addEventListener("click", () => {
        current = index;
        saveSession();
        renderStudent();
      });

      jumps.append(button);
    });

    panel.append(jumps);

    const nav = document.createElement("div");
    nav.className = "exam-nav";

    const prev = document.createElement("button");
    prev.className = "btn btn-light";
    prev.textContent = "← Previous";
    prev.disabled = current === 0;

    prev.addEventListener("click", () => {
      current--;
      saveSession();
      renderStudent();
    });

    const next = document.createElement("button");
    next.className = "btn btn-primary";
    next.textContent =
      current === exam.questions.length - 1
        ? "Submit exam"
        : "Next →";

    next.addEventListener("click", () => {
      if (current === exam.questions.length - 1) {
        const unanswered = answers.filter(
          a => a === null
        ).length;

        if (
          !confirm(
            "Submit this exam now? " +
              unanswered +
              " question(s) are unanswered."
          )
        ) {
          return;
        }

        submitExam(false);
      } else {
        current++;
        saveSession();
        renderStudent();
      }
    });

    nav.append(prev, next);
    panel.append(nav);
    root.append(panel);
  }

  function renderResults(root) {
    const exam = studentExam;
    const score = PulseExam.mark(exam, answers);

    const box = document.createElement("div");
    box.className = "panel";

    const scoreBox = document.createElement("div");
    scoreBox.className = "score-box";

    const title = document.createElement("h2");
    title.textContent = "Your practice results";
    scoreBox.append(title);

    const number = document.createElement("div");
    number.className = "score-number";
    number.textContent = score.percentage + "%";
    scoreBox.append(number);

    const summary = document.createElement("p");
    summary.textContent =
      score.correct +
      " correct out of " +
      score.total +
      " · " +
      score.grade;
    scoreBox.append(summary);

    const stats = document.createElement("p");
    stats.textContent =
      "Answered: " +
      score.answered +
      " · Correct: " +
      score.correct +
      " · Incorrect: " +
      score.incorrect +
      " · Unanswered: " +
      score.unanswered;

    scoreBox.append(stats);

    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
      "Practice score only. This result is not centrally stored or officially verified.";

    scoreBox.append(note);
    box.append(scoreBox);

    const reviewTitle = document.createElement("h2");
    reviewTitle.textContent = "Answer review";
    box.append(reviewTitle);

    exam.questions.forEach((q, index) => {
      const isEmpty = answers[index] === null;
      const isCorrect = answers[index] === q.correct;

      const item = document.createElement("article");
      item.className =
        "review-item " +
        (isEmpty
          ? "unanswered"
          : isCorrect
            ? "correct"
            : "incorrect");

      const h = document.createElement("h3");
      h.textContent = index + 1 + ". " + q.text;
      item.append(h);

      const feedback = document.createElement("p");
      feedback.className =
        "feedback " +
        (isEmpty ? "" : isCorrect ? "good" : "bad");

      feedback.textContent = isEmpty
        ? "Unanswered"
        : isCorrect
          ? "Correct"
          : "Incorrect";

      item.append(feedback);

      const yourAnswer = document.createElement("p");
      yourAnswer.textContent =
        "Your answer: " +
        (isEmpty
          ? "No answer"
          : String.fromCharCode(65 + answers[index]) +
            ". " +
            q.options[answers[index]]);

      item.append(yourAnswer);

      const correctAnswer = document.createElement("p");
      correctAnswer.textContent =
        "Correct answer: " +
        String.fromCharCode(65 + q.correct) +
        ". " +
        q.options[q.correct];

      item.append(correctAnswer);

      if (q.explanation) {
        const explanation = document.createElement("p");
        explanation.textContent = "Explanation: " + q.explanation;
        item.append(explanation);
      }

      if (q.reference) {
        const reference = document.createElement("p");
        reference.className = "muted";
        reference.textContent = "Reference: " + q.reference;
        item.append(reference);
      }

      box.append(item);
    });

    const actions = document.createElement("div");
    actions.className = "exam-nav no-print";

    const restart = document.createElement("button");
    restart.className = "btn btn-primary";
    restart.textContent = "Restart practice";

    restart.addEventListener("click", () => {
      answers = Array(exam.questions.length).fill(null);
      current = 0;
      startedAt = 0;
      deadline = 0;
      submitted = false;

      clearSession();
      renderStudent();
    });

    const printButton = document.createElement("button");
    printButton.className = "btn btn-light";
    printButton.textContent = "Print / Save PDF";
    printButton.addEventListener("click", () => window.print());

    actions.append(restart, printButton);
    box.append(actions);
    root.append(box);
  }

  /*
   * LOAD SHORT SHARED LINKS.
   * Legacy #exam= links are also supported.
   */
  function parseSharedExam() {
    if (location.hash.startsWith("#share=")) {
      const id = location.hash.slice(7);

      showView("student");

      const root = $("studentContent");
      root.replaceChildren();

      const panel = document.createElement("div");
      panel.className = "panel";

      const heading = document.createElement("h2");
      heading.textContent = "Loading shared exam…";

      panel.append(heading);
      root.append(panel);

      (async () => {
        try {
          if (!/^[a-f0-9]{12}$/.test(id)) {
            throw new Error("This share code is invalid.");
          }

          const response = await fetch(
            SHARE_API + "/share/" + id
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Could not load exam (HTTP " +
                  response.status +
                  ")."
            );
          }

          if (!data.exam) {
            throw new Error(
              "The share service returned no exam data."
            );
          }

          studentExam = PulseExam.normalizeExam(data.exam);

          if (
            !studentExam.questions ||
            !studentExam.questions.length
          ) {
            throw new Error(
              "This shared exam does not contain any questions."
            );
          }

          answers = Array(
            studentExam.questions.length
          ).fill(null);

          current = 0;
          startedAt = 0;
          deadline = 0;
          submitted = false;

          restoreSession();
          renderStudent();

          if (deadline && !submitted) {
            startTimer();
          }
        } catch (error) {
          root.replaceChildren();

          const box = document.createElement("div");
          box.className = "panel";

          const h = document.createElement("h2");
          h.textContent = "Could not load this exam";

          const p = document.createElement("p");
          p.textContent =
            error.message +
            " The link may have expired, or the share service may be unavailable.";

          box.append(h, p);
          root.append(box);
        }
      })();

      return true;
    }

    // Continue supporting older links containing the full exam.
    if (!location.hash.startsWith("#exam=")) {
      return false;
    }

    try {
      const encoded = location.hash.slice(6);

      if (encoded.length > 700000) {
        throw new Error("The link is too large.");
      }

      const data = decodeURIComponent(
        escape(atob(encoded))
      );

      studentExam = PulseExam.normalizeExam(
        JSON.parse(data)
      );

      answers = Array(
        studentExam.questions.length
      ).fill(null);

      restoreSession();

      showView("student");
      renderStudent();

      if (deadline && !submitted) {
        startTimer();
      }

      return true;
    } catch {
      showView("student");

      $("studentContent").replaceChildren();

      const panel = document.createElement("div");
      panel.className = "panel";

      const h = document.createElement("h2");
      h.textContent = "This exam link is invalid";

      const p = document.createElement("p");
      p.textContent =
        "The exam data is missing, damaged, too large, or not supported. Ask the creator for a new link.";

      panel.append(h, p);
      $("studentContent").append(panel);

      return true;
    }
  }

  function init() {
    renderQuestions();

    $("addQuestionBtn").onclick = addQuestion;
    $("emptyAddBtn").onclick = addQuestion;

    $("newExamBtn").onclick = () => {
      if (
        !confirm(
          "Start a new exam? Save your current draft first if you want to keep it."
        )
      ) {
        return;
      }

      $("examTitle").value = "New Nursing Practice Exam";
      $("examSubject").value = "";
      $("examTopic").value = "";
      $("examDifficulty").value = "Mixed";
      $("examDuration").value = "0";
      $("examInstructions").value =
        "Choose the single best answer for each question.";
      $("examDescription").value = "";

      questions = [];
      editing = -1;

      renderQuestions();
      $("shareArea").hidden = true;

      message("New exam started.");
    };

    $("saveDraftBtn").onclick = () => {
      try {
        const raw = readMeta();

        if (questions.length) {
          raw.questions = questions.map(
            PulseExam.normalizeQuestion
          );
        }

        localStorage.setItem(STORE, JSON.stringify(raw));

        message("Draft saved on this device and browser.");
      } catch (error) {
        message(
          "Draft could not be saved: " + error.message,
          "error"
        );
      }
    };

    $("loadDraftBtn").onclick = () => {
      try {
        const raw = localStorage.getItem(STORE);

        if (!raw) {
          message(
            "No saved draft was found in this browser.",
            "warn"
          );
          return;
        }

        const exam = PulseExam.normalizeExam(
          JSON.parse(raw)
        );

        if (
          !confirm(
            "Load saved draft and replace the current builder content?"
          )
        ) {
          return;
        }

        setMeta(exam);
        message("Saved draft loaded.");
      } catch (error) {
        message(
          "Saved draft could not be loaded: " +
            error.message,
          "error"
        );
      }
    };

    $("clearDraftBtn").onclick = () => {
      if (
        !confirm(
          "Permanently clear the saved draft from this browser?"
        )
      ) {
        return;
      }

      localStorage.removeItem(STORE);
      message("Saved draft cleared.");
    };

    $("previewBtn").onclick = preview;

    $("backToBuilderBtn").onclick = () => {
      showView("builder");
    };

    $("shareBtn").onclick = share;
    $("copyLinkBtn").onclick = copyLink;
    $("exportBtn").onclick = exportJSON;
    $("downloadBtn").onclick = downloadStandalone;

    $("importFile").onchange = event => {
      const file = event.target.files[0];

      if (file) {
        importJSON(file);
      }

      event.target.value = "";
    };

    $("generateAiBtn").onclick = generateAI;

    if (!parseSharedExam()) {
      showView("builder");
    }
  }

  init();
})();
