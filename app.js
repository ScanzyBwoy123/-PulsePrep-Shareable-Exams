(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORE = "pulseprep-shareable-exams-draft-v1";
  let questions = [], editing = -1, studentExam = null, answers = [], current = 0;
  let studentName = "";
let resultSyncMessage = "Result has not been sent yet.";
  let startedAt = 0, deadline = 0, timer = null, submitted = false;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  function message(text, type = "ok") {
    const node = $("notice"); node.textContent = text;
    node.className = "notice" + (type === "error" ? " error" : type === "warn" ? " warn" : "");
    node.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function hideMessage() { $("notice").hidden = true; }
  function readMeta() {
    return { title:$("examTitle").value, subject:$("examSubject").value, topic:$("examTopic").value,
      difficulty:$("examDifficulty").value, duration:Number($("examDuration").value),
      instructions:$("examInstructions").value, description:$("examDescription").value, questions };
  }
  function getExam() { return PulseExam.normalizeExam(readMeta()); }
  function setMeta(exam) {
    $("examTitle").value = exam.title || ""; $("examSubject").value = exam.subject || "";
    $("examTopic").value = exam.topic || ""; $("examDifficulty").value = exam.difficulty || "Mixed";
    $("examDuration").value = exam.duration || 0; $("examInstructions").value = exam.instructions || "";
    $("examDescription").value = exam.description || ""; questions = exam.questions.map(PulseExam.normalizeQuestion);
    editing = -1; renderQuestions();
  }
  function blankQuestion() { return { text:"", options:["","","",""], correct:0, explanation:"", reference:"", difficulty:"" }; }
  function renderQuestions() {
    const list = $("questionList"); list.replaceChildren();
    $("questionCount").textContent = questions.length; $("emptyQuestions").hidden = questions.length > 0;
    questions.forEach((question, index) => {
      const card = document.createElement("article"); card.className = "question-card";
      const head = document.createElement("div"); head.className = "question-head";
      const title = document.createElement("strong");
      title.textContent = "Question " + (index + 1) + (question.text ? " · " + question.text.slice(0, 65) + (question.text.length > 65 ? "…" : "") : " · Not completed");
      head.append(title); const actions = document.createElement("div"); actions.className = "question-actions";
      [["↑",()=>move(index,-1),"Move up"],["↓",()=>move(index,1),"Move down"],["Edit",()=>editQuestion(index),"Edit question"],["Delete",()=>deleteQuestion(index),"Delete question"]].forEach(([label, action, aria]) => {
        const button = document.createElement("button"); button.className = "mini-btn" + (label === "Delete" ? " danger" : "");
        button.textContent = label; button.setAttribute("aria-label", aria);
        button.disabled = (label === "↑" && index === 0) || (label === "↓" && index === questions.length - 1);
        button.addEventListener("click", action); actions.append(button);
      });
      head.append(actions); card.append(head);
      if (editing === index) {
        const form = document.createElement("form"); form.className = "question-form";
        form.innerHTML = '<label>Question text<textarea name="text" rows="3" required maxlength="2000"></textarea></label>' +
          '<div class="options-grid">' + [0,1,2,3].map(i=>'<label>Option '+String.fromCharCode(65+i)+'<input name="opt'+i+'" maxlength="500" required></label>').join("") + '</div>' +
          '<label>Correct answer<select name="correct">'+[0,1,2,3].map(i=>'<option value="'+i+'">Option '+String.fromCharCode(65+i)+'</option>').join("")+'</select></label>' +
          '<label>Explanation<textarea name="explanation" rows="3" maxlength="2000" placeholder="Explain why this is the best answer"></textarea></label>' +
          '<label>Educational reference (optional)<input name="reference" maxlength="300" placeholder="Verified source, guideline or textbook"></label>' +
          '<label>Question difficulty<select name="difficulty"><option value="">Use exam difficulty</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>' +
          '<div class="question-actions" style="margin-top:14px"><button class="btn btn-primary" type="submit">Save question</button><button class="btn btn-light" type="button" data-cancel>Cancel</button></div>';
        form.elements.text.value = question.text; question.options.forEach((value,i)=>form.elements["opt"+i].value=value);
        form.elements.correct.value = question.correct; form.elements.explanation.value = question.explanation;
        form.elements.reference.value = question.reference; form.elements.difficulty.value = question.difficulty;
        form.addEventListener("submit", event => {
          event.preventDefault(); const f = event.currentTarget;
          try {
            questions[index] = PulseExam.normalizeQuestion({text:f.elements.text.value,
              options:[0,1,2,3].map(i=>f.elements["opt"+i].value), correct:Number(f.elements.correct.value),
              explanation:f.elements.explanation.value, reference:f.elements.reference.value, difficulty:f.elements.difficulty.value});
            editing = -1; renderQuestions(); message("Question saved.");
          } catch (error) { message(error.message, "error"); }
        });
        form.querySelector("[data-cancel]").addEventListener("click",()=>{editing=-1;renderQuestions();});
        card.append(form);
      } else {
        const p = document.createElement("p"); p.className = "muted";
        p.textContent = question.options.filter(Boolean).length + "/4 options filled" + (question.explanation ? " · Explanation added" : " · Explanation not added");
        card.append(p);
      }
      list.append(card);
    });
  }
  function addQuestion() {
    if (questions.length >= 200) return message("An exam can contain at most 200 questions.", "warn");
    questions.push(blankQuestion()); editing = questions.length - 1; renderQuestions();
    $("questionList").lastElementChild?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function editQuestion(index) { editing = index; renderQuestions(); }
  function deleteQuestion(index) {
    if (!confirm("Delete question " + (index + 1) + "? This cannot be undone unless you saved a draft.")) return;
    questions.splice(index,1); if(editing===index)editing=-1;else if(editing>index)editing--;
    renderQuestions(); message("Question deleted.");
  }
  function move(index, delta) {
    const next = index + delta; if(next<0||next>=questions.length)return;
    [questions[index],questions[next]]=[questions[next],questions[index]];
    if(editing===index)editing=next;else if(editing===next)editing=index;renderQuestions();
  }
  function validate() {
    try { if(!questions.length)throw new Error("Add at least one question before previewing or sharing."); return getExam(); }
    catch(error){message(error.message,"error");return null;}
  }
  function showView(which) {
    $("builderView").hidden=which!=="builder";$("previewView").hidden=which!=="preview";$("studentView").hidden=which!=="student";
    hideMessage();window.scrollTo(0,0);
  }
  function preview() {
    const exam=validate();if(!exam)return;const box=$("previewContent");box.replaceChildren();
    const heading=document.createElement("h2");heading.textContent=exam.title;box.append(heading);
    const meta=document.createElement("p");meta.className="muted";meta.textContent=exam.subject+(exam.topic?" · "+exam.topic:"")+" · "+exam.questions.length+" questions";box.append(meta);
    const instructions=document.createElement("p");instructions.textContent=exam.instructions;box.append(instructions);
    exam.questions.forEach((q,i)=>{const item=document.createElement("div");item.className="review-item";
      const h=document.createElement("h3");h.textContent=(i+1)+". "+q.text;item.append(h);
      q.options.forEach((option,j)=>{const p=document.createElement("p");p.textContent=String.fromCharCode(65+j)+". "+option+(j===q.correct?" ✓ Correct answer":"");if(j===q.correct)p.className="good";item.append(p);});
      if(q.explanation){const p=document.createElement("p");p.textContent="Explanation: "+q.explanation;item.append(p);}
      if(q.reference){const p=document.createElement("p");p.className="muted";p.textContent="Reference: "+q.reference;item.append(p);}box.append(item);
    });showView("preview");
  }
  function download(name,data,type) {
    const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function exportJSON(){const exam=validate();if(exam)download("pulseprep-exam.json",JSON.stringify(exam,null,2),"application/json");}
  function importJSON(file) {
    const reader=new FileReader();reader.onload=()=>{
      try {const exam=PulseExam.normalizeExam(JSON.parse(reader.result));
        if(!confirm("Replace the current builder content with "+exam.questions.length+" imported question(s)? Save your current draft first if needed."))return;
        setMeta(exam);showView("builder");message("Exam JSON imported and validated.");
      } catch(error){message("Import failed: "+error.message,"error");}
    };reader.onerror=()=>message("The selected file could not be read.","error");reader.readAsText(file);
  }
  async function share() {
  const exam = validate();
  if (!exam) return;
  const button = $("shareBtn");
  button.disabled = true;
  button.textContent = "Creating link...";
  try {
    const response = await fetch(
      "https://pulseprep-shareable-exams-ai.ddangote701.workers.dev/share",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exam)
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) {
      throw new Error(data.error || "Could not create the sharing link.");
    }
    const url = location.href.split("#")[0] +
      "#share=" + encodeURIComponent(data.id);
    $("shareUrl").value = url;
    $("shareArea").hidden = false;
    $("shareHint").textContent =
      "Your exam link is ready. Anyone with the link can open this exam. " +
      "The link expires after 30 days.";
    message("Short exam-sharing link created successfully.");
  } catch (error) {
    message("Could not create the link: " + error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Create share link";
  }
}
  function saveSession() {
    try {sessionStorage.setItem("pulseprep-student-session",JSON.stringify({key:location.hash.slice(0,200),answers,current,startedAt,deadline,submitted}));} catch {}
  }
  function clearSession() {try{sessionStorage.removeItem("pulseprep-student-session");}catch{}}
  function restoreSession() {
    try {
      const raw=sessionStorage.getItem("pulseprep-student-session");if(!raw)return false;
      const data=JSON.parse(raw);if(data.key!==location.hash.slice(0,200)||!studentExam)return false;
      if(!Array.isArray(data.answers)||data.answers.length!==studentExam.questions.length)return false;
      answers=data.answers.map(a=>Number.isInteger(a)&&a>=0&&a<4?a:null);
      current=Number.isInteger(data.current)?Math.min(Math.max(data.current,0),studentExam.questions.length-1):0;
      startedAt=Number(data.startedAt)||0;deadline=Number(data.deadline)||0;submitted=Boolean(data.submitted);
      if(deadline&&Date.now()>=deadline)submitted=true;
      return startedAt>0;
    } catch {return false;}
  }
  function timerText(){const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");}
  function startTimer(){clearInterval(timer);if(!deadline||submitted)return;timer=setInterval(()=>{if(Date.now()>=deadline){clearInterval(timer);submitExam(true);return;}const node=$("timer");if(node)node.textContent=timerText();},1000);}
  async function submitExam(auto=false){
  if(submitted)return;
  submitted=true;
  clearInterval(timer);
  saveSession();
  renderStudent();
  if(auto){
    message("Time expired. Your answers were submitted automatically.","warn");
  }
  const match=location.hash.match(/^#share=([a-f0-9]{12})$/i);
  if(!match){
    resultSyncMessage="This exam was not opened through a valid share link. The result was not sent to the teacher.";
    renderStudent();
    return;
  }
  if(!studentName.trim()){
    resultSyncMessage="The student's name is missing. The result could not be submitted.";
    renderStudent();
    return;
  }
  resultSyncMessage="Sending your result...";
  try{
    const response=await fetch(
      "https://pulseprep-shareable-exams-ai.ddangote701.workers.dev/submit-result",
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          examId:match[1],
          studentName:studentName.trim(),
          answers:answers
        })
      }
    );
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      throw new Error(data.error||"The server could not save your result.");
    }
    resultSyncMessage="Result saved successfully. Score: "+
      data.score+"/"+data.totalQuestions+" ("+data.percentage+"%).";
  }catch(error){
    resultSyncMessage="Result submission failed: "+error.message+
      ". Your result may still be available on this device.";
  }
  renderStudent();
}
  function renderStudent() {
    const root=$("studentContent");root.replaceChildren();if(!studentExam)return;const exam=studentExam;
    if(!startedAt){
  const hero=document.createElement("div");
  hero.className="student-hero";
  const h=document.createElement("h2");
  h.textContent=exam.title;
  hero.append(h);
  const p=document.createElement("p");
  p.textContent=exam.subject+(exam.topic?" · "+exam.topic:"");
  hero.append(p);
  const meta=document.createElement("div");
  meta.className="student-meta";
  [exam.questions.length+" questions",exam.duration?exam.duration+" minute time limit":"No time limit",exam.difficulty].forEach(value=>{
    const tag=document.createElement("span");
    tag.className="pill";
    tag.textContent=value;
    meta.append(tag);
  });
  hero.append(meta);
  const ins=document.createElement("p");
  ins.textContent=exam.instructions;
  hero.append(ins);
  const nameLabel=document.createElement("label");
  nameLabel.textContent="Student's full name";
  nameLabel.htmlFor="studentNameInput";
  nameLabel.style.display="block";
  nameLabel.style.marginTop="16px";
  const nameInput=document.createElement("input");
  nameInput.type="text";
  nameInput.id="studentNameInput";
  nameInput.placeholder="Enter your full name";
  nameInput.maxLength=100;
  nameInput.autocomplete="name";
  nameInput.value=studentName;
  nameInput.required=true;
  nameInput.style.display="block";
  nameInput.style.width="100%";
  nameInput.style.boxSizing="border-box";
  nameInput.style.padding="12px";
  nameInput.style.margin="8px 0 16px";
  hero.append(nameLabel,nameInput);
  const warning=document.createElement("p");
  warning.textContent="Practice exam. Your result can be submitted for recording when you finish.";
  hero.append(warning);
  const start=document.createElement("button");
  start.className="btn btn-primary";
  start.textContent="Start examination";
  start.addEventListener("click",()=>{
    const name=nameInput.value.trim();
    if(!name){
      nameInput.focus();
      nameInput.setCustomValidity("Please enter your full name before starting.");
      nameInput.reportValidity();
      return;
    }
    nameInput.setCustomValidity("");
    studentName=name;
    startedAt=Date.now();
    deadline=exam.duration?startedAt+exam.duration*60000:0;
    saveSession();
    renderStudent();
    if(deadline)startTimer();
  });
  nameInput.addEventListener("input",()=>{
    nameInput.setCustomValidity("");
  });
  hero.append(start);
  root.append(hero);
  return;
}
if(submitted){
  renderResults(root);
  return;
}
  function renderResults(root) {
    const exam=studentExam,score=PulseExam.mark(exam,answers),box=document.createElement("div");box.className="panel";
    const scoreBox=document.createElement("div");scoreBox.className="score-box";const title=document.createElement("h2");title.textContent="Your practice results";scoreBox.append(title);
    const number=document.createElement("div");number.className="score-number";number.textContent=score.percentage+"%";scoreBox.append(number);
    const summary=document.createElement("p");summary.textContent=score.correct+" correct out of "+score.total+" · "+score.grade;scoreBox.append(summary);
    const stats=document.createElement("p");stats.textContent="Answered: "+score.answered+" · Correct: "+score.correct+" · Incorrect: "+score.incorrect+" · Unanswered: "+score.unanswered;scoreBox.append(stats);
    const note=document.createElement("p");
note.className="muted";
note.textContent=resultSyncMessage;
scoreBox.append(note);
    const reviewTitle=document.createElement("h2");reviewTitle.textContent="Answer review";box.append(reviewTitle);
    exam.questions.forEach((q,index)=>{const isEmpty=answers[index]===null,isCorrect=answers[index]===q.correct,item=document.createElement("article");
      item.className="review-item "+(isEmpty?"unanswered":isCorrect?"correct":"incorrect");const h=document.createElement("h3");h.textContent=(index+1)+". "+q.text;item.append(h);
      const feedback=document.createElement("p");feedback.className="feedback "+(isEmpty?"":isCorrect?"good":"bad");feedback.textContent=isEmpty?"Unanswered":isCorrect?"Correct":"Incorrect";item.append(feedback);
      const yourAnswer=document.createElement("p");yourAnswer.textContent="Your answer: "+(isEmpty?"No answer":String.fromCharCode(65+answers[index])+". "+q.options[answers[index]]);item.append(yourAnswer);
      const correctAnswer=document.createElement("p");correctAnswer.textContent="Correct answer: "+String.fromCharCode(65+q.correct)+". "+q.options[q.correct];item.append(correctAnswer);
      if(q.explanation){const explanation=document.createElement("p");explanation.textContent="Explanation: "+q.explanation;item.append(explanation);}
      if(q.reference){const reference=document.createElement("p");reference.className="muted";reference.textContent="Reference: "+q.reference;item.append(reference);}box.append(item);
    });
    const actions=document.createElement("div");actions.className="exam-nav no-print";const restart=document.createElement("button");restart.className="btn btn-primary";restart.textContent="Restart practice";
    restart.addEventListener("click",()=>{answers=Array(exam.questions.length).fill(null);current=0;startedAt=0;deadline=0;submitted=false;clearSession();renderStudent();});
    const printButton=document.createElement("button");printButton.className="btn btn-light";printButton.textContent="Print / Save PDF";printButton.addEventListener("click",()=>window.print());actions.append(restart,printButton);box.append(actions);root.append(box);
  }
  async function generateAI() {
  const button = $("generateAiBtn");
  const status = $("aiStatus");

  const subject = $("aiSubject").value.trim();
  const topic = $("aiTopic").value.trim();
  const count = Number($("aiCount").value);
  const difficulty = $("aiDifficulty").value;
  const style = $("aiStyle").value;
  const explanationDepth = $("aiDepth").value;
  const clinicalScenarios = $("aiClinical").checked;

  if (!subject || !topic) {
    message("Enter both a nursing subject and a topic.", "warn");
    return;
  }

  button.disabled = true;
  button.textContent = "Generating questions...";
  status.textContent = "Contacting the AI service. Please wait.";

  try {
    const response = await fetch(
      "https://pulseprep-shareable-exams-ai.ddangote701.workers.dev/generate-questions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject,
          topic,
          count,
          difficulty,
          style,
          explanationDepth,
          clinicalScenarios
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "The AI service could not generate questions."
      );
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("The AI service returned no valid questions.");
    }

    const generatedQuestions = data.questions.map(question =>
      PulseExam.normalizeQuestion(question)
    );

    if (questions.length + generatedQuestions.length > 200) {
      throw new Error(
        "Your exam cannot contain more than 200 questions. Remove some questions first."
      );
    }

    questions.push(...generatedQuestions);
    editing = -1;

    renderQuestions();

    status.textContent =
      `${generatedQuestions.length} questions generated successfully.`;

    message(
      `${generatedQuestions.length} AI-generated questions added. Review the questions and answers before using them.`
    );

    $("questionList").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("PulsePrep AI generation error:", error);

    status.textContent = "Question generation failed.";

    message(
      error.message || "Unable to connect to the AI service.",
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent = "Generate questions";
  }
}
    async function parseSharedExam() {
    const hash = location.hash;

    // Open a new short sharing link.
    if (hash.startsWith("#share=")) {
      showView("student");
      $("studentContent").replaceChildren();

      const loading = document.createElement("div");
      loading.className = "panel";
      loading.textContent = "Loading shared exam...";
      $("studentContent").append(loading);

      try {
        const id = decodeURIComponent(hash.slice(7));

        if (!/^[a-f0-9]{12}$/.test(id)) {
          throw new Error("This exam-sharing link is invalid.");
        }

        const response = await fetch(
          "https://pulseprep-shareable-exams-ai.ddangote701.workers.dev/share/" +
            id
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.exam) {
          throw new Error(
            data.error || "This exam was not found or may have expired."
          );
        }

        studentExam = PulseExam.normalizeExam(data.exam);
        answers = Array(studentExam.questions.length).fill(null);

        restoreSession();
        renderStudent();

        if (deadline && !submitted) {
          startTimer();
        }

        return true;
      } catch (error) {
        $("studentContent").replaceChildren();

        const panel = document.createElement("div");
        panel.className = "panel";

        const heading = document.createElement("h2");
        heading.textContent = "Unable to open this exam";

        const paragraph = document.createElement("p");
        paragraph.textContent =
          error.message || "Please ask the exam creator for a new link.";

        panel.append(heading, paragraph);
        $("studentContent").append(panel);

        return true;
      }
    }

    // Continue supporting older #exam= links.
    if (!hash.startsWith("#exam=")) {
      return false;
    }

    try {
      const encoded = hash.slice(6);

      if (encoded.length > 700000) {
        throw new Error("The link is too large.");
      }

      const data = decodeURIComponent(escape(atob(encoded)));

      studentExam = PulseExam.normalizeExam(JSON.parse(data));
      answers = Array(studentExam.questions.length).fill(null);

      restoreSession();
      showView("student");
      renderStudent();

      if (deadline && !submitted) {
        startTimer();
      }

      return true;
    } catch (error) {
      showView("student");
      $("studentContent").replaceChildren();

      const panel = document.createElement("div");
      panel.className = "panel";

      const heading = document.createElement("h2");
      heading.textContent = "This exam link is invalid";

      const paragraph = document.createElement("p");
      paragraph.textContent =
        error.message ||
        "The exam data is missing, damaged, too large, or not supported. Ask the creator for a new link.";

      panel.append(heading, paragraph);
      $("studentContent").append(panel);

      return true;
    }
  }

  // Initialize the application and connect its buttons.
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
          raw.questions = questions.map(PulseExam.normalizeQuestion);
        }

        localStorage.setItem(STORE, JSON.stringify(raw));
        message("Draft saved on this device and browser.");
      } catch (error) {
        message("Draft could not be saved: " + error.message, "error");
      }
    };

    $("loadDraftBtn").onclick = () => {
      try {
        const raw = localStorage.getItem(STORE);

        if (!raw) {
          message("No saved draft was found in this browser.", "warn");
          return;
        }

        const exam = PulseExam.normalizeExam(JSON.parse(raw));

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
        message("Saved draft could not be loaded: " + error.message, "error");
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
    $("backToBuilderBtn").onclick = () => showView("builder");
    $("shareBtn").onclick = share;

    $("copyLinkBtn").onclick = async () => {
      const input = $("shareUrl");

      if (!input.value) {
        message("Create a sharing link first.", "warn");
        return;
      }

      try {
        await navigator.clipboard.writeText(input.value);
        message("Sharing link copied.");
      } catch {
        input.focus();
        input.select();

        try {
          const copied = document.execCommand("copy");

          if (copied) {
            message("Sharing link copied.");
          } else {
            message("Copy the selected link manually.", "warn");
          }
        } catch {
          message("Copy the selected link manually.", "warn");
        }
      }
    };

    $("exportBtn").onclick = exportJSON;

    $("downloadBtn").onclick = () => {
      const exam = validate();

      if (!exam) return;

      const html =
        "<!DOCTYPE html><html lang=\"en\"><head>" +
        "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
        "<title>" +
        esc(exam.title) +
        "</title></head><body>" +
        "<h1>" +
        esc(exam.title) +
        "</h1><p>" +
        esc(exam.subject) +
        "</p><p>" +
        esc(exam.instructions) +
        "</p>" +
        exam.questions
          .map(
            (q, i) =>
              "<section><h3>" +
              (i + 1) +
              ". " +
              esc(q.text) +
              "</h3><ol type=\"A\">" +
              q.options
                .map((option) => "<li>" + esc(option) + "</li>")
                .join("") +
              "</ol><p><strong>Correct answer:</strong> " +
              esc(q.options[q.correct]) +
              "</p><p><strong>Explanation:</strong> " +
              esc(q.explanation || "No explanation provided.") +
              "</p></section>"
          )
          .join("") +
        "</body></html>";

      download(
        "pulseprep-exam.html",
        html,
        "text/html;charset=utf-8"
      );
    };

    $("importFile").onchange = (event) => {
      const file = event.target.files[0];

      if (file) {
        importJSON(file);
      }

      event.target.value = "";
    };

    // Keep AI question generation connected if its function exists.
    if (typeof generateAI === "function") {
      $("generateAiBtn").onclick = generateAI;
    } else {
      $("generateAiBtn").onclick = () => {
        message(
          "The AI question-generation function is missing. It must be restored before this feature can work.",
          "error"
        );
      };
    }

    // Shared links require asynchronous initialization.
    parseSharedExam()
      .then((found) => {
        if (!found) {
          showView("builder");
        }
      })
      .catch((error) => {
        console.error("PulsePrep initialization error:", error);
        showView("builder");
        message("The application could not load the exam link.", "error");
      });
  }

  init();
})();
