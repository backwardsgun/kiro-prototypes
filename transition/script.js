// My Account - Settings Prototype with Routing

let currentPage = 'settings'; // 'settings' or 'enterprise'

const navItems = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'workspaces', label: 'Workspaces', icon: 'grid' },
  { id: 'team', label: 'Team', icon: 'people' },
  { id: 'billing', label: 'Billing', icon: 'dollar' },
  { id: 'security', label: 'Security & sign-in', icon: 'lock' },
  { id: 'settings', label: 'Settings', icon: 'gear', active: true }
];

const navIcons = {
  person: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z"/></svg>',
  grid: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/></svg>',
  people: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 8a3 3 0 100-6 3 3 0 000 6zm-4 5c0-2.21 1.79-4 4-4s4 1.79 4 4v1H2v-1zm9-9a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm1 8.5c0-.53-.12-1.04-.34-1.5H14c1.1 0 2 .67 2 1.5v1h-4v-1z"/></svg>',
  dollar: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 10.5v1h-1v-1c-1.1-.1-2-.6-2-1.5h1c0 .5.7.9 1.5.9s1.5-.4 1.5-.9c0-.5-.3-.8-1.5-1.1-1.5-.4-2.5-.8-2.5-2 0-1 .9-1.5 2-1.6V4.5h1v.8c1 .1 1.8.6 1.8 1.5h-1c0-.5-.6-.8-1.3-.8-.8 0-1.5.3-1.5.9 0 .5.3.7 1.5 1 1.5.4 2.5.9 2.5 2.1 0 1-.9 1.6-2 1.7z"/></svg>',
  lock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 00-3 3v2H4a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V7a1 1 0 00-1-1h-1V4a3 3 0 00-3-3zm-1.5 3a1.5 1.5 0 113 0v2h-3V4z"/></svg>',
  gear: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319z"/></svg>'
};

// =====================
// ROUTING
// =====================
function navigateTo(page) {
  currentPage = page;
  renderPage();
}

function renderPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderTopNav()}
    <div class="app-layout">
      ${renderSideNav()}
      <main class="main-content">
        ${currentPage === 'settings' ? renderSettingsPage() : ''}
        ${currentPage === 'enterprise' ? renderEnterprisePage() : ''}
        ${currentPage === 'transition' ? renderTransitionPage() : ''}
      </main>
    </div>
  `;
  attachEventListeners();
}

function initApp() {
  renderPage();
}

// =====================
// SHARED COMPONENTS
// =====================
function renderTopNav() {
  return `
    <nav class="top-nav">
      <div class="top-nav-left">
        <a class="top-nav-logo" href="#" onclick="navigateTo('settings'); return false;">
          <svg width="40" height="24" viewBox="0 0 40 24" fill="#FF9900">
            <path d="M13.7 13.3c-1.5 1.1-3.7 1.7-5.6 1.7-2.6 0-5-.9-6.8-2.5-.1-.1 0-.3.2-.2 1.9 1.1 4.3 1.8 6.8 1.8 1.7 0 3.5-.3 5.1-1 .3-.1.5.2.3.4"/>
            <path d="M14.8 12c-.2-.3-.1-.5.2-.4 1.3.5 2.3 1.5 2.3 2.5 0 1.3-1.5 1.7-2.8.8-.1-.1-.1-.2 0-.2.9-.3 1.7-.9 1.7-1.6 0-.5-.5-1-1.4-1.1"/>
          </svg>
          <span>Courtyard</span>
        </a>
      </div>
      <div class="top-nav-right">
        <div class="top-nav-icon" title="Search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"/></svg>
        </div>
        <div class="top-nav-icon" title="Notifications">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16a2 2 0 002-2H6a2 2 0 002 2zm.995-14.901a1 1 0 10-1.99 0A5 5 0 003 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/></svg>
        </div>
        <div class="top-nav-icon" title="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/></svg>
        </div>
        <div class="top-nav-user">
          <div class="user-avatar">MS</div>
          <span>Michael Scott</span>
        </div>
      </div>
    </nav>
  `;
}

function renderSideNav() {
  return `
    <nav class="side-nav">
      ${navItems.map(item => `
        <a class="side-nav-item ${item.active ? 'active' : ''}" data-nav="${item.id}" href="#">
          <span class="side-nav-icon">${navIcons[item.icon]}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// =====================
// SETTINGS PAGE
// =====================
function renderSettingsPage() {
  return `
    <div class="breadcrumbs">
      <a class="breadcrumb-link" href="#" onclick="navigateTo('settings'); return false;">Courtyard</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Settings</span>
    </div>
    <div class="page-header">
      <h1>Settings</h1>
      <p class="page-header-description">Manage your organization settings and access builder resources.</p>
    </div>
    ${renderWorkspacesSection()}
    ${renderBuilderResources()}
    ${renderTransitionBanner()}
  `;
}

function renderWorkspacesSection() {
  return `
    <div class="cs-container">
      <div class="cs-container-header">
        <div>
          <h2>Your workspaces</h2>
          <p class="cs-container-header-description">Overview of your workspaces and organization settings.</p>
        </div>
        <button class="cs-button cs-button-normal cs-button-dropdown">Actions</button>
      </div>
      <div class="cs-container-divider"></div>
      <div class="kv-grid">
        <div>
          <div class="kv-label">Owner</div>
          <div class="kv-value">Michael Scott</div>
        </div>
        <div>
          <div class="kv-label">Workspaces</div>
          <div class="kv-value">9</div>
        </div>
      </div>
    </div>
  `;
}

function renderBuilderResources() {
  return `
    <div class="cs-container">
      <div class="cs-container-header">
        <div>
          <h2>Builder resources</h2>
          <p class="cs-container-header-description">Explore documentation, tutorials, and community resources to help you build on AWS.</p>
        </div>
      </div>
      <div class="cs-container-divider"></div>
      <div class="resource-list">
        <div class="resource-item">
          <a class="resource-link" href="https://aws.amazon.com/builder-center/" target="_blank">Builder Center <span class="resource-link-icon">↗</span></a>
          <span class="resource-description">Get started with AWS and explore tutorials</span>
        </div>
        <div class="resource-item">
          <a class="resource-link" href="https://docs.aws.amazon.com/" target="_blank">AWS Documentation <span class="resource-link-icon">↗</span></a>
          <span class="resource-description">Technical documentation and API references</span>
        </div>
        <div class="resource-item">
          <a class="resource-link" href="https://aws.amazon.com/blogs/" target="_blank">AWS Blogs <span class="resource-link-icon">↗</span></a>
          <span class="resource-description">Latest news, announcements, and best practices</span>
        </div>
        <div class="resource-item">
          <a class="resource-link" href="https://aws.amazon.com/training/" target="_blank">Learning resources <span class="resource-link-icon">↗</span></a>
          <span class="resource-description">Training courses and certifications</span>
        </div>
        <div class="resource-item">
          <a class="resource-link" href="https://repost.aws/" target="_blank">Community forums <span class="resource-link-icon">↗</span></a>
          <span class="resource-description">Connect with other AWS builders</span>
        </div>
      </div>
    </div>
  `;
}

function renderTransitionBanner() {
  return `
    <div class="cs-container">
      <details class="enterprise-expandable">
        <summary class="enterprise-expandable-header">
          <div class="enterprise-header-left">
            <span class="enterprise-chevron">▶</span>
            <span class="enterprise-header-title">Scale your environment with enterprise capabilities</span>
            <span class="enterprise-info-badge">Info</span>
          </div>
          <button class="cs-button cs-button-normal" id="learn-more-btn" onclick="event.stopPropagation(); navigateTo('enterprise');">Learn more</button>
        </summary>
        <div class="enterprise-expandable-content">
          <div class="enterprise-content-inner">
            <div class="enterprise-illustration">
              <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
                <path d="M20 28c-5.5 0-10 4.5-10 10s4.5 10 10 10h8" stroke="#0972d3" stroke-width="2" fill="none"/>
                <path d="M18 28c0-7.7 6.3-14 14-14 6.2 0 11.5 4 13.3 9.6C46.5 22.6 48.2 22 50 22c5.5 0 10 4.5 10 10s-4.5 10-10 10h-6" stroke="#0972d3" stroke-width="2" fill="none"/>
                <rect x="16" y="44" width="20" height="6" rx="2" stroke="#0972d3" stroke-width="1.5" fill="#e6f2ff"/>
                <line x1="30" y1="47" x2="33" y2="47" stroke="#0972d3" stroke-width="1.5"/>
                <rect x="16" y="52" width="20" height="6" rx="2" stroke="#0972d3" stroke-width="1.5" fill="#e6f2ff"/>
                <line x1="30" y1="55" x2="33" y2="55" stroke="#0972d3" stroke-width="1.5"/>
                <rect x="48" y="32" width="22" height="18" rx="4" stroke="#0972d3" stroke-width="2" fill="#e6f2ff"/>
                <circle cx="55" cy="41" r="2" fill="#0972d3"/>
                <circle cx="63" cy="41" r="2" fill="#0972d3"/>
                <line x1="59" y1="28" x2="59" y2="32" stroke="#0972d3" stroke-width="2"/>
                <circle cx="59" cy="26" r="2" fill="#0972d3"/>
                <circle cx="44" cy="52" r="6" fill="#e6f2ff" stroke="#0972d3" stroke-width="1.5"/>
                <path d="M41 52l2 2 4-4" stroke="#0972d3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="68" cy="54" r="5" fill="#e6f2ff" stroke="#0972d3" stroke-width="1.5"/>
                <path d="M65.5 54l1.5 1.5 3-3" stroke="#0972d3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <p class="enterprise-description">
              By converting from your starter home environment to a classic enterprise environment, you gain full ownership of your management 
              account and unlock access to the complete range of AWS services, multi-Region capabilities, giving you greater control, flexibility, and 
              scalability to grow your cloud infrastructure on your terms.
            </p>
          </div>
        </div>
      </details>
    </div>
  `;
}


// =====================
// ENTERPRISE PAGE
// =====================
function renderEnterprisePage() {
  return `
    <div class="breadcrumbs">
      <a class="breadcrumb-link" href="#" onclick="navigateTo('settings'); return false;">Courtyard</a>
      <span class="breadcrumb-separator">›</span>
      <a class="breadcrumb-link" href="#" onclick="navigateTo('settings'); return false;">Settings</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Enterprise management</span>
    </div>

    <!-- Hero Banner -->
    <div class="enterprise-hero">
      <div class="enterprise-hero-content">
        <h1 class="enterprise-hero-title">Scale to an enterprise AWS environment</h1>
        <p class="enterprise-hero-description">
          By transitioning to an environment you gain full ownership and configuration of your 
          AWS environment with advanced multi-account management and AWS service 
          capabilities, which provide you greater control, flexibility, and scalability to grow your 
          cloud infrastructure on your terms.
        </p>
      </div>
      <div class="enterprise-hero-illustration">
        <svg width="200" height="140" viewBox="0 0 200 140" fill="none">
          <!-- Cloud -->
          <path d="M40 55c-8 0-15 7-15 15s7 15 15 15h12" stroke="#8fa4c4" stroke-width="2" fill="none"/>
          <path d="M37 55c0-11 9-20 20-20 9 0 16.5 5.7 19 13.7 1.5-1 3.3-1.6 5.2-1.6 8 0 14.5 6.5 14.5 14.5S89.2 76 81.2 76H72" stroke="#8fa4c4" stroke-width="2" fill="none"/>
          <!-- Server rack -->
          <rect x="30" y="80" width="30" height="10" rx="3" stroke="#8fa4c4" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>
          <line x1="50" y1="85" x2="55" y2="85" stroke="#8fa4c4" stroke-width="1.5"/>
          <rect x="30" y="93" width="30" height="10" rx="3" stroke="#8fa4c4" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>
          <line x1="50" y1="98" x2="55" y2="98" stroke="#8fa4c4" stroke-width="1.5"/>
          <!-- Connection lines -->
          <line x1="60" y1="85" x2="80" y2="75" stroke="#8fa4c4" stroke-width="1" stroke-dasharray="3,3"/>
          <line x1="60" y1="98" x2="80" y2="108" stroke="#8fa4c4" stroke-width="1" stroke-dasharray="3,3"/>
          <!-- Bot character -->
          <rect x="120" y="50" width="36" height="30" rx="6" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.15)"/>
          <circle cx="131" cy="65" r="3" fill="white"/>
          <circle cx="145" cy="65" r="3" fill="white"/>
          <line x1="138" y1="42" x2="138" y2="50" stroke="white" stroke-width="2"/>
          <circle cx="138" cy="39" r="3" fill="white"/>
          <!-- Small bots -->
          <rect x="165" y="60" width="24" height="20" rx="4" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.1)"/>
          <circle cx="173" cy="70" r="2" fill="white"/>
          <circle cx="181" cy="70" r="2" fill="white"/>
          <rect x="165" y="90" width="24" height="20" rx="4" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.1)"/>
          <circle cx="173" cy="100" r="2" fill="white"/>
          <circle cx="181" cy="100" r="2" fill="white"/>
          <!-- Checkmarks -->
          <circle cx="80" cy="108" r="8" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/>
          <path d="M76 108l3 3 5-5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="105" cy="95" r="7" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/>
          <path d="M101.5 95l2.5 2.5 4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Key Benefits -->
    <h2 class="section-title">Key benefits of enterprise</h2>
    <div class="benefits-grid">
      <div class="benefit-card">
        <h3 class="benefit-card-title">Manage AWS accounts</h3>
        <p class="benefit-card-description">Expand your workspace capabilities to AWS accounts.</p>
        <div class="benefit-card-illustration">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
            <path d="M20 20c-6 0-11 5-11 11s5 11 11 11h8" stroke="#0972d3" stroke-width="1.5" fill="none"/>
            <path d="M18 20c0-8.8 7.2-16 16-16 7 0 13 4.5 15 10.8 1.5-1 3.3-1.5 5.2-1.5 6.3 0 11.5 5.2 11.5 11.5S60.5 36.3 54.2 36.3H48" stroke="#0972d3" stroke-width="1.5" fill="none"/>
            <rect x="22" y="38" width="18" height="5" rx="2" stroke="#0972d3" stroke-width="1" fill="#e6f2ff"/>
            <rect x="22" y="45" width="18" height="5" rx="2" stroke="#0972d3" stroke-width="1" fill="#e6f2ff"/>
          </svg>
        </div>
      </div>
      <div class="benefit-card">
        <h3 class="benefit-card-title">Improve access control</h3>
        <p class="benefit-card-description">Manage permissions and create guardrails with policies and roles.</p>
        <div class="benefit-card-illustration">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
            <rect x="15" y="15" width="30" height="25" rx="4" stroke="#0972d3" stroke-width="1.5" fill="#e6f2ff"/>
            <path d="M25 27h10M25 33h7" stroke="#0972d3" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="55" cy="35" r="10" fill="#e6f2ff" stroke="#0972d3" stroke-width="1.5"/>
            <path d="M51 35l3 3 5-5" stroke="#0972d3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="benefit-card">
        <h3 class="benefit-card-title">Access enterprise services</h3>
        <p class="benefit-card-description">Access the full suite of AWS services with advanced capabilities.</p>
        <div class="benefit-card-illustration">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
            <circle cx="30" cy="35" r="12" fill="#e6f2ff" stroke="#0972d3" stroke-width="1.5"/>
            <path d="M26 35l3 3 5-5" stroke="#0972d3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="52" cy="35" r="12" fill="#e6f2ff" stroke="#0972d3" stroke-width="1.5"/>
            <path d="M48 35l3 3 5-5" stroke="#0972d3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="benefit-card">
        <h3 class="benefit-card-title">Expand to multi-Region</h3>
        <p class="benefit-card-description">Expand resource deployment to multiple Regions.</p>
        <div class="benefit-card-illustration">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
            <circle cx="40" cy="30" r="20" stroke="#0972d3" stroke-width="1.5" fill="#e6f2ff"/>
            <ellipse cx="40" cy="30" rx="10" ry="20" stroke="#0972d3" stroke-width="1"/>
            <line x1="20" y1="30" x2="60" y2="30" stroke="#0972d3" stroke-width="1"/>
            <line x1="23" y1="20" x2="57" y2="20" stroke="#0972d3" stroke-width="0.75"/>
            <line x1="23" y1="40" x2="57" y2="40" stroke="#0972d3" stroke-width="0.75"/>
            <!-- Bot next to globe -->
            <rect x="62" y="18" width="16" height="14" rx="3" stroke="#0972d3" stroke-width="1.5" fill="#e6f2ff"/>
            <circle cx="67" cy="25" r="1.5" fill="#0972d3"/>
            <circle cx="73" cy="25" r="1.5" fill="#0972d3"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- New Capabilities Table -->
    <div class="cs-container">
      <div class="cs-container-header">
        <div>
          <h2>New capabilities</h2>
          <p class="cs-container-header-description">After transition the following additional capabilities are added.</p>
        </div>
        <a class="cs-button cs-button-normal" href="#" target="_blank">Learn more <span class="resource-link-icon">↗</span></a>
      </div>
      <div class="capabilities-table-wrapper">
        <table class="capabilities-table">
          <thead>
            <tr>
              <th class="cap-col-capability">Capability</th>
              <th class="cap-col-enterprise">Enterprise environment</th>
              <th class="cap-col-current">Your current environment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Access to all AWS services, including enterprise services</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Control of your management account through console and CLI</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Access to create resources and enable services in additional Regions</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Management of service control policies (SCPs) and resource control policies (RCPs)</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Additional cost management tools</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Resources creation no longer limited by spending</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
            <tr>
              <td>Role management to control permissions to your resources</td>
              <td class="cap-cell-center"><span class="cap-check">✓</span></td>
              <td class="cap-cell-center"><span class="cap-cross">✕</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Begin Transition CTA -->
    <div class="begin-transition-bar">
      <p class="begin-transition-text">
        When you choose <strong>Begin transition</strong> you will be guided through steps to set up management of your enterprise environment.
      </p>
      <button class="cs-button cs-button-primary" id="begin-transition-btn">Begin transition</button>
    </div>
  `;
}

// =====================
// EVENT LISTENERS
// =====================
function attachEventListeners() {
  // Side nav clicks
  document.querySelectorAll('.side-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.side-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Begin transition button
  const beginBtn = document.getElementById('begin-transition-btn');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      navigateTo('transition');
    });
  }

  // Transition page interactions
  if (currentPage === 'transition') {
    attachTransitionListeners();
  }
}

// =====================
// TRANSITION PAGE
// =====================
let transitionState = {
  currentStep: 1,
  emailOption: 'builder', // 'builder' or 'different'
  customEmail: '',
  emailVerified: false,
  verificationSent: false,
  otpCode: '',
  accountName: '',
  step1Complete: false,
  step2Complete: false
};

function renderTransitionPage() {
  return `
    <div class="breadcrumbs">
      <a class="breadcrumb-link" href="#" onclick="navigateTo('settings'); return false;">Courtyard</a>
      <span class="breadcrumb-separator">›</span>
      <a class="breadcrumb-link" href="#" onclick="navigateTo('settings'); return false;">Settings</a>
      <span class="breadcrumb-separator">›</span>
      <a class="breadcrumb-link" href="#" onclick="navigateTo('enterprise'); return false;">Enterprise management</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Transition</span>
    </div>

    <div class="page-header">
      <h1>Access your enterprise environment in just two steps <span class="enterprise-info-badge">Info</span></h1>
      <p class="page-header-description">Follow the steps here to set up your <strong>management account</strong>, which allows you to centrally manage your enterprise environment.</p>
    </div>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <div class="step-indicator-item ${transitionState.currentStep >= 1 ? 'active' : ''} ${transitionState.step1Complete ? 'completed' : ''}">
        <div class="step-indicator-circle">
          ${transitionState.step1Complete ? '✓' : '1'}
        </div>
        <span class="step-indicator-label">Step 1: Confirm email</span>
      </div>
      <div class="step-indicator-line ${transitionState.step1Complete ? 'completed' : ''}"></div>
      <div class="step-indicator-item ${transitionState.currentStep >= 2 ? 'active' : ''} ${transitionState.step2Complete ? 'completed' : ''}">
        <div class="step-indicator-circle">
          ${transitionState.step2Complete ? '✓' : '2'}
        </div>
        <span class="step-indicator-label">Step 2: Create name</span>
      </div>
    </div>

    <!-- Step 1: Confirm Email -->
    <div class="cs-container wizard-step ${transitionState.currentStep === 1 ? 'wizard-step-active' : ''}">
      <div class="cs-container-header">
        <h2>Step 1: Confirm email</h2>
        <span class="wizard-status-badge ${transitionState.step1Complete ? 'wizard-status-complete' : 'wizard-status-progress'}">
          ${transitionState.step1Complete ? 'Complete' : 'In progress'}
        </span>
      </div>
      ${transitionState.currentStep === 1 ? `
        <div class="cs-container-content">
          <div class="email-options">
            <label class="email-option ${transitionState.emailOption === 'builder' ? 'email-option-selected' : ''}" data-email-option="builder">
              <input type="radio" name="email-option" value="builder" ${transitionState.emailOption === 'builder' ? 'checked' : ''}>
              <div class="email-option-content">
                <div class="email-option-title">Use my AWS Builder ID email</div>
                <div class="email-option-description">You will continue with the email address <strong>reese@gmail.com</strong>.</div>
              </div>
            </label>
            <label class="email-option ${transitionState.emailOption === 'different' ? 'email-option-selected' : ''}" data-email-option="different">
              <input type="radio" name="email-option" value="different" ${transitionState.emailOption === 'different' ? 'checked' : ''}>
              <div class="email-option-content">
                <div class="email-option-title">Use a different email address</div>
                <div class="email-option-description">You can enter and verify a different email address from your AWS Builder ID email.</div>
              </div>
            </label>
          </div>
          ${transitionState.emailOption === 'different' ? `
            <div class="verify-email-section">
              ${!transitionState.verificationSent ? `
                <div class="custom-email-input">
                  <label class="form-label">Email address</label>
                  <div class="input-with-button">
                    <input type="email" class="cs-input" id="custom-email" placeholder="Enter email address" value="${transitionState.customEmail}">
                    <button class="cs-button cs-button-primary" id="send-verify-btn">Verify</button>
                  </div>
                </div>
              ` : !transitionState.emailVerified ? `
                <div class="verify-email-sent">
                  <div class="verify-alert verify-alert-info">
                    <span class="verify-alert-icon">✉</span>
                    <span>A one-time passcode has been sent to <strong>${transitionState.customEmail}</strong>. Enter it below to verify your email.</span>
                  </div>
                  <div class="custom-email-input">
                    <label class="form-label">Verification code</label>
                    <div class="input-with-button">
                      <input type="text" class="cs-input" id="otp-input" placeholder="Enter 6-digit code" maxlength="6" value="${transitionState.otpCode}">
                      <button class="cs-button cs-button-primary" id="confirm-otp-btn">Confirm</button>
                    </div>
                    <p class="form-hint">Didn't receive the code? <a href="#" class="resend-link" id="resend-code-link">Resend code</a></p>
                  </div>
                </div>
              ` : `
                <div class="verify-alert verify-alert-success">
                  <span class="verify-alert-icon">✓</span>
                  <span>Email <strong>${transitionState.customEmail}</strong> has been verified successfully.</span>
                </div>
              `}
            </div>
          ` : ''}
          <div style="margin-top: 16px;">
            <button class="cs-button cs-button-primary" id="continue-step1-btn"
              ${transitionState.emailOption === 'different' && !transitionState.emailVerified ? 'disabled' : ''}>
              Continue to next step
            </button>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Step 2: Create Name -->
    <div class="cs-container wizard-step ${transitionState.currentStep === 2 ? 'wizard-step-active' : ''}" style="margin-top: 12px;">
      <div class="cs-container-header">
        <h2>Step 2: Create name for your management account</h2>
        <span class="wizard-status-badge ${transitionState.step2Complete ? 'wizard-status-complete' : transitionState.currentStep >= 2 ? 'wizard-status-progress' : 'wizard-status-pending'}">
          ${transitionState.step2Complete ? 'Complete' : transitionState.currentStep >= 2 ? 'In progress' : 'Pending'}
        </span>
      </div>
      ${transitionState.currentStep === 2 ? `
        <div class="cs-container-content">
          <div class="custom-email-input">
            <label class="form-label">Management account name</label>
            <input type="text" class="cs-input" id="account-name" placeholder="Enter account name" value="${transitionState.accountName}">
            <p class="form-hint">This name will be used to identify your management account.</p>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Optional: Configure starting enterprise environment -->
    <div class="cs-container" style="margin-top: 12px;">
      <details class="enterprise-expandable">
        <summary class="enterprise-expandable-header">
          <div class="enterprise-header-left">
            <span class="enterprise-chevron">▶</span>
            <span class="enterprise-header-title">Configure your starting enterprise environment</span>
            <span style="font-style: italic; color: var(--color-text-secondary); margin-left: 4px;">— Optional</span>
            <span class="enterprise-info-badge" style="margin-left: 8px;">Info</span>
          </div>
        </summary>
        <div class="enterprise-expandable-content">
          <p style="color: var(--color-text-secondary);">Additional configuration options will be available after completing the required steps above.</p>
        </div>
      </details>
    </div>

    <!-- Footer Actions -->
    <div class="wizard-footer">
      <button class="cs-button cs-button-normal wizard-cancel-btn" onclick="navigateTo('enterprise')">Cancel</button>
      <button class="cs-button cs-button-primary" id="complete-transition-btn" ${!transitionState.step1Complete || transitionState.currentStep < 2 ? 'disabled' : ''}>Complete transition</button>
    </div>
  `;
}

function attachTransitionListeners() {
  // Email option selection
  document.querySelectorAll('.email-option').forEach(option => {
    option.addEventListener('click', () => {
      const newOption = option.dataset.emailOption;
      if (newOption !== transitionState.emailOption) {
        transitionState.emailOption = newOption;
        // Reset verification state when switching
        transitionState.verificationSent = false;
        transitionState.emailVerified = false;
        transitionState.otpCode = '';
        renderPage();
      }
    });
  });

  // Send verification email
  const sendVerifyBtn = document.getElementById('send-verify-btn');
  if (sendVerifyBtn) {
    sendVerifyBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('custom-email');
      if (!emailInput || !emailInput.value.trim() || !emailInput.value.includes('@')) {
        alert('Please enter a valid email address.');
        return;
      }
      transitionState.customEmail = emailInput.value.trim();
      transitionState.verificationSent = true;
      renderPage();
    });
  }

  // Confirm OTP
  const confirmOtpBtn = document.getElementById('confirm-otp-btn');
  if (confirmOtpBtn) {
    confirmOtpBtn.addEventListener('click', () => {
      const otpInput = document.getElementById('otp-input');
      if (!otpInput || !otpInput.value.trim()) {
        alert('Please enter the verification code.');
        return;
      }
      // For prototype: accept any 6-digit code
      if (otpInput.value.trim().length < 6) {
        alert('Please enter a valid 6-digit verification code.');
        return;
      }
      transitionState.otpCode = otpInput.value.trim();
      transitionState.emailVerified = true;
      renderPage();
    });
  }

  // Resend code
  const resendLink = document.getElementById('resend-code-link');
  if (resendLink) {
    resendLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('A new verification code has been sent to ' + transitionState.customEmail);
    });
  }

  // Continue from step 1
  const continueBtn = document.getElementById('continue-step1-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (transitionState.emailOption === 'different' && !transitionState.emailVerified) {
        return; // Button should be disabled, but just in case
      }
      transitionState.step1Complete = true;
      transitionState.currentStep = 2;
      renderPage();
    });
  }

  // Account name input
  const accountNameInput = document.getElementById('account-name');
  if (accountNameInput) {
    accountNameInput.addEventListener('input', (e) => {
      transitionState.accountName = e.target.value;
      const completeBtn = document.getElementById('complete-transition-btn');
      if (completeBtn) {
        completeBtn.disabled = !e.target.value.trim();
      }
    });
  }

  // Complete transition
  const completeBtn = document.getElementById('complete-transition-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      if (!transitionState.accountName.trim()) {
        alert('Please enter a management account name.');
        return;
      }
      transitionState.step2Complete = true;
      alert('Transition complete! Your enterprise environment is being set up.');
      navigateTo('settings');
      // Reset state
      transitionState = { currentStep: 1, emailOption: 'builder', customEmail: '', emailVerified: false, verificationSent: false, otpCode: '', accountName: '', step1Complete: false, step2Complete: false };
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
