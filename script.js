(() => {
  /* Adresse de l'application web Google Apps Script (planning). Vide = envoi par e-mail classique. */
  const API = "";
  const FALLBACK_EMAIL = "location@mathyridee.net";
  const PHONE_DISPLAY = "+32 467 77 60 74";

  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const RIDES = {
    decouverte: { minutes: 60, fr: "Découverte", en: "Discovery" },
    exploration: { minutes: 120, fr: "Exploration", en: "Exploration" },
    adrenaline: { minutes: 60, fr: "Adrénaline", en: "Adrenaline" }
  };
  const DEFAULTS = { open: "09:00", close: "17:30", step: 60, buffer: 30, minNoticeHours: 12, maxPeople: 5, days: [], busy: {} };

  const T = {
    fr: {
      errors: {
        ride: "Choisissez une formule.",
        people: "Choisissez le nombre de personnes (5 maximum).",
        name: "Indiquez votre nom.",
        phone: "Indiquez un numéro de téléphone valide.",
        email: "Indiquez une adresse e-mail valide.",
        whenPlanner: "Choisissez un jour et une heure de départ.",
        whenManual: "Choisissez un jour à venir et une heure de départ.",
        summary: "Il manque quelques informations : corrigez les champs signalés en rouge.",
        taken: "Ce créneau vient d’être réservé. Choisissez-en un autre, les disponibilités sont à jour.",
        closed: "Ce jour n’est pas ouvert à la réservation. Choisissez-en un autre.",
        busy: "Le planning est très sollicité. Réessayez dans quelques secondes.",
        generic: `L’envoi n’a pas abouti. Réessayez, ou appelez-nous au ${PHONE_DISPLAY}.`
      },
      loading: "Chargement des disponibilités…",
      loadFail: "Les disponibilités n’ont pas pu être chargées. Indiquez le jour et l’heure souhaités.",
      sending: "Envoi en cours…",
      noDays: `Aucun jour libre pour le moment. Appelez-nous au ${PHONE_DISPLAY}.`,
      pickRideFirst: "Choisissez d’abord une formule.",
      pickDayFirst: "Choisissez d’abord un jour.",
      starts: (n) => n > 0 ? `${n} départ${n > 1 ? "s" : ""}` : "Complet",
      back: (t) => `retour ${t}`,
      done: (r, ride, d, t, p) => `Référence ${r} : ${ride}, le ${d} à ${t}, pour ${p} personne${p > 1 ? "s" : ""}.`,
      mailSubject: "Demande de réservation Pré Mathy Ride",
      intro: "Bonjour, je souhaite réserver une balade Pré Mathy Ride.",
      labels: { ride: "Formule", people: "Personnes", date: "Date", time: "Heure", name: "Nom", phone: "Téléphone", email: "E-mail" },
      time: (t) => { const [h, m] = t.split(":"); return `${Number(h)} h${m === "00" ? "" : " " + m}`; },
      menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu",
      count: (i, n) => `Photo ${i} sur ${n}`,
      locale: "fr-BE"
    },
    en: {
      errors: {
        ride: "Please choose a ride.",
        people: "Please choose the number of people (5 max).",
        name: "Please enter your name.",
        phone: "Please enter a valid phone number.",
        email: "Please enter a valid email address.",
        whenPlanner: "Please choose a day and a start time.",
        whenManual: "Please choose a future day and a start time.",
        summary: "A few details are missing: please fix the fields marked in red.",
        taken: "This time slot has just been booked. Please pick another one, availability is up to date.",
        closed: "This day is not open for booking. Please pick another one.",
        busy: "The planner is busy right now. Please try again in a few seconds.",
        generic: `Your request could not be sent. Please try again, or call us on ${PHONE_DISPLAY}.`
      },
      loading: "Loading availability…",
      loadFail: "Availability could not be loaded. Please enter your preferred day and time.",
      sending: "Sending…",
      noDays: `No free days at the moment. Please call us on ${PHONE_DISPLAY}.`,
      pickRideFirst: "Choose a ride first.",
      pickDayFirst: "Choose a day first.",
      starts: (n) => n > 0 ? `${n} slot${n > 1 ? "s" : ""}` : "Full",
      back: (t) => `back at ${t}`,
      done: (r, ride, d, t, p) => `Reference ${r}: ${ride}, on ${d} at ${t}, for ${p} ${p > 1 ? "people" : "person"}.`,
      mailSubject: "Pré Mathy Ride booking request",
      intro: "Hello, I would like to book a Pré Mathy Ride tour.",
      labels: { ride: "Ride", people: "People", date: "Date", time: "Time", name: "Name", phone: "Phone", email: "Email" },
      time: (t) => t,
      menuOpen: "Open menu", menuClose: "Close menu",
      count: (i, n) => `Photo ${i} of ${n}`,
      locale: "en-GB"
    }
  }[lang];

  /* En-tête et barre mobile */
  const header = document.getElementById("header");
  const bar = document.getElementById("mobile-bar");
  const booking = document.getElementById("reserver");
  let bookingVisible = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    bar.classList.toggle("is-visible", y > window.innerHeight * 0.6 && !bookingVisible);
  };
  new IntersectionObserver(([e]) => { bookingVisible = e.isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(booking);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Menu mobile */
  const toggle = document.querySelector(".menu-toggle");
  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? T.menuClose : T.menuOpen);
    toggle.innerHTML = open
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  };
  toggle.addEventListener("click", () => setMenu(!header.classList.contains("menu-open")));
  document.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && header.classList.contains("menu-open")) { setMenu(false); toggle.focus(); } });

  /* Apparitions au défilement */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Galerie */
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector("img");
  const lbCount = lb.querySelector(".lb-count");
  const items = [...document.querySelectorAll("#gallery button")];
  let current = 0;
  const show = (i) => {
    current = (i + items.length) % items.length;
    const btn = items[current];
    lbImg.src = btn.dataset.full;
    lbImg.alt = btn.querySelector("img").alt;
    lbCount.textContent = T.count(current + 1, items.length);
  };
  items.forEach((btn, i) => btn.addEventListener("click", () => { show(i); lb.showModal(); }));
  lb.querySelector(".lb-close").addEventListener("click", () => lb.close());
  lb.querySelector(".lb-prev").addEventListener("click", () => show(current - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => show(current + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("close", () => items[current].focus());
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ------------------------------------------------------------------ */
  /* Réservation                                                         */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById("booking-form");
  const f = form.elements;
  const $ = (id) => document.getElementById(id);
  const summary = $("form-summary");
  const planner = $("planner");
  const manualWhen = $("manual-when");
  const status = $("planner-status");
  const monthTabs = $("month-tabs");
  const dayGrid = $("day-grid");
  const timeGrid = $("time-grid");
  const submitBtn = $("submit-btn");

  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const dateOf = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const longDate = (s, withYear) => dateOf(s).toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });
  const brusselsNow = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  const shiftStamp = (stamp, minutes) => {
    const [d, t] = stamp.split("T");
    const [y, mo, da] = d.split("-").map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, da) + (toMin(t) + minutes) * 60000);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
  };

  let avail = null;
  let mode = API ? "planner" : "manual";
  let month = "";   // AAAA-MM affiché
  let selDate = "";
  let selTime = "";

  const rideMinutes = () => (RIDES[f.ride.value] || { minutes: 60 }).minutes;

  /* Cases Formule et Personnes */
  function bindTiles(container, input, onChange) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest(".tile");
      if (!b) return;
      input.value = b.dataset.value;
      container.querySelectorAll(".tile").forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
      onChange();
    });
  }
  const selectRide = (value) => {
    f.ride.value = value;
    $("ride-picks").querySelectorAll(".tile").forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.value === value)));
    setError("ride", "");
    refreshPlanner();
  };
  bindTiles($("ride-picks"), f.ride, () => { setError("ride", ""); refreshPlanner(); });
  bindTiles($("people-picks"), f.people, () => setError("people", ""));
  document.querySelectorAll("[data-ride]").forEach((a) => a.addEventListener("click", () => selectRide(a.dataset.ride)));

  /* Disponibilités */
  function freeStarts(date, minutes) {
    const a = avail;
    const earliest = shiftStamp(a.now, a.minNoticeHours * 60);
    const busy = a.busy[date] || [];
    const out = [];
    for (let s = toMin(a.open); s + minutes <= toMin(a.close); s += a.step) {
      const e = s + minutes;
      const t = fromMin(s);
      if (`${date}T${t}` < earliest) continue;
      if (busy.some(([bs, be]) => bs < e + a.buffer && s < be + a.buffer)) continue;
      out.push(t);
    }
    return out;
  }

  function renderMonths() {
    const months = [...new Set(avail.days.map((d) => d.slice(0, 7)))];
    if (!months.includes(month)) {
      const firstFree = avail.days.find((d) => freeStarts(d, rideMinutes()).length);
      month = (firstFree || avail.days[0] || "").slice(0, 7);
    }
    monthTabs.hidden = months.length < 2;
    monthTabs.innerHTML = months.map((m) => {
      const label = dateOf(`${m}-01`).toLocaleDateString(T.locale, { month: "long" });
      return `<button type="button" class="month-tab" data-month="${m}" aria-pressed="${m === month}">${label}</button>`;
    }).join("");
  }

  function renderDays() {
    if (!avail.days.length) { dayGrid.innerHTML = `<p class="time-empty">${T.noDays}</p>`; return; }
    const minutes = rideMinutes();
    dayGrid.innerHTML = avail.days.filter((d) => d.startsWith(month)).map((d) => {
      const n = freeStarts(d, minutes).length;
      const dt = dateOf(d);
      const dow = dt.toLocaleDateString(T.locale, { weekday: "short" }).replace(".", "");
      return `<button type="button" class="tile day-tile" data-date="${d}" aria-pressed="${d === selDate}" ${n ? "" : "disabled"} aria-label="${longDate(d)}, ${T.starts(n)}">` +
        `<span class="day-dow" aria-hidden="true">${dow}</span><span class="day-num" aria-hidden="true">${dt.getDate()}</span><span class="day-info" aria-hidden="true">${T.starts(n)}</span></button>`;
    }).join("");
  }

  function renderTimes() {
    if (!f.ride.value) { timeGrid.innerHTML = `<p class="time-empty">${T.pickRideFirst}</p>`; return; }
    if (!selDate) { timeGrid.innerHTML = `<p class="time-empty">${T.pickDayFirst}</p>`; return; }
    const minutes = rideMinutes();
    timeGrid.innerHTML = freeStarts(selDate, minutes).map((t) =>
      `<button type="button" class="tile time-tile" data-time="${t}" aria-pressed="${t === selTime}"><span class="tick" aria-hidden="true"></span>` +
      `<span class="tile-main">${T.time(t)}</span><span class="tile-sub">${T.back(T.time(fromMin(toMin(t) + minutes)))}</span></button>`
    ).join("");
  }

  function refreshPlanner() {
    if (mode !== "planner" || !avail) return;
    const minutes = rideMinutes();
    if (selDate && !freeStarts(selDate, minutes).length) { selDate = ""; selTime = ""; }
    if (selTime && !freeStarts(selDate, minutes).includes(selTime)) selTime = "";
    f.date.value = selDate;
    f.time.value = selTime;
    renderMonths();
    renderDays();
    renderTimes();
  }

  async function loadAvailability() {
    if (!avail) status.textContent = T.loading;
    const res = await fetch(API, { method: "GET", cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error("availability");
    avail = { ...DEFAULTS, ...data };
    status.textContent = "";
    planner.hidden = false;
    refreshPlanner();
  }

  function useManual() {
    mode = "manual";
    planner.hidden = true;
    manualWhen.hidden = false;
    f.date.min = brusselsNow().slice(0, 10);
  }

  if (API) {
    manualWhen.hidden = true;
    loadAvailability().catch(() => { status.textContent = T.loadFail; useManual(); });
  } else {
    useManual();
  }

  monthTabs.addEventListener("click", (e) => {
    const b = e.target.closest(".month-tab");
    if (!b) return;
    month = b.dataset.month;
    refreshPlanner();
  });
  dayGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".day-tile");
    if (!b || b.disabled) return;
    selDate = b.dataset.date;
    selTime = "";
    setError("when", "");
    refreshPlanner();
    dayGrid.querySelector(`[data-date="${selDate}"]`).focus();
  });
  timeGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".time-tile");
    if (!b) return;
    selTime = b.dataset.time;
    setError("when", "");
    refreshPlanner();
    timeGrid.querySelector(`[data-time="${selTime}"]`).focus();
  });

  /* Validation */
  function setError(name, msg) {
    const out = $(`${name}-error`);
    if (out) out.textContent = msg;
    const el = { name: f.name, phone: f.phone, email: f.email }[name];
    if (el) el.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validate() {
    const errs = {};
    if (!RIDES[f.ride.value]) errs.ride = T.errors.ride;
    const p = Number(f.people.value);
    if (!Number.isInteger(p) || p < 1 || p > 5) errs.people = T.errors.people;
    if (mode === "planner") {
      if (!selDate || !selTime) errs.when = T.errors.whenPlanner;
    } else {
      const t = f.time.value;
      const lastStart = toMin(DEFAULTS.close) - rideMinutes();
      if (!f.date.value || !t || `${f.date.value}T${t}` < brusselsNow() || toMin(t) > lastStart) errs.when = T.errors.whenManual;
    }
    if (f.name.value.trim().length < 2) errs.name = T.errors.name;
    if (f.phone.value.replace(/\D/g, "").length < 8) errs.phone = T.errors.phone;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errs.email = T.errors.email;
    ["ride", "people", "when", "name", "phone", "email"].forEach((n) => setError(n, errs[n] || ""));
    return errs;
  }

  ["name", "phone", "email", "date", "time"].forEach((n) => {
    const re = () => { if (summary.textContent) validate(); };
    f[n].addEventListener("blur", re);
    f[n].addEventListener("change", re);
  });

  function focusFirstError(keys) {
    const k = keys[0];
    const target = {
      ride: $("ride-picks").querySelector(".tile"),
      people: $("people-picks").querySelector(".tile"),
      when: mode === "planner" ? (timeGrid.querySelector(".tile") || dayGrid.querySelector(".tile:not(:disabled)")) : f.date
    }[k] || f[k];
    if (target) { target.focus(); target.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }

  function payload() {
    return {
      ride: f.ride.value,
      people: Number(f.people.value),
      date: mode === "planner" ? selDate : f.date.value,
      time: mode === "planner" ? selTime : f.time.value,
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      message: f.message.value.trim(),
      website: f.website.value,
      lang
    };
  }

  const btnLabel = submitBtn.querySelector("span").textContent;
  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", String(busy));
    submitBtn.querySelector("span").textContent = busy ? T.sending : btnLabel;
  }

  function showDone(ref, d) {
    $("done-text").textContent = T.done(ref, RIDES[d.ride][lang], longDate(d.date, true), T.time(d.time), d.people);
    $("form-main").hidden = true;
    const done = $("form-done");
    done.hidden = false;
    done.focus();
    done.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function mailFallback(d) {
    const L = T.labels;
    const sep = lang === "fr" ? " : " : ": ";
    const lines = [
      T.intro, "",
      `${L.ride}${sep}${RIDES[d.ride][lang]}`,
      `${L.people}${sep}${d.people}`,
      `${L.date}${sep}${longDate(d.date, true)}`,
      `${L.time}${sep}${T.time(d.time)}`,
      `${L.name}${sep}${d.name}`,
      `${L.phone}${sep}${d.phone}`,
      `${L.email}${sep}${d.email}`
    ];
    if (d.message) lines.push("", d.message);
    window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(T.mailSubject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errs = validate();
    const keys = Object.keys(errs);
    if (keys.length) {
      summary.textContent = T.errors.summary;
      focusFirstError(keys);
      return;
    }
    summary.textContent = "";
    const d = payload();
    if (mode !== "planner") { mailFallback(d); return; }

    setBusy(true);
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(d) });
      const out = await res.json();
      if (out.ok) {
        showDone(out.ref, d);
        loadAvailability().catch(() => {});
      } else {
        summary.textContent = T.errors[out.error] || T.errors.generic;
        if (["taken", "closed", "date", "time"].includes(out.error)) {
          selTime = "";
          await loadAvailability().catch(() => {});
          setError("when", T.errors.whenPlanner);
        }
      }
    } catch (err) {
      summary.textContent = T.errors.generic;
    } finally {
      setBusy(false);
    }
  });

  $("new-request").addEventListener("click", () => {
    form.reset();
    f.ride.value = "";
    f.people.value = "2";
    $("ride-picks").querySelectorAll(".tile").forEach((t) => t.setAttribute("aria-pressed", "false"));
    $("people-picks").querySelectorAll(".tile").forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.value === "2")));
    selDate = "";
    selTime = "";
    $("form-done").hidden = true;
    $("form-main").hidden = false;
    refreshPlanner();
    $("ride-picks").querySelector(".tile").focus();
  });
})();
