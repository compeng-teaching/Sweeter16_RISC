/**
 * i18n — localization for SWEETER16 Processor Simulator
 * Load after en.js and de.js
 */
(function(global) {
  const STORAGE_KEY = "s16-lang";
  let currentLang = (global.localStorage && global.localStorage.getItem(STORAGE_KEY)) || "en";
  let strings = {};

  function loadStrings(lang) {
    const mod = lang === "de" ? global.I18N_DE : global.I18N_EN;
    strings = mod || global.I18N_EN || {};
  }

  function get(path, fallback) {
    const parts = path.split(".");
    let v = strings;
    for (const p of parts) {
      v = v && v[p];
    }
    return v !== undefined && v !== null ? String(v) : (fallback !== undefined ? fallback : path);
  }

  global.t = function(key, params) {
    let s = get(key);
    if (params && typeof params === "object") {
      Object.keys(params).forEach(function(k) {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
      });
    }
    return s;
  };

  global.getCurrentLang = function() {
    return currentLang;
  };

  global.setLanguage = function(lang) {
    if (lang !== "en" && lang !== "de") return;
    currentLang = lang;
    loadStrings(lang);
    if (global.document) {
      global.document.documentElement.lang = lang === "de" ? "de" : "en";
    }
    if (global.localStorage) {
      global.localStorage.setItem(STORAGE_KEY, lang);
    }
    var btnEN = global.document && global.document.getElementById("langEN");
    var btnDE = global.document && global.document.getElementById("langDE");
    if (btnEN) { btnEN.classList.toggle("active", lang === "en"); btnEN.setAttribute("aria-pressed", lang === "en"); }
    if (btnDE) { btnDE.classList.toggle("active", lang === "de"); btnDE.setAttribute("aria-pressed", lang === "de"); }
    if (typeof global.applyTranslations === "function") {
      global.applyTranslations(lang);
    }
  };

  loadStrings(currentLang);
})(typeof window !== "undefined" ? window : this);
