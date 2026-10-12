(() => {
  const PHONE = "32467776074";
  const lang = document.documentElement.lang === "en" ? "en" : "fr";

  const T = {
    fr: {
      rides: { decouverte: "Découverte (1 h, 35\u00a0€/pers.)", exploration: "Exploration (2 h, 65\u00a0€/pers.)", adrenaline: "Adrénaline (1 h, 45\u00a0€/pers.)" },
      errors: {
        ride: "Choisissez une formule.",
        people: "Indiquez un nombre de personnes entre 1 et 20.",
        name: "Indiquez votre nom.",
        date: "Choisissez une date à partir d’aujourd’hui.",
        time: "Choisissez une heure.",
        email: "Cette adresse e-mail ne semble pas valide.",
        summary: "Il manque quelques informations\u00a0: corrigez les champs signalés en rouge."
      },
      intro: "Bonjour, je souhaite réserver une balade Pré Mathy Ride.",
      labels: { ride: "Formule", people: "Personnes", name: "Nom", date: "Date", time: "Heure", email: "E-mail", message: "Message" },
      menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu",
      count: (i, n) => `Photo ${i} sur ${n}`,
      locale: "fr-BE"
    },
    en: {
      rides: { decouverte: "Discovery (1 h, €35 pp)", exploration: "Exploration (2 h, €65 pp)", adrenaline: "Adrenaline (1 h, €45 pp)" },
      errors: {
        ride: "Please choose a ride.",
        people: "Please enter a group size between 1 and 20.",
        name: "Please enter your name.",
        date: "Please choose a date from today onwards.",
        time: "Please choose a time.",
        email: "This email address does not look valid.",
        summary: "A few details are missing: please fix the fields marked in red."
      },
      intro: "Hello, I would like to book a Pré Mathy Ride tour.",
      labels: { ride: "Ride", people: "People", name: "Name", date: "Date", time: "Time", email: "Email", message: "Message" },
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

  /* Formulaire de réservation */
  const form = document.getElementById("booking-form");
  const f = form.elements;
  const summary = document.getElementById("form-summary");
  const today = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  f.date.min = iso(today);

  document.querySelectorAll("[data-ride]").forEach((a) => a.addEventListener("click", () => {
    f.ride.value = a.dataset.ride;
    setError("ride", "");
  }));

  function setError(name, msg) {
    const el = f[name];
    const out = document.getElementById(`${name}-error`);
    if (out) out.textContent = msg;
    el.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validate() {
    const errs = {};
    if (!f.ride.value) errs.ride = T.errors.ride;
    const p = Number(f.people.value);
    if (!Number.isInteger(p) || p < 1 || p > 20) errs.people = T.errors.people;
    if (f.name.value.trim().length < 2) errs.name = T.errors.name;
    if (!f.date.value || f.date.value < iso(today)) errs.date = T.errors.date;
    if (!f.time.value) errs.time = T.errors.time;
    if (f.email.value.trim() && !f.email.checkValidity()) errs.email = T.errors.email;
    ["ride", "people", "name", "date", "time", "email"].forEach((n) => setError(n, errs[n] || ""));
    return errs;
  }

  ["ride", "people", "name", "date", "time", "email"].forEach((n) => {
    f[n].addEventListener("blur", () => { if (f[n].getAttribute("aria-invalid") === "true") validate(); });
    f[n].addEventListener("change", () => { if (f[n].getAttribute("aria-invalid") === "true") validate(); });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const errs = validate();
    const keys = Object.keys(errs);
    if (keys.length) {
      summary.textContent = T.errors.summary;
      f[keys[0]].focus();
      return;
    }
    summary.textContent = "";
    const date = new Date(`${f.date.value}T12:00:00`).toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const L = T.labels;
    const lines = [
      T.intro,
      "",
      `${L.ride} : ${T.rides[f.ride.value]}`,
      `${L.people} : ${f.people.value}`,
      `${L.date} : ${date}`,
      `${L.time} : ${lang === "fr" ? f.time.value.replace(":", " h ") : f.time.value}`,
      `${L.name} : ${f.name.value.trim()}`
    ];
    if (f.email.value.trim()) lines.push(`${L.email} : ${f.email.value.trim()}`);
    if (f.message.value.trim()) lines.push("", f.message.value.trim());
    const text = lines.join("\n").replace(/ : /g, lang === "fr" ? " : " : ": ");
    const channel = e.submitter ? e.submitter.dataset.channel : "whatsapp";
    const url = channel === "sms"
      ? `sms:+${PHONE}?&body=${encodeURIComponent(text)}`
      : `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
    if (channel === "sms") window.location.href = url;
    else window.open(url, "_blank", "noopener");
  });
})();
