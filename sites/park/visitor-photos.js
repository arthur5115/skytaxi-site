/* Photo links remain ordinary links when the preview dialog is unavailable. */
const photoDialog = document.querySelector("[data-photo-dialog]");
if (photoDialog && typeof photoDialog.showModal === "function") {
  const fullPhoto = photoDialog.querySelector("[data-photo-full]");
  const original = photoDialog.querySelector("[data-photo-original]");
  const caption = photoDialog.querySelector("[data-photo-caption]");
  let opener;

  document.addEventListener("click", event => {
    const link = event.target.closest(".visitor-photo-link");
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.altKey) return;
    const thumbnail = link.querySelector("img");
    const name = link.getAttribute("aria-label").split(" · ").slice(1).join(" · ");
    const label = link.closest("figure").querySelector(".photo-label")?.textContent ?? "";
    event.preventDefault();
    opener = link;
    fullPhoto.src = link.href;
    original.href = link.href;
    fullPhoto.alt = thumbnail.alt;
    caption.textContent = [name, label].filter(Boolean).join(" · ");
    photoDialog.showModal();
  });

  photoDialog.addEventListener("click", event => {
    if (event.target === photoDialog) photoDialog.close();
  });
  photoDialog.addEventListener("close", () => {
    fullPhoto.removeAttribute("src");
    original.removeAttribute("href");
    opener?.focus({ preventScroll: true });
  });
}
