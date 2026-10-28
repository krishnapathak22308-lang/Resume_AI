
"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const form = $("#resumeForm");
const experienceList = $("#experienceList");
const projectList = $("#projectList");
const toast = $("#toast");
const saveStatus = $("#saveStatus");

const STORAGE_KEY = "resumeai-draft-v1";
let toastTimer;
let saveTimer;

// Escape user-entered text before inserting it into preview HTML.
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function readValue(id) {
  return $(`#${id}`).value.trim();
}

// Create an experience or project editor card.
function createEntry(type, data = {}) {
  const isExperience = type === "experience";
  const container = isExperience ? experienceList : projectList;

  const card = document.createElement("div");
  card.className = `entry-card ${type}-item`;

  const title = isExperience ? "Experience entry" : "Project entry";

  if (isExperience) {
    card.innerHTML = `
      <div class="entry-heading">
        <strong>${title}</strong>
        <button class="remove-entry" type="button"
          aria-label="Remove experience" title="Remove">×</button>
      </div>
      <div class="form-grid">
        <label class="field full">
          <span>Job title / role</span>
          <input data-key="position" placeholder="e.g. Web Developer Intern" />
        </label>
        <label class="field full">
          <span>Company / organization</span>
          <input data-key="company" placeholder="Company or organization name" />
        </label>
        <label class="field full">
          <span>Duration</span>
          <input data-key="dates" placeholder="e.g. May 2026 – July 2026" />
        </label>
        <label class="field full">
          <span>Responsibilities / achievements</span>
          <textarea data-key="description" rows="3"
            placeholder="Describe your contributions, tools used, or results."></textarea>
        </label>
      </div>`;
  } else {
    card.innerHTML = `
      <div class="entry-heading">
        <strong>${title}</strong>
        <button class="remove-entry" type="button"
          aria-label="Remove project" title="Remove">×</button>
      </div>
      <div class="form-grid">
        <label class="field full">
          <span>Project name</span>
          <input data-key="name" placeholder="e.g. AI Resume Builder" />
        </label>
        <label class="field full">
          <span>Technologies used</span>
          <input data-key="stack" placeholder="HTML, CSS, JavaScript" />
        </label>
        <label class="field full">
          <span>Project description</span>
          <textarea data-key="description" rows="3"
            placeholder="What does it do? What did you build or learn?"></textarea>
        </label>
      </div>`;
  }

  // Populate fields through the value property, not HTML interpolation.
  $$("[data-key]", card).forEach((input) => {
    input.value = data[input.dataset.key] || "";
  });

  $(".remove-entry", card).addEventListener("click", () => {
    card.remove();
    updateEverything();
    notify(`${isExperience ? "Experience" : "Project"} removed.`);
  });

  container.appendChild(card);
  return card;
}

function getEntries(type) {
  const container = type === "experience" ? experienceList : projectList;

  return $$(".entry-card", container).map((card) => {
    const record = {};
    $$("[data-key]", card).forEach((field) => {
      record[field.dataset.key] = field.value.trim();
    });
    return record;
  });
}

function hasExperience(entry) {
  return Object.values(entry).some((value) => value);
}

function sectionHeading(title, subtitle, date) {
  return `
    <div class="resume-item-top">
      <div class="resume-item-title">${escapeHTML(title)}</div>
      ${date ? `<div class="resume-item-date">${escapeHTML(date)}</div>` : ""}
    </div>
    ${subtitle ? `<div class="resume-item-subtitle">${escapeHTML(subtitle)}</div>` : ""}
  `;
}

function renderExperience() {
  const entries = getEntries("experience").filter(hasExperience);
  const section = $("#experienceSection");
  const output = $("#previewExperience");

  section.hidden = entries.length === 0;

  output.innerHTML = entries.map((entry) => `
    <div class="resume-item">
      ${sectionHeading(entry.position || entry.company || "Experience",
        entry.company, entry.dates)}
      ${entry.description
        ? `<div class="resume-item-description">${escapeHTML(entry.description)}</div>`
        : ""}
    </div>
  `).join("");
}

function renderProjects() {
  const entries = getEntries("project").filter(hasExperience);
  const section = $("#projectsSection");
  const output = $("#previewProjects");

  section.hidden = entries.length === 0;

  output.innerHTML = entries.map((entry) => `
    <div class="resume-item">
      ${sectionHeading(entry.name || "Project", entry.stack, "")}
      ${entry.description
        ? `<div class="resume-item-description">${escapeHTML(entry.description)}</div>`
        : ""}
    </div>
  `).join("");
}

function renderEducation() {
  const degree = readValue("degree");
  const institution = readValue("institution");
  const gradYear = readValue("gradYear");
  const grade = readValue("grade");

  const section = $("#educationSection");
  const output = $("#previewEducation");

  if (!degree && !institution && !gradYear && !grade) {
    output.className = "muted-placeholder";
    output.textContent = "Your education will appear here.";
    return;
  }

  output.className = "";
  output.innerHTML = `
    <div class="resume-item">
      ${sectionHeading(degree || institution || "Education",
        institution && institution !== degree ? institution : "",
        gradYear)}
      ${grade ? `<div class="resume-item-description">${escapeHTML(grade)}</div>` : ""}
    </div>
  `;
}

function renderSkills() {
  const rawSkills = readValue("skills");
  const skills = [...new Set(
    rawSkills.split(/[,\n;]+/).map((skill) => skill.trim()).filter(Boolean)
  )];

  const output = $("#previewSkills");

  if (!skills.length) {
    output.innerHTML =
      '<span class="resume-skill placeholder-skill">Your skills here</span>';
    return;
  }

  output.innerHTML = skills
    .map((skill) => `<span class="resume-skill">${escapeHTML(skill)}</span>`)
    .join("");
}

function renderCertifications() {
  const lines = readValue("certifications")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  $("#certificationsSection").hidden = lines.length === 0;
  $("#previewCertifications").innerHTML = lines
    .map((line) => `<li>${escapeHTML(line)}</li>`)
    .join("");
}

function renderContact() {
  const contacts = [
    readValue("email"),
    readValue("phone"),
    readValue("location")
  ].filter(Boolean);

  $("#previewContact").textContent =
    contacts.join("  ·  ") || "Email · Phone · Location";

  $("#previewLink").textContent = readValue("linkedin");
}

function updatePreview() {
  $("#previewName").textContent = readValue("fullName") || "Your Name";
  $("#previewTitle").textContent =
    readValue("jobTitle") || "Your Professional Title";

  const summary = readValue("summary");
  const previewSummary = $("#previewSummary");
  previewSummary.textContent =
    summary || "Your professional summary will appear here.";
  previewSummary.classList.toggle("muted-placeholder", !summary);

  renderContact();
  renderEducation();
  renderSkills();
  renderExperience();
  renderProjects();
  renderCertifications();
}

function updateProgress() {
  const experienceComplete = getEntries("experience")
    .some((entry) => entry.position && entry.company && entry.description);

  const projectComplete = getEntries("project")
    .some((entry) => entry.name && entry.description);

  const checks = [
    Boolean(readValue("fullName")),
    Boolean(readValue("jobTitle")),
    Boolean(readValue("email")),
    Boolean(readValue("summary")),
    Boolean(readValue("degree")),
    Boolean(readValue("institution")),
    Boolean(readValue("gradYear")),
    Boolean(readValue("skills")),
    experienceComplete,
    projectComplete
  ];

  const completed = checks.filter(Boolean).length;
  const percent = Math.round((completed / checks.length) * 100);

  $("#progressValue").textContent = `${percent}%`;
  $("#progressFill").style.width = `${percent}%`;

  if (percent === 100) {
    $("#progressHeading").textContent = "Looking career-ready!";
    $("#progressMessage").textContent = "All key sections have been filled.";
  } else if (percent >= 60) {
    $("#progressHeading").textContent = "Your resume is taking shape";
    $("#progressMessage").textContent =
      "Great progress. Keep filling in the missing details.";
  } else if (percent > 0) {
    $("#progressHeading").textContent = "Nice start!";
    $("#progressMessage").textContent =
      "Keep going. Every section helps tell your story.";
  } else {
    $("#progressHeading").textContent = "Let's build your resume";
    $("#progressMessage").textContent =
      "Add your details to get started.";
  }
}

function collectState() {
  const fields = {};

  $$("input[id], textarea[id]", form).forEach((field) => {
    fields[field.id] = field.value;
  });

  return {
    fields,
    experiences: getEntries("experience"),
    projects: getEntries("project")
  };
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    saveStatus.innerHTML =
      '<span class="status-dot"></span> Saved just now';

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveStatus.innerHTML =
        '<span class="status-dot"></span> Auto-save enabled';
    }, 2200);
  } catch (error) {
    // The builder still works when browser storage is unavailable.
    saveStatus.textContent = "Browser storage unavailable";
  }
}

function updateEverything() {
  updatePreview();
  updateProgress();
  saveDraft();
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const state = JSON.parse(raw);
    if (!state || !state.fields) return false;

    Object.entries(state.fields).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field && form.contains(field)) {
        field.value = typeof value === "string" ? value : "";
      }
    });

    experienceList.replaceChildren();
    projectList.replaceChildren();

    const experiences = Array.isArray(state.experiences)
      ? state.experiences : [];
    const projects = Array.isArray(state.projects)
      ? state.projects : [];

    (experiences.length ? experiences : [{}]).forEach((entry) =>
      createEntry("experience", entry)
    );
    (projects.length ? projects : [{}]).forEach((entry) =>
      createEntry("project", entry)
    );

    return true;
  } catch (error) {
    console.warn("Could not restore the saved draft.", error);
    return false;
  }
}

function loadSample() {
  const sampleFields = {
    fullName: "Alex Morgan",
    jobTitle: "Aspiring Full Stack Developer",
    email: "alex.morgan@example.com",
    phone: "+91 98765 43210",
    location: "Pune, India",
    linkedin: "linkedin.com/in/alex-morgan",
    summary: "Motivated B.Tech student interested in full stack development. Enjoys turning ideas into responsive web applications and learning modern development tools. Seeking opportunities to apply technical knowledge through practical projects and collaborative problem-solving.",
    degree: "B.Tech in Computer Science",
    institution: "Your University Name",
    gradYear: "2028",
    grade: "8.5 CGPA",
    skills: "HTML, CSS, JavaScript, Java, Git, Responsive Design, Problem-solving, Communication",
    certifications: "Java Programming — Online Course\nWeb Development Fundamentals — Online Course"
  };

  Object.entries(sampleFields).forEach(([id, value]) => {
    $(`#${id}`).value = value;
  });

  experienceList.replaceChildren();
  projectList.replaceChildren();

  createEntry("experience", {
    position: "Web Development Volunteer",
    company: "Campus Tech Club",
    dates: "Jan 2026 – Mar 2026",
    description: "Collaborated with team members to update club web pages and improve mobile-friendly layouts. Practised version control and debugging."
  });

  createEntry("project", {
    name: "AI Resume Builder",
    stack: "HTML, CSS, JavaScript",
    description: "Developed a responsive resume builder with live preview, dynamic project sections, browser-based draft saving, and printable PDF export."
  });

  updateEverything();
  notify("Sample loaded! Replace the example details with your own.");
}

// This smart writer uses local templates. It does not call an AI service.
function createSmartSummary() {
  const title = readValue("jobTitle") || "aspiring software professional";
  const skills = readValue("skills")
    .split(/[,\n;]+/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 4);

  const degree = readValue("degree");
  const skillText = skills.length
    ? skills.join(", ")
    : "problem-solving, communication, and continuous learning";

  const educationText = degree
    ? ` Currently pursuing ${degree},`
    : " As an enthusiastic learner,";

  const draft =
    `Motivated ${title} with an interest in building practical, user-focused solutions. ` +
    `Familiar with ${skillText}.${educationText} eager to apply technical knowledge ` +
    `through hands-on projects, thoughtful problem-solving, and collaborative development. ` +
    `Committed to learning new tools and continuously improving software development skills.`;

  $("#summary").value = draft;
  updateEverything();
  notify("Smart draft created. Personalize it with your real experience and goals.");
}

function clearForm() {
  const confirmed = window.confirm(
    "Clear all resume details and the saved draft from this browser?"
  );
  if (!confirmed) return;

  form.reset();
  experienceList.replaceChildren();
  projectList.replaceChildren();

  createEntry("experience");
  createEntry("project");

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear saved browser data.", error);
  }

  updateEverything();
  notify("Form cleared. Start your new resume.");
}

function exportPDF() {
  // Use the browser's print dialog and select "Save as PDF".
  window.print();
}

// Buttons for repeatable sections.
$("#addExperienceBtn").addEventListener("click", () => {
  createEntry("experience");
  updateEverything();
});

$("#addProjectBtn").addEventListener("click", () => {
  createEntry("project");
  updateEverything();
});

// Inputs, including dynamically added cards, update the preview.
form.addEventListener("input", updateEverything);
form.addEventListener("change", updateEverything);

$("#improveSummaryBtn").addEventListener("click", createSmartSummary);
$("#sampleBtn").addEventListener("click", loadSample);
$("#clearBtn").addEventListener("click", clearForm);
$("#downloadBtn").addEventListener("click", exportPDF);
$("#downloadBottomBtn").addEventListener("click", exportPDF);
$("#printBtn").addEventListener("click", exportPDF);

// Initialize the application.
const draftRestored = restoreDraft();

if (!draftRestored) {
  createEntry("experience");
  createEntry("project");
}

updateEverything();
