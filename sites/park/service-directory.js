const directory = document.querySelector("[data-service-directory]");
const filters = directory?.querySelector("form");

if (filters) {
  const { keyword, station, category } = filters.elements;
  const count = directory.querySelector("[data-service-count]");
  const empty = directory.querySelector("[data-service-empty]");
  const normalize = value => value.normalize("NFKC").toLowerCase();
  const entries = Array.from(directory.querySelectorAll("[data-service-item]"), card => ({
    card,
    category: card.dataset.category,
    stops: [...card.querySelectorAll("[data-service-stop]")],
    keywords: normalize(card.dataset.keywords),
  }));

  function filterServices() {
    const terms = normalize(keyword.value).trim().split(/\s+/u).filter(Boolean);
    let visible = 0;
    for (const entry of entries) {
      const matched = (!station.value || entry.stops.some(stop => stop.dataset.serviceStop === station.value))
        && (!category.value || entry.category === category.value)
        && terms.every(term => entry.keywords.includes(term));
      entry.card.hidden = !matched;
      for (const stop of entry.stops) stop.hidden = Boolean(station.value && stop.dataset.serviceStop !== station.value);
      visible += Number(matched);
    }
    count.textContent = `${visible} 項規劃服務`;
    empty.hidden = visible !== 0;
  }

  const initial = new URLSearchParams(location.search);
  for (const field of [station, category]) {
    const value = initial.get(field.name);
    if ([...field.options].some(option => option.value === value)) field.value = value;
  }
  filters.addEventListener("input", filterServices);
  filters.addEventListener("submit", event => {
    event.preventDefault();
    filterServices();
  });
  filters.addEventListener("reset", event => {
    event.preventDefault();
    for (const field of [keyword, station, category]) field.value = "";
    filterServices();
  });
  filters.hidden = false;
  filterServices();
}
