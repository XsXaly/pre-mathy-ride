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
  const DEFAULTS = { open: "09:00", lastStart: "17:00", step: 60, buffer: 30, minNoticeHours: 12, maxPeople: 5, days: [], busy: {} };
  // Jours ouverts quand le planning n'est pas joignable : week-ends et congés scolaires FWB (même liste que le Sheet)
  const OPEN_WEEKDAYS = [6, 0];
  const HOLIDAYS = [
    ["2026-10-19", "2026-11-02"], ["2026-11-11", "2026-11-11"], ["2026-12-21", "2027-01-01"], ["2027-02-22", "2027-03-05"],
    ["2027-03-29", "2027-03-29"], ["2027-04-26", "2027-05-07"], ["2027-05-17", "2027-05-17"], ["2027-07-03", "2027-08-29"]
  ];
  const HORIZON_DAYS = 90;

  const T = {
    fr: {
      errors: {
        ride: "Choisissez une formule.",
        people: "Choisissez le nombre de personnes (5 maximum).",
        name: "Indiquez votre nom.",
        phone: "Indiquez un numéro de téléphone valide.",
        email: "Indiquez une adresse e-mail valide.",
        whenPlanner: "Choisissez un jour et une heure de départ.",
        summary: "Il manque quelques informations : corrigez les champs signalés en rouge.",
        taken: "Ce créneau vient d’être réservé. Choisissez-en un autre, les disponibilités sont à jour.",
        closed: "Ce jour n’est pas ouvert à la réservation. Choisissez-en un autre.",
        busy: "Le planning est très sollicité. Réessayez dans quelques secondes.",
        generic: `L’envoi n’a pas abouti. Réessayez, ou appelez-nous au ${PHONE_DISPLAY}.`
      },
      sending: "Envoi en cours…",
      noDays: `Aucun jour libre pour le moment. Appelez-nous au ${PHONE_DISPLAY}.`,
      pickRideFirst: "Choisissez d’abord une formule.",
      pickDayFirst: "Choisissez d’abord un jour.",
      full: "Complet",
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
        summary: "A few details are missing: please fix the fields marked in red.",
        taken: "This time slot has just been booked. Please pick another one, availability is up to date.",
        closed: "This day is not open for booking. Please pick another one.",
        busy: "The planner is busy right now. Please try again in a few seconds.",
        generic: `Your request could not be sent. Please try again, or call us on ${PHONE_DISPLAY}.`
      },
      sending: "Sending…",
      noDays: `No free days at the moment. Please call us on ${PHONE_DISPLAY}.`,
      pickRideFirst: "Choose a ride first.",
      pickDayFirst: "Choose a day first.",
      full: "Full",
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
  const dayGrid = $("day-grid");
  const timeGrid = $("time-grid");
  const daysPrev = $("days-prev");
  const daysNext = $("days-next");
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

  // Disponibilités calculées sur place (sans planning) : week-ends et congés scolaires, aucun créneau pris
  function localAvailability() {
    const now = brusselsNow();
    const days = [];
    for (let i = 0; i <= HORIZON_DAYS; i++) {
      const d = shiftStamp(`${now.slice(0, 10)}T12:00`, i * 1440).slice(0, 10);
      const [y, m, da] = d.split("-").map(Number);
      const wd = new Date(Date.UTC(y, m - 1, da)).getUTCDay();
      if (OPEN_WEEKDAYS.includes(wd) || HOLIDAYS.some(([a, b]) => d >= a && d <= b)) days.push(d);
    }
    return { ...DEFAULTS, now, days };
  }

  let avail = localAvailability();
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

  /* Créneaux libres : départs à heure pleine, 30 minutes d'écart avec les autres réservations */
  function freeStarts(date, minutes) {
    const a = avail;
    const earliest = shiftStamp(a.now, a.minNoticeHours * 60);
    const busy = a.busy[date] || [];
    const out = [];
    for (let s = toMin(a.open); s <= toMin(a.lastStart); s += a.step) {
      const e = s + minutes;
      const t = fromMin(s);
      if (`${date}T${t}` < earliest) continue;
      if (busy.some(([bs, be]) => bs < e + a.buffer && s < be + a.buffer)) continue;
      out.push(t);
    }
    return out;
  }

  function renderDays() {
    // Les jours déjà passés pour aujourd'hui (délai minimum) disparaissent ; les jours pleins restent affichés « Complet »
    const days = avail.days.filter((d) => freeStarts(d, 60).length || (avail.busy[d] || []).length);
    if (!days.length) { dayGrid.innerHTML = `<p class="time-empty">${T.noDays}</p>`; updateArrows(); return; }
    const minutes = rideMinutes();
    const keep = dayGrid.scrollLeft;
    dayGrid.innerHTML = days.map((d) => {
      const n = freeStarts(d, minutes).length;
      const dt = dateOf(d);
      const dow = dt.toLocaleDateString(T.locale, { weekday: "short" }).replace(".", "");
      const mon = dt.toLocaleDateString(T.locale, { month: "short" });
      return `<button type="button" class="tile day-tile" data-date="${d}" aria-pressed="${d === selDate}" ${n ? "" : "disabled"} aria-label="${longDate(d)}${n ? "" : ", " + T.full}">` +
        `<span class="day-dow" aria-hidden="true">${dow}</span><span class="day-num" aria-hidden="true">${dt.getDate()}</span>` +
        `<span class="${n ? "day-month" : "day-info"}" aria-hidden="true">${n ? mon : T.full}</span></button>`;
    }).join("");
    dayGrid.scrollLeft = keep;
    updateArrows();
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
    const minutes = rideMinutes();
    if (selDate && !freeStarts(selDate, minutes).length) { selDate = ""; selTime = ""; }
    if (selTime && !freeStarts(selDate, minutes).includes(selTime)) selTime = "";
    f.date.value = selDate;
    f.time.value = selTime;
    renderDays();
    renderTimes();
  }

  function updateArrows() {
    const max = dayGrid.scrollWidth - dayGrid.clientWidth;
    daysPrev.disabled = dayGrid.scrollLeft <= 4;
    daysNext.disabled = dayGrid.scrollLeft >= max - 4;
  }
  dayGrid.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  daysPrev.addEventListener("click", () => dayGrid.scrollBy({ left: -dayGrid.clientWidth * 0.8 }));
  daysNext.addEventListener("click", () => dayGrid.scrollBy({ left: dayGrid.clientWidth * 0.8 }));

  async function loadAvailability() {
    const res = await fetch(API, { method: "GET", cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error("availability");
    avail = { ...DEFAULTS, ...data };
    refreshPlanner();
  }

  refreshPlanner();
  if (API) loadAvailability().catch(() => {});

  dayGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".day-tile");
    if (!b || b.disabled) return;
    selDate = b.dataset.date;
    selTime = "";
    setError("when", "");
    refreshPlanner();
    dayGrid.querySelector(`[data-date="${selDate}"]`).focus({ preventScroll: true });
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
    if (!selDate || !selTime) errs.when = T.errors.whenPlanner;
    if (f.name.value.trim().length < 2) errs.name = T.errors.name;
    if (f.phone.value.replace(/\D/g, "").length < 8) errs.phone = T.errors.phone;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errs.email = T.errors.email;
    ["ride", "people", "when", "name", "phone", "email"].forEach((n) => setError(n, errs[n] || ""));
    return errs;
  }

  ["name", "phone", "email"].forEach((n) => {
    const re = () => { if (summary.textContent) validate(); };
    f[n].addEventListener("blur", re);
    f[n].addEventListener("change", re);
  });

  function focusFirstError(keys) {
    const k = keys[0];
    const target = {
      ride: $("ride-picks").querySelector(".tile"),
      people: $("people-picks").querySelector(".tile"),
      when: timeGrid.querySelector(".tile") || dayGrid.querySelector(".tile:not(:disabled)")
    }[k] || f[k];
    if (target) { target.focus(); target.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }

  function payload() {
    return {
      ride: f.ride.value,
      people: Number(f.people.value),
      date: selDate,
      time: selTime,
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
    if (!API) { mailFallback(d); return; }

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
