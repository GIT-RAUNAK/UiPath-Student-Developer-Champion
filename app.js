// ================== ELEMENTS ==================
const carousel = document.querySelector(".carousel");
const list = carousel.querySelector(".list");
const timeBar = carousel.querySelector(".timeRunning");
const fabAddBtn = document.getElementById("fabAddMember");

// ================== CONSTANTS ==================
const SLIDE_INTERVAL = 10000;
const ADD_SLIDE_CLASS = "add-slide";
const STORAGE_KEY = "carousel_members";

// ================== STATE ==================
let currentIndex = 0;
let timerId = null;
let paused = false;

// ================== HELPERS ==================
const slides = () => Array.from(list.children);

const uid = () =>
  crypto.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);

// ================== STORAGE ==================
function getStoredMembers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveStoredMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

// ================== TIMER ==================
function restartTimer() {
  if (paused) return;
  clearTimeout(timerId);

  timeBar.style.animation = "none";
  void timeBar.offsetWidth;
  timeBar.style.animation = `slideTimer ${SLIDE_INTERVAL}ms linear`;

  timerId = setTimeout(() => {
    setActiveSlide(currentIndex + 1);
  }, SLIDE_INTERVAL);
}

function pauseTimer() {
  paused = true;
  clearTimeout(timerId);
  timeBar.style.animation = "none";
}

function resumeTimer() {
  paused = false;
  restartTimer();
}

// ================== SLIDE CONTROL ==================
function setActiveSlide(index) {
  const all = slides();
  if (!all.length) return;

  if (index < 0) index = all.length - 1;
  if (index >= all.length) index = 0;

  all.forEach((s, i) => s.classList.toggle("active", i === index));
  currentIndex = index;
  restartTimer();
}

// ================== PREVIEW STRIPS ==================
function rebuildPreviewStrips() {
  const all = slides();
  const members = all.filter(s => !s.classList.contains(ADD_SLIDE_CLASS));

  members.forEach((slide, i) => {
    const strip = slide.querySelector(".preview-strip");
    if (!strip) return;

    const next1 = members[(i + 1) % members.length];
    const next2 = members[(i + 2) % members.length];

    strip.innerHTML = `
      <button class="preview-card" data-index="${all.indexOf(next1)}">
        <img src="${next1.querySelector("img").src}">
      </button>
      <button class="preview-card" data-index="${all.indexOf(next2)}">
        <img src="${next2.querySelector("img").src}">
      </button>
    `;
  });

  const addSlide = all.find(s => s.classList.contains(ADD_SLIDE_CLASS));
  if (addSlide && members.length) {
    addSlide.querySelector(".preview-strip").innerHTML = `
      <button class="preview-card" data-index="0">
        <img src="${members[0].querySelector("img").src}">
      </button>
    `;
  }
}

// ================== PREVIEW CLICK ==================
carousel.addEventListener("click", (e) => {
  const btn = e.target.closest(".preview-card");
  if (!btn) return;
  setActiveSlide(Number(btn.dataset.index));
});

// ================== RENDER MEMBER SLIDE ==================
function renderMemberSlide(member) {
  const slide = document.createElement("div");
  slide.className = "item";
  slide.dataset.id = member.id;

  slide.innerHTML = `
    <div class="overlay">
      <article class="member-card">
        <div class="member-photo">
          <img src="${member.imageSrc || "placeholder.webp"}">
        </div>
        <div class="member-info">
          <div class="title">${member.title}</div>
          <div class="name">${member.name}</div>
          <p class="des">${member.description}</p>

          <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
            <a class="primary-btn"
               href="${member.linkedin}"
               target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <button class="primary-btn delete-btn" data-id="${member.id}">
              Delete
            </button>
          </div>
        </div>
      </article>
      <aside class="preview-strip"></aside>
    </div>
  `;

  list.appendChild(slide);
}

// ================== DELETE MEMBER ==================
carousel.addEventListener("click", (e) => {
  const delBtn = e.target.closest(".delete-btn");
  if (!delBtn) return;

  const id = delBtn.dataset.id;

  // Update storage
  const updated = getStoredMembers().filter(m => m.id !== id);
  saveStoredMembers(updated);

  // Remove slide
  list.querySelector(`[data-id="${id}"]`)?.remove();

  rebuildPreviewStrips();
  setActiveSlide(0);
});

// ================== ADD SLIDE ==================
function createAddSlide() {
  if (list.querySelector(`.${ADD_SLIDE_CLASS}`)) return;

  const slide = document.createElement("div");
  slide.className = `item ${ADD_SLIDE_CLASS}`;

  slide.innerHTML = `
    <div class="overlay">
      <article class="member-card">
        <div class="member-photo add-bg"><span>+</span></div>
        <div class="member-info">
          <div class="title">Members Contact</div>
          <div class="name">Add new member</div>

          <form class="add-member-form">
            <input type="text" name="name" placeholder="Full name" required>
            <input type="text" name="title" placeholder="Title / Designation" required>

            <input type="file" name="image_file" accept="image/*">
            <input type="url" name="image_url" placeholder="Paste image URL">

            <input type="url" name="linkedin" placeholder="LinkedIn profile URL" required>
            <textarea name="description" rows="3" placeholder="Member description..." required></textarea>

            <button type="submit" class="primary-btn">Add</button>
          </form>
        </div>
      </article>
      <aside class="preview-strip"></aside>
    </div>
  `;

  list.appendChild(slide);
  attachAddMemberHandler(slide);
}

// ================== ADD MEMBER HANDLER ==================
function attachAddMemberHandler(addSlide) {
  const form = addSlide.querySelector(".add-member-form");

  form.addEventListener("focusin", pauseTimer);
  form.addEventListener("input", pauseTimer);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    let imageSrc = data.get("image_url")?.trim();
    const file = data.get("image_file");

    if (!imageSrc && file && file.size) {
      imageSrc = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    const member = {
      id: uid(),
      name: data.get("name"),
      title: data.get("title"),
      imageSrc,
      linkedin: data.get("linkedin"),
      description: data.get("description"),
    };

    const stored = getStoredMembers();
    stored.push(member);
    saveStoredMembers(stored);

    addSlide.remove();
    renderMemberSlide(member);
    createAddSlide();
    rebuildPreviewStrips();
    setActiveSlide(slides().length - 2);
    resumeTimer();
  });
}

// ================== FAB BUTTON ==================
fabAddBtn.addEventListener("click", () => {
  const index = slides().findIndex(s =>
    s.classList.contains(ADD_SLIDE_CLASS)
  );

  if (index !== -1) {
    pauseTimer();
    setActiveSlide(index);
  }
});

// ================== INIT ==================
function init() {
  // Restore saved members
  getStoredMembers().forEach(renderMemberSlide);

  createAddSlide();
  rebuildPreviewStrips();
  setActiveSlide(0);
}

document.addEventListener("DOMContentLoaded", init);
