const slider = document.querySelector("#compare-position");
const panels = document.querySelector("#compare-panels");
const value = document.querySelector("#compare-value");
if (slider && panels) {
  function updateComparison() {
    panels.style.setProperty("--reveal", `${slider.value}%`);
    slider.setAttribute("aria-valuetext", `CAD 疊位顯示 ${slider.value}%`);
    value.textContent = `${slider.value}%`;
  }
  slider.addEventListener("input", updateComparison);
  updateComparison();
}

