// Starter Home Transition — Prototype

function initApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page">
      <h1>Starter Home Transition</h1>
      <p>Prototype coming soon.</p>
    </div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
