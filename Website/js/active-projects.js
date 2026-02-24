(async function () {
  const container = document.getElementById("projects-container");
  if (!container) return;

  try {
    const res = await fetch("data/projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load data/projects.json (HTTP " + res.status + ")");

    const projects = await res.json();
    if (!Array.isArray(projects)) throw new Error("projects.json must be an array");

    container.innerHTML = "";

    projects.forEach((p, idx) => {
      const title = p.title || "Untitled Project";
      const description = p.description || "";
      const image = p.image || "";
const goalSats = Number(p.goal_sats ?? 0);
const raisedSats = Number(p.raised_sats ?? 0);

const goalBTC = (goalSats / 100000000).toFixed(3);
const raisedBTC = (raisedSats / 100000000).toFixed(3);

const percent = goalSats > 0 ? Math.min((raisedSats / goalSats) * 100, 100) : 0;
      const address = p.address || "";

      const card = document.createElement("section");
      card.className = "project-card";

      card.innerHTML = `
        <div class="project-media">
          ${image ? `<img class="project-image" src="${image}" alt="${title}">` : ""}
        </div>

        <div class="project-body">
          <h2 class="project-title">${title}</h2>
          <p class="project-desc">${description}</p>

          <div class="project-metrics">
  <div><strong>Goal:</strong> ${goalBTC} BTC</div>
  <div><strong>Raised:</strong> ${raisedBTC} BTC</div>
</div>

          <div class="project-address">
            <div class="addr-label"><strong>BTC address:</strong></div>
            <code class="addr">${address}</code>
          </div>

          <div class="project-qr" id="qr-${idx}"></div>
        </div>
      `;

      container.appendChild(card);

      // Local QR (depends on Website/js/qrcode.min.js)
      const qrEl = document.getElementById(`qr-${idx}`);
      if (qrEl && address && typeof QRCode !== "undefined") {
        qrEl.innerHTML = "";
        new QRCode(qrEl, {
          text: address,
          width: 160,
          height: 160,
          correctLevel: QRCode.CorrectLevel.M
        });
      } else if (qrEl) {
        qrEl.innerHTML = "<em>QR unavailable</em>";
      }
    });
  } catch (err) {
    container.innerHTML = `<p><strong>Error:</strong> ${err.message}</p>`;
  }
})();
