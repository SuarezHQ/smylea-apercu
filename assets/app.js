/* Smylea — menu, formulaire de devis en étapes, simulateur d'économies. Aucun framework. */
(function () {
  "use strict";
  var cfg = window.SMYLEA || {};
  var dl = (window.dataLayer = window.dataLayer || []);
  function track(event, data) { try { dl.push(Object.assign({ event: event }, data || {})); } catch (e) {} }

  // Menu mobile
  var burger = document.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".nav-drop > button").forEach(function (b) {
    b.addEventListener("click", function () {
      var p = b.parentElement, open = p.classList.toggle("open");
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-drop.open").forEach(function (d) {
      if (!d.contains(e.target) && window.innerWidth > 900) { d.classList.remove("open"); }
    });
  });

  // Clics WhatsApp / téléphone (pour Google Ads / Meta via GTM)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href");
    if (h.indexOf("wa.me") > -1) track("whatsapp_click", { link_location: a.dataset.loc || "page" });
    else if (h.indexOf("tel:") === 0) track("phone_click", { link_location: a.dataset.loc || "page" });
  });

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;

  // Apparitions : simple fondu + 12 px, échelonnées de 70 ms dans un même groupe
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !still) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; })
        .sort(function (x, y) { return x.boundingClientRect.top - y.boundingClientRect.top || x.boundingClientRect.left - y.boundingClientRect.left; });
      batch.forEach(function (en, i) {
        en.target.style.setProperty("--d", Math.min(i, 4) * 0.07 + "s");
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Vidéos d'ambiance : chargées et lues seulement à l'écran, en pause sinon
  function load(v) {
    if (v.dataset.loaded) return;
    var src = v.dataset.srcLg && window.innerWidth > 900 ? v.dataset.srcLg : v.dataset.src;
    v.src = src; v.dataset.loaded = "1";
  }
  var ambient = document.querySelectorAll("video.vid[data-src]");
  var autoplayOk = !still && !saveData;
  if (autoplayOk && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && !v.dataset.userPaused) { load(v); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { rootMargin: "200px 0px" });
    ambient.forEach(function (v) { vio.observe(v); });
  }
  // Bouton pause du hero (accessibilité : toute vidéo qui bouge seule doit pouvoir s'arrêter)
  var heroVid = document.querySelector(".vid--hero");
  var toggle = document.querySelector(".vid-toggle");
  if (toggle && heroVid) {
    if (!autoplayOk) toggle.classList.add("is-paused");
    toggle.addEventListener("click", function () {
      if (heroVid.paused) { load(heroVid); delete heroVid.dataset.userPaused; heroVid.play(); toggle.classList.remove("is-paused"); toggle.setAttribute("aria-label", "Mettre la vidéo en pause"); toggle.setAttribute("aria-pressed", "false"); }
      else { heroVid.pause(); heroVid.dataset.userPaused = "1"; toggle.classList.add("is-paused"); toggle.setAttribute("aria-label", "Lire la vidéo"); toggle.setAttribute("aria-pressed", "true"); }
    });
  }
  // Témoignage : lecture au clic, avec le son et les contrôles
  document.querySelectorAll("[data-player]").forEach(function (pl) {
    var v = pl.querySelector("video"), b = pl.querySelector(".play-btn");
    b.addEventListener("click", function () {
      load(v); v.controls = true; v.muted = false;
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      pl.classList.add("is-playing");
      track("video_play", { video: "temoignage" });
    });
  });

  // En-tête : passe en fond nuit dès qu'on quitte le ciel
  var header = document.querySelector(".header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Sans formulaire sur la page, « Obtenir mon devis » mène à la page devis
  if (!document.getElementById("devis")) {
    document.querySelectorAll('a[href="#devis"]').forEach(function (a) { a.setAttribute("href", (cfg.base || "") + "/devis-gratuit/"); });
  }

  // Formulaire de devis (carte d'embarquement)
  document.querySelectorAll("form.quote").forEach(function (form) {
    var err = form.querySelector(".q-error");
    var started = false;
    form.addEventListener("input", function () {
      if (!started) { started = true; track("quote_start", { form_location: form.dataset.loc || "page" }); }
    });

    function summary(fd) {
      var lines = [
        "Bonjour Smylea, je souhaite un devis gratuit.",
        "Soin : " + (fd.get("soin") || "-"),
        "Départ : " + (fd.get("depart") || "-"),
        "Période : " + (fd.get("periode") || "-"),
        "Prénom : " + (fd.get("prenom") || "-")
      ];
      return lines.join("\n");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        if (err) { err.textContent = "Merci d’indiquer votre prénom, le soin souhaité, un téléphone valide et d’accepter d’être recontacté(e)."; err.classList.remove("hidden"); }
        var bad = form.querySelector(":invalid:not(fieldset)"); if (bad) bad.focus();
        return;
      }
      if (err) err.classList.add("hidden");
      var fd = new FormData(form);
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Envoi…"; }
      try { sessionStorage.setItem("smylea_devis", summary(fd)); } catch (x) {}
      fetch((cfg.base || "") + "/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fd).toString() })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          track("generate_lead", { form_location: form.dataset.loc || "page", soin: fd.get("soin") });
          window.location.href = (cfg.base || "") + "/merci/";
        })
        .catch(function () {
          // Hébergement sans gestion de formulaires : on bascule sur WhatsApp, le message est prérempli.
          track("generate_lead", { form_location: form.dataset.loc || "page", soin: fd.get("soin"), via: "whatsapp" });
          window.location.href = "https://wa.me/" + cfg.wa + "?text=" + encodeURIComponent(summary(fd));
        });
    });
  });

  // Page merci : bouton WhatsApp avec le récapitulatif
  var thanks = document.querySelector("[data-wa-summary]");
  if (thanks) {
    var txt = "Bonjour Smylea, je viens de faire une demande de devis sur le site. Je vous envoie mes photos / ma radio.";
    try { var s = sessionStorage.getItem("smylea_devis"); if (s) txt = s + "\n\nJe vous envoie mes photos / ma radio."; } catch (x) {}
    thanks.href = "https://wa.me/" + cfg.wa + "?text=" + encodeURIComponent(txt);
  }

  // Simulateur d'économies
  document.querySelectorAll(".calc").forEach(function (calc) {
    var data = cfg.prices || {};
    var sel = calc.querySelector("select");
    var range = calc.querySelector('input[type="range"]');
    var qtyOut = calc.querySelector(".qty output");
    var qtyWrap = calc.querySelector(".qty-wrap");
    var outFr = calc.querySelector("[data-fr]");
    var outUs = calc.querySelector("[data-us]");
    var outSave = calc.querySelector("[data-save]");
    var outPct = calc.querySelector("[data-pct]");
    var fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
    function render() {
      var p = data[sel.value]; if (!p) return;
      var unit = p.unit !== false;
      qtyWrap.classList.toggle("hidden", !unit);
      var q = unit ? +range.value : 1;
      qtyOut.textContent = q;
      var fr = p.fr * q, us = p.price * q;
      outFr.textContent = fmt.format(fr) + " €";
      outUs.textContent = fmt.format(us) + " €";
      outSave.textContent = fmt.format(fr - us) + " €";
      if (outPct) outPct.textContent = Math.round((1 - us / fr) * 100) + " %";
    }
    sel.addEventListener("change", render);
    range.addEventListener("input", render);
    render();
  });
})();
