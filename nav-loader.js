document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("nav-root");
  if (!mount) return;

  try {
    const res = await fetch("nav.html");
    const html = await res.text();
    mount.innerHTML = html;

    // Highlight the current page's button
    const currentPage = document.body.dataset.page;
    if (!currentPage) return;

    const activeLink = mount.querySelector(
      `.nav-btn[data-page="${currentPage}"]`,
    );
    if (activeLink) {
      activeLink.classList.add("nav-current");
    }
  } catch (err) {
    console.error("Failed to load nav:", err);
  }
});
