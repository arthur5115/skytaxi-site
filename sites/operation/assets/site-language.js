const storageKey = "hutoupi-language";

function savedLanguage() {
  try { return localStorage.getItem(storageKey); }
  catch { return null; }
}

const query = new URLSearchParams(location.search).get("lang");
let language = (query === "en" || query === "zh" ? query : savedLanguage()) === "en" ? "en" : "zh";
const listeners = new Set();

export const getLanguage = () => language;
export const text = (zh, en) => language === "en" ? en : zh;

export function sectionUrl(path, parameters = {}) {
  const url = new URL(path, location.origin);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  url.searchParams.set("lang", language);
  return url.pathname + url.search + url.hash;
}

export function onLanguageChange(listener) {
  listeners.add(listener);
}

const translations = [
  ["data-en", "textContent"],
  ["data-en-aria", "aria-label"],
  ["data-en-title", "title"],
  ["data-en-content", "content"]
].flatMap(([data, attribute]) => [...document.querySelectorAll("[" + data + "]")].map(element => ({
  element, attribute, en: element.getAttribute(data),
  zh: attribute === "textContent" ? element.textContent : element.getAttribute(attribute)
})));
const languageButtons = [...document.querySelectorAll("[data-project-lang]")];
const sectionLinks = [...document.querySelectorAll("[data-project-link]")].map(link => ({
  link, path: link.getAttribute("href")
}));

function renderLanguage() {
  document.documentElement.lang = text("zh-Hant", "en");
  for (const {element, attribute, zh, en} of translations) {
    const value = text(zh, en);
    if (attribute === "textContent") element.textContent = value;
    else element.setAttribute(attribute, value);
  }
  for (const button of languageButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.projectLang === language));
  }
  for (const {link,path} of sectionLinks) link.href = sectionUrl(path);
}

function changeLanguage(next) {
  if (next === language) return;
  language = next;
  try { localStorage.setItem(storageKey, language); }
  catch { /* The URL carries the selection between pages even without storage. */ }
  const url = new URL(location.href);
  url.searchParams.set("lang",language);
  history.replaceState(history.state,"",url);
  renderLanguage();
  for (const listener of listeners) listener(language);
}

for (const button of languageButtons) {
  button.addEventListener("click",() => changeLanguage(button.dataset.projectLang));
}
renderLanguage();
