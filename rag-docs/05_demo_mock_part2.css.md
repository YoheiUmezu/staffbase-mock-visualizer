  }
  
  .feed-card p {
    margin: 0 0 16px;
    line-height: 1.7;
    color: var(--color-text-muted);
  }
  
  .feed-footer {
    display: flex;
    gap: 16px;
    color: var(--color-text-muted);
    font-size: 13px;
  }
  
  .panel {
    padding: 18px;
  }
  
  .panel-title {
    font-weight: 700;
    margin-bottom: 14px;
  }
  
  .quick-links {
    display: grid;
    gap: 10px;
  }
  
  .quick-links a,
  .mobile-links a {
    display: block;
    text-decoration: none;
    color: var(--color-secondary);
    background: var(--color-surface-soft);
    border-radius: 12px;
    padding: 12px 14px;
    font-weight: 600;
  }
  
  .campaign-card {
    background: linear-gradient(135deg, rgba(0,91,187,.08), rgba(0,166,166,.08));
    border-radius: 14px;
    padding: 16px;
  }
  
  .campaign-kicker {
    font-size: 12px;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 8px;
  }
  
  .profile-card {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: grid;
    place-items: center;
    font-weight: 700;
  }
  
  .profile-name {
    font-weight: 700;
  }
  
  .profile-role {
    color: var(--color-text-muted);
    font-size: 13px;
  }
  
  .pill,
  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 10px;
  }
  
  .pill {
    background: rgba(0,91,187,.10);
    color: var(--color-primary);
  }
  
  .badge-accent {
    background: rgba(0,166,166,.14);
    color: #007e7e;
  }
  
  .badge-success {
    background: rgba(31,157,85,.12);
    color: var(--color-success);
  }
  
  .badge-muted {
    background: rgba(95,107,122,.12);
    color: var(--color-text-muted);
  }
  
  /* ===== Mobile mock ===== */
  .mobile-demo-bg {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  
  .mobile-frame {
    width: 390px;
    max-width: 100%;
    background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
    border: 10px solid #111827;
    border-radius: 34px;
    padding: 18px 16px 92px;
    position: relative;
    box-shadow: 0 30px 60px rgba(0,0,0,.18);
  }
  
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  
  .mobile-brand {
    font-weight: 800;
    font-size: 20px;
    color: var(--color-secondary);
  }
  
  .mobile-subtitle {
    color: var(--color-text-muted);
    font-size: 12px;
  }
  
  .mobile-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  }
  
  .mobile-hero {
    background: linear-gradient(135deg, var(--color-secondary), #123a62);
    color: white;
    border-radius: 24px;
    padding: 20px;
    margin-bottom: 16px;
  }
  
  .mobile-hero h1 {
    margin: 12px 0 8px;
    font-size: 28px;
    line-height: 1.05;
  }
  
  .mobile-hero p {
    margin: 0;
    color: rgba(255,255,255,.82);
    line-height: 1.6;
  }
  
  .mobile-card {
    background: white;
    border-radius: 18px;
    border: var(--border-soft);
    box-shadow: var(--shadow-md);
    padding: 16px;
    margin-bottom: 14px;
  }
  
  .mobile-card h2 {
    font-size: 21px;
    line-height: 1.2;
    margin: 0 0 8px;
  }
  
  .mobile-card p {
    margin: 0;
    color: var(--color-text-muted);
    line-height: 1.65;
  }
  
  .mobile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  
  .mini-card {
    background: white;
    border-radius: 16px;
    border: var(--border-soft);
    box-shadow: var(--shadow-md);
    padding: 16px;
  }
  
  .mini-label {
    color: var(--color-text-muted);
    font-size: 12px;
    margin-bottom: 6px;
  }
  
  .mini-value {
    font-weight: 800;
    font-size: 28px;
    color: var(--color-secondary);
  }
  
  .mobile-links {
    display: grid;
    gap: 10px;
  }
  
  .mobile-nav {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
    background: var(--color-secondary);
    border-radius: 18px;
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .mobile-nav-item {
    text-decoration: none;
    color: rgba(255,255,255,.72);
    text-align: center;
    padding: 10px 6px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
  }
  
  .mobile-nav-item.active {
    background: var(--color-primary);
    color: white;
  }
  
  /* ===== Responsive support ===== */
  @media (max-width: 1100px) {
    .hero-card,
    .content-grid,
    .demo-app.desktop-shell {
      grid-template-columns: 1fr;
    }
  
    .sidebar {
      padding-bottom: 10px;
    }
  }
  
```

