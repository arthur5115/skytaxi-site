const flow = document.querySelector("[data-cable-flow]");

if (flow) {
  const scenarios = JSON.parse(flow.querySelector("[data-flow-scenarios]").textContent);
  const controls = flow.querySelector("[data-flow-controls]");
  const buttons = [...controls.querySelectorAll("[data-flow-choice]")];
  const activities = [...flow.querySelectorAll("[data-flow-activity]")];
  const heading = flow.querySelector("[data-flow-heading]");
  const summary = flow.querySelector("[data-flow-summary]");
  const journey = flow.querySelector("[data-flow-journey]");

  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      const scenario = scenarios[index];
      activities.forEach((activity, position) => {
        activity.textContent = scenario.station_labels[position];
      });
      for (const choice of buttons) choice.setAttribute("aria-pressed", String(choice === button));
      heading.textContent = scenario.heading;
      summary.textContent = scenario.summary;
      journey.firstElementChild.textContent = scenario.journey[0];
      journey.href = scenario.journey[1];
    });
  }
  controls.hidden = false;
}
