const KB = {
  infertility: {
    label: "Infertility / Reproductive Medicine",
    conditions: ["pcos", "polycystic ovary", "endometriosis", "recurrent implantation failure", "rif", "male factor", "azoospermia", "thin endometrium", "hydrosalpinx", "uterine septum", "unexplained infertility", "diminished ovarian reserve", "adenomyosis", "fibroid", "myoma"],
    interventions: ["letrozole", "clomiphene", "clomid", "aspirin", "heparin", "ivig", "progesterone", "ivf", "icsi", "iui", "laparoscopy", "hysteroscopy", "gcsf", "intralipid", "prednisolone", "metformin", "embryo glue", "pgt-a", "surgery"],
    outcomesRanked: ["cumulative live birth", "live birth rate", "ongoing pregnancy rate", "clinical pregnancy rate", "implantation rate", "miscarriage rate"],
    outcomeNotes: {
      "pregnancy": "Insufficiently specific. Distinguish biochemical, clinical, ongoing pregnancy, and live birth.",
      "clinical pregnancy": "Acceptable surrogate, but live birth is preferred as primary outcome.",
      "implantation": "Consider implantation rate vs ongoing implantation rate."
    },
    terminology: ["IVF", "ICSI", "ART", "OHSS"]
  },
  gynecology: {
    label: "Gynecology",
    conditions: ["fibroid", "myoma", "endometriosis", "adenomyosis", "pcos", "heavy menstrual bleeding", "hmb", "endometrial hyperplasia", "ovarian cyst", "prolapse", "pid", "chronic pelvic pain"],
    interventions: ["myomectomy", "hysterectomy", "uae", "uterine artery embolization", "laparoscopy", "hysteroscopy", "levonorgestrel iud", "mirena", "tranexamic acid", "gnrh agonist", "gnrh antagonist", "ablation"],
    outcomesRanked: ["patient-reported symptom relief", "hemoglobin change", "quality of life scores", "reoperation rate", "major complications", "patient satisfaction"],
    outcomeNotes: {},
    terminology: ["HMB", "UAE", "LNG-IUS"]
  },
  obstetrics: {
    label: "Obstetrics",
    conditions: ["preterm birth", "short cervix", "preeclampsia", "gestational diabetes", "placenta accreta", "previa", "iugr", "fetal growth restriction", "pprom", "recurrent miscarriage", "twin pregnancy", "breech"],
    interventions: ["cerclage", "progesterone", "aspirin", "pessary", "corticosteroids", "magnesium sulfate", "insulin", "metformin", "external cephalic version", "bed rest"],
    outcomesRanked: ["perinatal mortality", "neonatal morbidity composite", "gestational age at delivery", "preterm birth < 37 weeks", "birthweight", "maternal morbidity", "NICU admission"],
    outcomeNotes: {
      "pregnancy outcome": "Specify maternal vs neonatal vs perinatal outcomes.",
      "preterm birth": "Specify threshold: < 37, < 34, or < 32 weeks."
    },
    terminology: ["PTB", "FGR", "PPROM", "GDM"]
  }
};

const QUESTION_TYPES = [
  { type: "Therapy / Prevention", framework: "PICO" },
  { type: "Diagnosis", framework: "Diagnostic accuracy (PIRD)" },
  { type: "Prognosis", framework: "PECO (prognostic)" },
  { type: "Etiology / Risk factors", framework: "PECO" }
];

const state = {
  input: "",
  specialty: null,
  condition: null,
  intervention: null,
  comparator: null,
  questionType: null,
  outcome: null
};

const PIPELINE = ["Intent Recognition", "Clarification", "Question Formulation", "Quality Assessment", "Search Strategy"];

function fillExample(text) {
  document.getElementById("clinicalInput").value = text;
}

function renderPipeline(activeIdx) {
  const el = document.getElementById("pipeline");
  el.innerHTML = PIPELINE.map((s, i) => {
    let cls = "pipe-step";
    if (i < activeIdx) cls += " done";
    if (i === activeIdx) cls += " active";
    return `<span class="${cls}">${i + 1}. ${s}</span>`;
  }).join("");
}

function matchIn(text, list) {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ") + " ";
  return list.filter(term => t.includes(" " + term + " ") || t.includes(term));
}

function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function analyze() {
  const raw = document.getElementById("clinicalInput").value.trim();
  if (!raw) { alert("Please enter a clinical uncertainty first."); return; }
  state.input = raw;

  const lower = raw.toLowerCase();
  let bestSpec = null, bestHits = 0;
  for (const key of Object.keys(KB)) {
    const hits = matchIn(lower, KB[key].conditions).length + matchIn(lower, KB[key].interventions).length;
    if (hits > bestHits) { bestHits = hits; bestSpec = key; }
  }

  if (bestHits === 0) {
    document.getElementById("intentBody").innerHTML =
      `<div class="advisory">This prototype's knowledge base covers Obstetrics, Gynecology and Infertility.
       Your input was not recognized. Please include terms like PCOS, endometriosis, fibroids, cerclage, preeclampsia, IVF&hellip;</div>`;
    document.getElementById("intentCard").classList.remove("hidden");
    renderPipeline(0);
    return;
  }

  const spec = KB[bestSpec];
  state.specialty = bestSpec;
  const conds = matchIn(lower, spec.conditions);
  const ivs = matchIn(lower, spec.interventions);
  state.condition = conds.length ? titleCase(conds[conds.length - 1]) : null;
  state.intervention = ivs.length ? titleCase(ivs[ivs.length - 1]) : null;
  state.comparator = ivs.length > 1 ? titleCase(ivs[ivs.length - 2]) : null;

  const diagWords = ["diagnos", "ultrasound", "mri", "ct", "scan", "accuracy", "test"];
  const isDiagnostic = diagWords.some(w => lower.includes(w));
  const progWords = ["prognos", "predict", "risk of", "likelihood"];
  const isPrognostic = progWords.some(w => lower.includes(w));

  if (isDiagnostic) state.questionType = QUESTION_TYPES[1];
  else if (isPrognostic && !state.intervention) state.questionType = QUESTION_TYPES[2];
  else if (!state.intervention && !isPrognostic) state.questionType = QUESTION_TYPES[3];
  else state.questionType = QUESTION_TYPES[0];

  document.getElementById("intentBody").innerHTML = `
    <p><strong>Specialty:</strong> <span class="tag">${spec.label}</span></p>
    <p><strong>Clinical problem / population:</strong> ${state.condition ? `<span class="tag">${state.condition}</span>` : '<em style="color:var(--warn)">not identified</em>'}</p>
    <p style="margin-top:6px;"><strong>Intervention:</strong> ${state.intervention ? `<span class="tag">${state.intervention}</span>` : '<em style="color:var(--warn)">not identified</em>'}
    &nbsp; <strong>Comparator:</strong> ${state.comparator ? `<span class="tag">${state.comparator}</span>` : '<em style="color:var(--warn)">not identified</em>'}</p>
    <p style="margin-top:6px;"><strong>Likely question type:</strong> <span class="tag">${state.questionType.type}</span> → framework <span class="tag">${state.questionType.framework}</span></p>
  `;
  document.getElementById("intentCard").classList.remove("hidden");
  renderPipeline(1);
  buildClarification();
  window.scrollTo({ top: document.getElementById("clarifyCard").offsetTop - 20, behavior: "smooth" });
}

function chip(label, value, cls) {
  return `<button class="chip ${cls || ''}" onclick='pick("${value.replace(/'/g, "\\'")}")'>${label}</button>`;
}

function pick(value) {
  if (state.awaiting === "condition") state.condition = value;
  else if (state.awaiting === "intervention") state.intervention = value;
  else if (state.awaiting === "comparator") state.comparator = value;
  else if (state.awaiting === "outcome") state.outcome = value;
  buildClarification();
}

function freePick(promptText, field) {
  const v = prompt(promptText);
  if (v && v.trim()) { state[field] = v.trim(); buildClarification(); }
}

function buildClarification() {
  state.awaiting = null;
  let html = "";

  if (!state.condition) {
    state.awaiting = "condition";
    const opts = KB[state.specialty].conditions.slice(0, 8);
    html += `<p><strong>I can see this is about ${KB[state.specialty].label}, but what is the clinical problem or population?</strong></p><div class="chips">`;
    html += opts.map(c => chip(titleCase(c), titleCase(c))).join("");
    html += `<button class="chip freeform" onclick='freePick("Describe the population:", "condition")'>Other…</button></div>`;
  } else if (!state.intervention && state.questionType.framework === "PICO") {
    state.awaiting = "intervention";
    const opts = KB[state.specialty].interventions.slice(0, 8);
    html += `<p><strong>What intervention are you considering?</strong></p><div class="chips">`;
    html += opts.map(i => chip(titleCase(i), titleCase(i))).join("");
    html += `<button class="chip freeform" onclick='freePick("Name the intervention:", "intervention")'>Other…</button></div>`;
  } else if (!state.comparator && state.questionType.framework === "PICO") {
    state.awaiting = "comparator";
    html += `<p><strong>Compared with what?</strong></p><div class="chips">
      ${chip("No treatment / placebo", "no treatment")}
      ${chip("Standard care", "usual care")}
    </div>
    <div class="chips"><button class="chip freeform" onclick='freePick("Name the comparator:", "comparator")'>Another intervention…</button></div>`;
  } else if (!state.outcome) {
    state.awaiting = "outcome";
    const ranked = KB[state.specialty].outcomesRanked;
    html += `<p><strong>What is your primary outcome?</strong> <span style="color:var(--muted);font-size:.85rem;">(ranked by clinical meaningfulness for this specialty)</span></p><div class="chips">`;
    html += ranked.map((o, i) => chip(o + (i === 0 ? " ★ recommended" : ""), o)).join("");
    html += `<button class="chip freeform" onclick='freePick("Name the outcome:", "outcome")'>Other…</button></div>`;
  } else {
    renderQuestion();
    return;
  }

  document.getElementById("clarifyBody").innerHTML = html;
  document.getElementById("clarifyCard").classList.remove("hidden");
}

function renderQuestion() {
  renderPipeline(2);
  let rows = "";
  if (state.questionType.framework === "PICO") {
    const pop = `Women with ${state.condition.toLowerCase()}`;
    rows = [
      ["P — Population", pop],
      ["I — Intervention", titleCase(state.intervention)],
      ["C — Comparator", state.comparator ? titleCase(state.comparator) : "No treatment / placebo"],
      ["O — Outcome", titleCase(state.outcome)]
    ];
  } else if (state.questionType.framework.startsWith("PECO")) {
    rows = [
      ["P — Population", `Women with ${state.condition.toLowerCase()}`],
      ["E — Exposure", state.intervention ? titleCase(state.intervention) : "(specify exposure)"],
      ["C — Comparator", state.comparator ? titleCase(state.comparator) : "Unexposed"],
      ["O — Outcome", titleCase(state.outcome)]
    ];
  } else {
    rows = [
      ["P — Population", `Patients with suspected ${state.condition.toLowerCase()}`],
      ["I — Index test", state.intervention || "(specify index test)"],
      ["R — Reference standard", "(e.g., histopathology)"],
      ["D — Diagnosis accuracy", "Sensitivity, specificity"]
    ];
  }
  const table = `<table class="pico">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>`;
  const question = buildQuestionText();
  document.getElementById("questionBody").innerHTML = table +
    `<div class="final-question"><strong>${question}</strong></div>`;
  document.getElementById("questionCard").classList.remove("hidden");
  renderQuality();
  renderSearch();
}

function buildQuestionText() {
  const cond = state.condition.toLowerCase();
  const iv = state.intervention ? state.intervention.toLowerCase() : "";
  const comp = (state.comparator && state.comparator !== "__other__") ? state.comparator.toLowerCase() : "no treatment";
  const out = state.outcome ? state.outcome.toLowerCase() : "";
  switch (state.questionType.framework) {
    case "PICO":
      return `In women with ${cond}, does ${iv} compared with ${comp} improve ${out}?`;
    case "PECO":
      return `In women with ${cond}, is exposure to ${iv || "(exposure)"} associated with ${out} compared with unexposed women?`;
    default:
      return `In patients with suspected ${cond}, what is the diagnostic accuracy of ${iv || "(index test)"} compared with the reference standard?`;
  }
}

function renderQuality() {
  renderPipeline(3);
  let scores = {};
  if (state.questionType.framework === "PICO") {
    scores["Population"] = state.condition ? 18 : 8;
    scores["Intervention"] = state.intervention ? 19 : 8;
    scores["Comparator"] = (state.comparator && state.comparator !== "__other__") ? 18 : 12;
    scores["Outcome"] = scoreOutcome();
    scores["Specificity"] = specificityScore();
  } else {
    scores["Population"] = state.condition ? 18 : 8;
    scores["Exposure/Index"] = state.intervention ? 18 : 10;
    scores["Comparator"] = 16;
    scores["Outcome"] = scoreOutcome();
    scores["Specificity"] = specificityScore();
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const max = Object.keys(scores).length * 20;
  let html = Object.entries(scores).map(([k, v]) =>
    `<div class="score-row"><span class="score-name">${k}</span>
     <div class="score-bar-bg"><div class="score-bar" style="width:${v / 20 * 100}%"></div></div>
     <span class="score-val">${v}/20</span></div>`).join("");
  html += `<div class="overall-score">Overall quality: ${total}/${max}</div>`;

  const notes = KB[state.specialty].outcomeNotes;
  const outLow = state.outcome && state.outcome.toLowerCase().includes("pregnancy") && !state.outcome.toLowerCase().includes("ongoing") && !state.outcome.toLowerCase().includes("cumulative");
  if (outLow || (notes[state.outcome] && scoreOutcome() < 16)) {
    html += `<div class="advisory">⚠️ "<strong>${titleCase(state.outcome)}</strong>" may be insufficiently specific. ${notes[state.outcome] || notes["pregnancy"] || "Consider a more patient-centered outcome such as live birth."}</div>`;
  }
  if (total >= max * 0.85) {
    html += `<div class="advisory" style="background:#ecfdf5;border-color:var(--good);color:#14532d;">✔ This is a well-formulated, answerable clinical question suitable for literature searching.</div>`;
  }
  document.getElementById("qualityBody").innerHTML = html;
  document.getElementById("qualityCard").classList.remove("hidden");
}

function scoreOutcome() {
  if (!state.outcome) return 8;
  const o = state.outcome.toLowerCase();
  if (o.includes("live birth") || o.includes("mortality") || o.includes("symptom relief")) return 20;
  if (o.includes("ongoing")) return 18;
  if (o.includes("clinical pregnancy")) return 14;
  if (o === "pregnancy" || o.includes("pregnancy rate")) return 11;
  return 15;
}

function specificityScore() {
  let s = 10;
  if (state.condition) s += 4;
  if (state.intervention) s += 3;
  if (state.comparator && state.comparator !== "__other__") s += 3;
  return Math.min(s, 20);
}

function renderSearch() {
  renderPipeline(PIPELINE.length);
  const cond = state.condition || "";
  const iv = state.intervention || "";
  const comp = state.comparator && state.comparator !== "__other__" ? state.comparator : "";
  const strategy =
`# PubMed search strategy

1. Population:
   ("${cond}"[Title/Abstract])
2. Intervention:
   ("${iv}"[Title/Abstract]${comp ? ` OR "${comp}"[Title/Abstract]` : ""})
3. Combine:
   #1 AND #2
   Filters: Randomized Controlled Trial; Systematic Review; Meta-Analysis; Humans; English`;
  const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`(${cond}) AND (${iv}${comp ? ` OR ${comp}` : ""})`)}`;
  document.getElementById("searchBody").innerHTML =
    `<code class="search-strategy">${strategy}</code>
     <p style="margin-top:12px;"><a href="${url}" target="_blank" rel="noopener">▶ Run this search on PubMed</a></p>
     <p class="hint" style="margin-top:8px;">Version 2 will add guideline retrieval (NICE, ASRM, ESHRE, RCOG, ACOG) here.</p>`;
  document.getElementById("searchCard").classList.remove("hidden");
}
