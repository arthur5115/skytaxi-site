export function bindModelDrag(surface, controls, {explode, rotate, select}) {
  const buttons = [...controls.querySelectorAll("[data-drag-mode]")];
  let gesture = null;

  function chooseMode(mode) {
    surface.dataset.dragMode = mode;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.dragMode === mode));
    }
  }

  chooseMode("explode");
  for (const button of buttons) {
    button.addEventListener("click",() => chooseMode(button.dataset.dragMode));
  }

  surface.addEventListener("pointerdown", event => {
    if (gesture || event.button !== 0 || event.target.closest("button, a, input")) return;
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      mode: event.shiftKey ? "rotate" : surface.dataset.dragMode,
      travel: Math.min(360, Math.max(100, surface.clientWidth * .62)),
      moved: false
    };
    surface.setPointerCapture(event.pointerId);
  });

  surface.addEventListener("pointermove", event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx,dy) < 4) return;
    gesture.moved = true;
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    if (gesture.mode === "rotate") rotate(dx,dy);
    else explode(dx / gesture.travel);
  });

  for (const name of ["pointerup","pointercancel","lostpointercapture"]) {
    surface.addEventListener(name, event => {
      if (gesture?.id !== event.pointerId) return;
      const wasClick = name === "pointerup" && !gesture.moved;
      gesture = null;
      if (wasClick) select?.(event.clientX,event.clientY);
    });
  }
}
