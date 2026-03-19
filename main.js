// =============================================================
// KOB-KERAMIKA – main.js
// Firebase Auth + Firestore integration (SPA)
// =============================================================
//
// ⚠️  BEFORE USE: Replace the Firebase config placeholders below
//    with your own project credentials from:
//    https://console.firebase.google.com → Project settings → Your apps
//
// =============================================================

// ── Firebase SDK (loaded via CDN in index.html) ───────────────
// These globals are available after the Firebase CDN scripts load:
//   firebase, firebase.auth, firebase.firestore

// ── TODO: Replace with your own Firebase project config ───────
const FIREBASE_CONFIG = {
  apiKey:            "TODO_YOUR_API_KEY",
  authDomain:        "TODO_YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "TODO_YOUR_PROJECT_ID",
  storageBucket:     "TODO_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "TODO_YOUR_MESSAGING_SENDER_ID",
  appId:             "TODO_YOUR_APP_ID",
};

// ── App State ─────────────────────────────────────────────────
let db          = null;   // Firestore instance (set after real init)
let auth        = null;   // Auth instance
let currentUser = null;   // Logged-in Firebase user
let isFirebaseReady = false; // True once Firebase is initialised
let currentProjectId = "default";
let globalSitNum  = 1;
let globalSitVrsta = "privremena";

// ── Firebase initialisation ───────────────────────────────────
function initFirebase() {
  // Guard: skip if config is still placeholder values
  if (
    FIREBASE_CONFIG.apiKey.startsWith("TODO") ||
    FIREBASE_CONFIG.projectId.startsWith("TODO")
  ) {
    setDebugStatus("Demo mode – Firebase nije konfiguriran");
    return;
  }

  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    auth = firebase.auth();
    db   = firebase.firestore();
    isFirebaseReady = true;
    setDebugStatus("Firebase spojen ✅");

    // Listen for auth state changes
    auth.onAuthStateChanged(handleAuthStateChanged);
  } catch (err) {
    console.error("Firebase init error:", err);
    setDebugStatus("Firebase greška – provjeri config");
  }
}

// ── Auth state handler ────────────────────────────────────────
async function handleAuthStateChanged(user) {
  currentUser = user;

  if (!user) {
    showLoginOverlay();
    return;
  }

  // Check approval status in Firestore
  if (db) {
    try {
      const snap = await db.collection("users").doc(user.uid).get();
      const data = snap.exists ? snap.data() : {};

      if (!data.approved) {
        showPendingOverlay();
        return;
      }

      // Approved user
      updateUserDisplay(user.email);
      hideAllOverlays();
      checkAdminRole(data.role);
    } catch (err) {
      console.error("Firestore read error:", err);
      showLoginOverlay();
    }
  } else {
    // Firebase not ready – should not reach here in normal flow
    showLoginOverlay();
  }
}

// ── Auth: login / register ────────────────────────────────────
window.handleAuth = async function (action) {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errorEl  = document.getElementById("auth-error");
  const successEl = document.getElementById("auth-success");

  clearAuthMessages();

  // Validation
  if (!email || !password) {
    showAuthError("Molimo unesite email i lozinku.");
    return;
  }

  if (!isValidEmail(email)) {
    showAuthError("Email adresa nije ispravna.");
    return;
  }

  if (password.length < 6) {
    showAuthError("Lozinka mora imati najmanje 6 znakova.");
    return;
  }

  // Demo mode (Firebase not configured)
  if (!isFirebaseReady) {
    runDemoAuth(action, email, password);
    return;
  }

  // Real Firebase auth
  const submitBtn = document.getElementById("btn-login-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Molite pričekajte...";

  try {
    if (action === "login") {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will handle the rest
    } else {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      // Create pending user document in Firestore
      await db.collection("users").doc(cred.user.uid).set({
        email:     email,
        approved:  false,
        role:      "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showPendingOverlay();
    }
  } catch (err) {
    showAuthError(translateFirebaseError(err.code));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Prijavi se";
  }
};

// ── Demo auth (no Firebase) ───────────────────────────────────
function runDemoAuth(action, email, password) {
  // In demo mode we simply show the dashboard to demonstrate the UI.
  // No data is persisted; there is no real authentication.
  if (action === "login") {
    updateUserDisplay(email);
    hideAllOverlays();
    setDebugStatus("Demo prijava (" + email + ")");
  } else {
    // Simulate registration → pending approval
    showPendingOverlay();
    setDebugStatus("Demo registracija – čeka odobrenje");
  }
}

// ── Logout ────────────────────────────────────────────────────
window.doLogout = async function () {
  if (auth) {
    await auth.signOut().catch(() => {});
  }
  currentUser = null;
  updateUserDisplay(null);
  showLoginOverlay();
  setDebugStatus("Odjavljeni");
};

// ── Overlay helpers ───────────────────────────────────────────
function showLoginOverlay() {
  const el = document.getElementById("login-overlay");
  if (el) {
    el.style.display = "flex";
  }
  hidePendingOverlay();
}

function hideLoginOverlay() {
  const el = document.getElementById("login-overlay");
  if (el) el.style.display = "none";
}

function showPendingOverlay() {
  const el = document.getElementById("pending-approval-overlay");
  if (el) {
    el.style.display = "flex";
  }
  hideLoginOverlay();
}

function hidePendingOverlay() {
  const el = document.getElementById("pending-approval-overlay");
  if (el) el.style.display = "none";
}

function hideAllOverlays() {
  hideLoginOverlay();
  hidePendingOverlay();
}

// ── User display ──────────────────────────────────────────────
function updateUserDisplay(email) {
  const display = document.getElementById("active-user-display");
  const emailEl = document.getElementById("current-user-email");
  if (email) {
    if (display) display.style.display = "block";
    if (emailEl) emailEl.textContent = email;
  } else {
    if (display) display.style.display = "none";
    if (emailEl) emailEl.textContent = "";
  }
}

// ── Admin role ────────────────────────────────────────────────
function checkAdminRole(role) {
  const adminLi = document.getElementById("admin-panel-li");
  if (adminLi) {
    adminLi.style.display = role === "admin" ? "block" : "none";
  }
}

// ── Password visibility toggle ────────────────────────────────
window.togglePasswordVisibility = function () {
  const input = document.getElementById("auth-password");
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
};

// ── Auth messages ─────────────────────────────────────────────
function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}

function showAuthSuccess(msg) {
  const el = document.getElementById("auth-success");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}

function clearAuthMessages() {
  ["auth-error", "auth-success"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.style.display = "none";
    }
  });
}

// ── Firebase error translation ────────────────────────────────
function translateFirebaseError(code) {
  const messages = {
    "auth/user-not-found":       "Korisnik s tim emailom ne postoji.",
    "auth/wrong-password":       "Pogrešna lozinka.",
    "auth/invalid-email":        "Email adresa nije ispravna.",
    "auth/email-already-in-use": "Email adresa je već registrirana.",
    "auth/too-many-requests":    "Previše pokušaja. Pokušajte kasnije.",
    "auth/network-request-failed": "Greška mreže. Provjerite internet vezu.",
  };
  return messages[code] || "Došlo je do greške. Pokušajte ponovo.";
}

// ── Email validation ──────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Debug status ──────────────────────────────────────────────
function setDebugStatus(msg) {
  const el = document.getElementById("main-debug-status");
  if (el) el.textContent = msg;
}

// ── SPA Navigation ────────────────────────────────────────────
function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn[data-target]");
  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const target = btn.getAttribute("data-target");
      showView(target);

      navBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
    });
  });
}

function showView(viewId) {
  const views = document.querySelectorAll(".view");
  views.forEach(function (v) {
    v.classList.remove("active");
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
  }
}

// ── Theme ─────────────────────────────────────────────────────
window.setAppTheme = function (theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("kob-theme", theme);
};

function loadSavedTheme() {
  const saved = localStorage.getItem("kob-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

// ── Card maximise ─────────────────────────────────────────────
window.toggleCardMaximize = function (btn) {
  const card = btn.closest(".card");
  if (!card) return;
  const isMax = card.classList.toggle("maximized");
  btn.textContent = isMax ? "✖ Smanji" : "🔍 Povećaj prozor";
};

// ── Project management (local, demo) ─────────────────────────
let projects = {};

function initProjects() {
  const stored = localStorage.getItem("kob-projects");
  projects = stored ? JSON.parse(stored) : { default: { name: "Projekt 1", items: [] } };

  const selector = document.getElementById("project-selector");
  if (!selector) return;

  selector.innerHTML = "";
  Object.entries(projects).forEach(function ([id, proj]) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = proj.name;
    selector.appendChild(opt);
  });
  selector.value = currentProjectId;
}

function saveProjects() {
  localStorage.setItem("kob-projects", JSON.stringify(projects));
}

window.switchProject = function (id) {
  currentProjectId = id;
  renderTroskovnikTable();
};

window.addNewProject = function () {
  const name = prompt("Naziv novog projekta:");
  if (!name || !name.trim()) return;
  const id = "proj_" + Date.now();
  projects[id] = { name: name.trim(), items: [] };
  saveProjects();
  initProjects();
  window.switchProject(id);
};

window.renameCurrentProject = function () {
  if (!projects[currentProjectId]) return;
  const newName = prompt("Novi naziv projekta:", projects[currentProjectId].name);
  if (!newName || !newName.trim()) return;
  projects[currentProjectId].name = newName.trim();
  saveProjects();
  initProjects();
};

window.deleteCurrentProject = function () {
  const keys = Object.keys(projects);
  if (keys.length <= 1) {
    alert("Ne možete obrisati jedini projekt.");
    return;
  }
  if (!confirm("Obrisati projekt '" + projects[currentProjectId].name + "'?")) return;
  delete projects[currentProjectId];
  currentProjectId = Object.keys(projects)[0];
  saveProjects();
  initProjects();
  renderTroskovnikTable();
};

// ── Situacija ─────────────────────────────────────────────────
window.changeGlobalSituacija = function () {
  const numEl   = document.getElementById("global-sit-num");
  const vrstaEl = document.getElementById("global-sit-vrsta");
  if (numEl)   globalSitNum   = parseInt(numEl.value, 10) || 1;
  if (vrstaEl) globalSitVrsta = vrstaEl.value;
};

// ── Troškovnik logic ──────────────────────────────────────────
function initTroskovnik() {
  const addBtn = document.getElementById("btn-add-troskovnik");
  if (addBtn) {
    addBtn.addEventListener("click", addTroskovnikItem);
  }

  const excelInput = document.getElementById("excel-upload");
  if (excelInput) {
    excelInput.addEventListener("change", handleExcelUpload);
  }

  renderTroskovnikTable();
}

function addTroskovnikItem() {
  const pos   = document.getElementById("t-pos")   ? document.getElementById("t-pos").value.trim()   : "";
  const desc  = document.getElementById("t-desc")  ? document.getElementById("t-desc").value.trim()  : "";
  const unit  = document.getElementById("t-unit")  ? document.getElementById("t-unit").value.trim()  : "";
  const price = document.getElementById("t-price") ? parseFloat(document.getElementById("t-price").value) || 0 : 0;
  const qty   = document.getElementById("t-qty")   ? parseFloat(document.getElementById("t-qty").value) || 0  : 0;

  if (!pos || !desc) {
    alert("Pozicija i opis su obavezni.");
    return;
  }

  if (!projects[currentProjectId]) {
    projects[currentProjectId] = { name: "Projekt", items: [] };
  }

  projects[currentProjectId].items.push({ pos, desc, unit, price, qty });
  saveProjects();
  renderTroskovnikTable();

  // Clear inputs
  ["t-pos", "t-desc", "t-unit", "t-price", "t-qty"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function handleExcelUpload(e) {
  // Excel/CSV parsing requires SheetJS (xlsx).
  // TODO: Add a pinned SheetJS version to index.html, for example:
  //   <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
  //       then implement XLSX.read() parsing here.
  alert("Excel uvoz nije još implementiran. Dodajte SheetJS biblioteku i implementirajte parsiranje.");
  e.target.value = "";
}

function renderTroskovnikTable() {
  const table = document.getElementById("troskovnik-table");
  if (!table) return;

  const proj = projects[currentProjectId];
  const items = (proj && proj.items) ? proj.items : [];

  // Remove old tbody
  const oldTbody = table.querySelector("tbody");
  if (oldTbody) oldTbody.remove();

  const tbody = document.createElement("tbody");

  if (items.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.textAlign = "center";
    td.style.color = "var(--text-muted)";
    td.style.padding = "30px";
    td.textContent = "Nema stavki. Dodajte prvu stavku troškovnika.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    let total = 0;
    items.forEach(function (item, idx) {
      const amount = item.price * item.qty;
      total += amount;

      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td style='font-weight:600;'>" + escHtml(item.pos) + "</td>" +
        "<td>" + escHtml(item.desc) + "</td>" +
        "<td style='text-align:right; font-size:0.8rem; line-height:1.8;'>" +
          "<span style='color:var(--text-muted);'>" + escHtml(String(item.qty)) + " " + escHtml(item.unit) + " × " + formatCurrency(item.price) + "</span><br>" +
          "<strong>" + formatCurrency(amount) + "</strong>" +
          "<button onclick='deleteTroskovnikItem(" + idx + ")' style='margin-left:10px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.75rem;'>✕</button>" +
        "</td>";
      tbody.appendChild(tr);
    });

    // Total row
    const totalTr = document.createElement("tr");
    totalTr.style.borderTop = "2px solid var(--border-color)";
    totalTr.innerHTML =
      "<td colspan='2' style='font-weight:700;padding-top:12px;'>UKUPNO</td>" +
      "<td style='text-align:right;font-weight:700;font-size:1rem;color:var(--primary);padding-top:12px;'>" + formatCurrency(total) + "</td>";
    tbody.appendChild(totalTr);
  }

  table.appendChild(tbody);
}

window.deleteTroskovnikItem = function (idx) {
  if (!projects[currentProjectId]) return;
  projects[currentProjectId].items.splice(idx, 1);
  saveProjects();
  renderTroskovnikTable();
};

// ── Utility: currency formatting ──────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(val);
}

// ── Utility: HTML escape ──────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── PWA install ───────────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.installPWA = function () {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function () {
      deferredInstallPrompt = null;
    });
  } else {
    alert("Aplikacija je već instalirana ili preglednik ne podržava PWA instalaciju.");
  }
};

// ── Cloud / Admin / Ponuda stubs ──────────────────────────────
// TODO: Implement when Firebase is configured.

window.openCloudModal = function () {
  alert("Konfiguracija oblaka: unesite Firebase podatke u main.js (FIREBASE_CONFIG).");
};

window.pullFromCloud = function () {
  alert("Preuzimanje s oblaka nije dostupno u demo modu.");
};

window.openPonudaModal = function () {
  alert("Generiranje ponude / obračuna – funkcija u razvoju.");
};

window.openAdminPanelModal = function () {
  alert("Admin panel – dostupan samo s konfiguriranim Firebaseom.");
};

// ── DOM ready ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  loadSavedTheme();
  initFirebase();
  initNavigation();
  initProjects();
  initTroskovnik();
});
