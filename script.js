(() => {
  /* Adresse de l'application web Google Apps Script (planning). Vide = envoi par e-mail classique. */
  const API = "";
  const FALLBACK_EMAIL = "location@mathyridee.net";
  const PHONE_DISPLAY = "+32 467 77 60 74";

  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const RIDES = {
    decouverte: { minutes: 60, fr: "Découverte", en: "Discovery", price: 35 },
    exploration: { minutes: 120, fr: "Exploration", en: "Exploration", price: 65 },
    adrenaline: { minutes: 60, fr: "Adrénaline", en: "Adrenaline", price: 45 }
  };
  const DEFAULTS = { open: "09:00", close: "17:30", step: 30, minNoticeHours: 12, horizonDays: 90, maxPeople: 5 };

  const T = {
    fr: {
      errors: {
        ride: "Choisissez une formule.",
        people: "Le nombre de personnes doit être compris entre 1 et 5.",
        name: "Indiquez votre nom.",
        phone: "Indiquez un numéro de téléphone valide.",
        email: "Indiquez une adresse e-mail valide.",
        whenPlanner: "Choisissez un jour puis un créneau libre dans le calendrier.",
        whenManual: "Choisissez une date à venir et une heure de départ entre 9 h et 16 h 30.",
        summary: "Il manque quelques informations : corrigez les champs signalés en rouge.",
        taken: "Ce créneau vient d’être réservé par quelqu’un d’autre. Choisissez-en un autre, le calendrier est à jour.",
        closed: "Ce jour est fermé. Choisissez une autre date.",
        busy: "Le planning est très sollicité. Réessayez dans quelques secondes.",
        generic: `L’envoi n’a pas abouti. Réessayez, ou appelez-nous au ${PHONE_DISPLAY}.`
      },
      loading: "Chargement des disponibilités…",
      loadFail: "Le calendrier n’a pas pu être chargé. Indiquez la date et l’heure souhaitées ci-dessous.",
      sending: "Envoi en cours…",
      pickRide: "Choisissez d’abord une formule pour voir les horaires disponibles.",
      slotsTitle: (d, m) => `Départs possibles le ${d} (balade de ${m / 60} h)`,
      noSlots: "Plus aucun créneau libre ce jour-là.",
      dayLabel: (d, n) => n > 0 ? `${d}, ${n} créneau${n > 1 ? "x" : ""} libre${n > 1 ? "s" : ""}` : `${d}, complet ou fermé`,
      done: (r, ride, d, t, p) => `Référence ${r} : ${ride}, le ${d} à ${t}, pour ${p} personne${p > 1 ? "s" : ""}.`,
      fallbackNote: "Votre demande s’ouvre dans votre messagerie, prête à être envoyée à l’équipe Pré Mathy Ride.",
      mailSubject: "Demande de réservation Pré Mathy Ride",
      intro: "Bonjour, je souhaite réserver une balade Pré Mathy Ride.",
      labels: { ride: "Formule", people: "Personnes", date: "Date", time: "Heure", name: "Nom", phone: "Téléphone", email: "E-mail" },
      time: (t) => t.replace(/^0/, "").replace(":", " h "),
      dow: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
      menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu",
      count: (i, n) => `Photo ${i} sur ${n}`,
      locale: "fr-BE"
    },
    en: {
      errors: {
        ride: "Please choose a ride.",
        people: "The group size must be between 1 and 5.",
        name: "Please enter your name.",
        phone: "Please enter a valid phone number.",
        email: "Please enter a valid email address.",
        whenPlanner: "Please pick a day, then a free time slot in the calendar.",
        whenManual: "Please choose a future date and a start time between 9:00 am and 4:30 pm.",
        summary: "A few details are missing: please fix the fields marked in red.",
        taken: "Someone has just booked this time slot. Please pick another one, the calendar is up to date.",
        closed: "We are closed on this day. Please choose another date.",
        busy: "The planner is busy right now. Please try again in a few seconds.",
        generic: `Your request could not be sent. Please try again, or call us on ${PHONE_DISPLAY}.`
      },
      loading: "Loading availability…",
      loadFail: "The calendar could not be loaded. Please enter your preferred date and time below.",
      sending: "Sending…",
      pickRide: "Choose a ride first to see the available times.",
      slotsTitle: (d, m) => `Available start times on ${d} (${m / 60} h ride)`,
      noSlots: "There are no free time slots left on this day.",
      dayLabel: (d, n) => n > 0 ? `${d}, ${n} free slot${n > 1 ? "s" : ""}` : `${d}, full or closed`,
      done: (r, ride, d, t, p) => `Reference ${r}: ${ride}, on ${d} at ${t}, for ${p} ${p > 1 ? "people" : "person"}.`,
      fallbackNote: "Your request opens in your email app, ready to send to the Pré Mathy Ride team.",
      mailSubject: "Pré Mathy Ride booking request",
      intro: "Hello, I would like to book a Pré Mathy Ride tour.",
      labels: { ride: "Ride", people: "People", date: "Date", time: "Time", name: "Name", phone: "Phone", email: "Email" },
      time: (t) => t,
      dow: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
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
  /* Réservation et planning                                             */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById("booking-form");
  const f = form.elements;
  const $ = (id) => document.getElementById(id);
  const summary = $("form-summary");
  const planner = $("planner");
  const manualWhen = $("manual-when");
  const status = $("planner-status");
  const calGrid = $("cal-grid");
  const calTitle = $("cal-title");
  const slotsWrap = $("slots-wrap");
  const slotsTitle = $("slots-title");
  const slotsBox = $("slots");
  const submitBtn = $("submit-btn");

  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const longDate = (s, withYear) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });
  };
  // Heure « locale de Bruxelles » sous forme de texte comparable : AAAA-MM-JJTHH:MM
  const brusselsNow = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  const shiftStamp = (stamp, minutes) => {
    const [d, t] = stamp.split("T");
    const [y, mo, da] = d.split("-").map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, da) + (toMin(t) + minutes) * 60000);
    return `${ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
  };

  let avail = null;          // réponse du planning
  let mode = API ? "planner" : "manual";
  let view = null;           // { y, m } mois affiché
  let selDate = "";
  let selTime = "";

  const rideMinutes = () => (RIDES[f.ride.value] || { minutes: 60 }).minutes;

  function slotsFor(date, minutes) {
    const a = avail;
    const earliest = shiftStamp(a.now, a.minNoticeHours * 60);
    const closed = a.closed.includes(date);
    const busy = a.busy[date] || [];
    const out = [];
    for (let s = toMin(a.open); s + minutes <= toMin(a.close); s += a.step) {
      const e = s + minutes;
      const t = fromMin(s);
      const free = !closed && `${date}T${t}` >= earliest && !busy.some(([bs, be]) => bs < e && s < be);
      out.push({ t, free });
    }
    return out;
  }

  function renderCalendar() {
    const a = avail;
    const today = a.now.slice(0, 10);
    const last = shiftStamp(`${today}T12:00`, a.horizonDays * 1440).slice(0, 10);
    const { y, m } = view;
    const first = new Date(y, m - 1, 1, 12);
    calTitle.textContent = first.toLocaleDateString(T.locale, { month: "long", year: "numeric" });
    const [ty, tm] = today.split("-").map(Number);
    const [ly, lm] = last.split("-").map(Number);
    $("cal-prev").disabled = y * 12 + m <= ty * 12 + tm;
    $("cal-next").disabled = y * 12 + m >= ly * 12 + lm;

    const minutes = rideMinutes();
    const days = new Date(y, m, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    let html = T.dow.map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join("");
    for (let i = 0; i < offset; i++) html += '<span class="cal-day blank" aria-hidden="true"></span>';
    for (let d = 1; d <= days; d++) {
      const date = ymd(y, m, d);
      const inRange = date >= today && date <= last;
      let cls = "is-out";
      let free = 0;
      if (inRange) {
        const slots = slotsFor(date, minutes);
        free = slots.filter((s) => s.free).length;
        cls = free === 0 ? "is-full" : free <= 2 ? "is-few" : "is-free";
      }
      const disabled = !inRange || free === 0;
      html += `<button type="button" class="cal-day ${cls}" data-date="${date}" aria-pressed="${date === selDate}" ${disabled ? "disabled" : ""} aria-label="${T.dayLabel(longDate(date), free)}">${d}</button>`;
    }
    calGrid.innerHTML = html;
  }

  function renderSlots() {
    if (!selDate) { slotsWrap.hidden = true; return; }
    slotsWrap.hidden = false;
    if (!f.ride.value) {
      slotsTitle.textContent = T.pickRide;
      slotsBox.innerHTML = "";
      return;
    }
    const minutes = rideMinutes();
    const slots = slotsFor(selDate, minutes);
    slotsTitle.textContent = T.slotsTitle(longDate(selDate), minutes);
    if (!slots.some((s) => s.free)) {
      slotsBox.innerHTML = `<p class="planner-status">${T.noSlots}</p>`;
      return;
    }
    slotsBox.innerHTML = slots.map((s) => `<button type="button" class="slot" data-time="${s.t}" aria-pressed="${s.t === selTime}" ${s.free ? "" : "disabled"}>${T.time(s.t)}</button>`).join("");
  }

  function syncSelection() {
    // Si le créneau choisi n'est plus libre (autre formule, autre réservation), on l'efface.
    if (selDate && selTime && !slotsFor(selDate, rideMinutes()).some((s) => s.t === selTime && s.free)) selTime = "";
    if (selDate && !slotsFor(selDate, rideMinutes()).some((s) => s.free)) { selDate = ""; selTime = ""; }
    f.date.value = selDate;
    f.time.value = selTime;
  }

  function refreshPlanner() {
    if (mode !== "planner" || !avail) return;
    syncSelection();
    renderCalendar();
    renderSlots();
  }

  async function loadAvailability() {
    status.textContent = T.loading;
    const res = await fetch(API, { method: "GET", cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error("availability");
    avail = { ...DEFAULTS, ...data };
    if (!view) {
      const [y, m] = avail.now.split("-").map(Number);
      view = { y, m };
    }
    status.textContent = "";
    refreshPlanner();
  }

  function useManual() {
    mode = "manual";
    planner.hidden = true;
    manualWhen.hidden = false;
    const now = brusselsNow();
    f.date.min = now.slice(0, 10);
  }

  if (API) {
    manualWhen.hidden = true;
    planner.hidden = false;
    loadAvailability().catch(() => { status.textContent = T.loadFail; useManual(); });
  } else {
    useManual();
    form.querySelector(".form-note").textContent = T.fallbackNote;
  }

  calGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".cal-day");
    if (!b || b.disabled) return;
    selDate = b.dataset.date;
    selTime = "";
    setError("when", "");
    refreshPlanner();
    const first = slotsBox.querySelector(".slot:not(:disabled)");
    if (first && window.matchMedia("(max-width: 899px)").matches) slotsWrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  slotsBox.addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    selTime = b.dataset.time;
    setError("when", "");
    refreshPlanner();
    slotsBox.querySelector(`[data-time="${selTime}"]`).focus();
  });
  $("cal-prev").addEventListener("click", () => { view.m === 1 ? (view = { y: view.y - 1, m: 12 }) : view.m--; renderCalendar(); });
  $("cal-next").addEventListener("click", () => { view.m === 12 ? (view = { y: view.y + 1, m: 1 }) : view.m++; renderCalendar(); });
  f.ride.addEventListener("change", () => { setError("ride", ""); refreshPlanner(); });

  document.querySelectorAll("[data-ride]").forEach((a) => a.addEventListener("click", () => {
    f.ride.value = a.dataset.ride;
    setError("ride", "");
    refreshPlanner();
  }));

  /* Validation */
  function setError(name, msg) {
    const out = $(`${name}-error`);
    if (out) out.textContent = msg;
    const targets = name === "when" ? (mode === "planner" ? [] : [f.date, f.time]) : [f[name]];
    targets.forEach((el) => el.setAttribute("aria-invalid", msg ? "true" : "false"));
  }

  function validate() {
    const errs = {};
    if (!RIDES[f.ride.value]) errs.ride = T.errors.ride;
    const p = Number(f.people.value);
    if (!Number.isInteger(p) || p < 1 || p > 5) errs.people = T.errors.people;
    if (mode === "planner") {
      if (!selDate || !selTime) errs.when = T.errors.whenPlanner;
    } else {
      const now = brusselsNow();
      const t = f.time.value;
      const lastStart = toMin(DEFAULTS.close) - rideMinutes();
      if (!f.date.value || !t || `${f.date.value}T${t}` < now || toMin(t) < toMin(DEFAULTS.open) || toMin(t) > lastStart) errs.when = T.errors.whenManual;
    }
    if (f.name.value.trim().length < 2) errs.name = T.errors.name;
    if (f.phone.value.replace(/\D/g, "").length < 8) errs.phone = T.errors.phone;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errs.email = T.errors.email;
    ["ride", "people", "when", "name", "phone", "email"].forEach((n) => setError(n, errs[n] || ""));
    return errs;
  }

  ["ride", "people", "name", "phone", "email", "date", "time"].forEach((n) => {
    const re = () => { if (summary.textContent) validate(); };
    f[n].addEventListener("blur", re);
    f[n].addEventListener("change", re);
  });

  function focusFirstError(keys) {
    const k = keys[0];
    if (k === "when") (mode === "planner" ? (calGrid.querySelector(".cal-day:not(:disabled)") || calGrid) : f.date).focus();
    else f[k].focus();
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

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", String(busy));
    submitBtn.querySelector("span").textContent = busy ? T.sending : submitBtn.dataset.label;
  }
  submitBtn.dataset.label = submitBtn.querySelector("span").textContent;

  function showDone(ref, d) {
    const ride = RIDES[d.ride][lang];
    $("done-text").textContent = T.done(ref, ride, longDate(d.date, true), T.time(d.time), d.people);
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
        if (out.error === "taken" || out.error === "closed" || out.error === "date" || out.error === "time") {
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
    selDate = "";
    selTime = "";
    $("form-done").hidden = true;
    $("form-main").hidden = false;
    refreshPlanner();
    f.ride.focus();
  });
})();
