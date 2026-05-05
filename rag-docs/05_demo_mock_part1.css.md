# sample_deliverables/05_demo_mock.css

**パス**: sample_deliverables/05_demo_mock.css
**種類**: CSS
**説明**: デスクトップ／モバイル向けデモモックUIのスタイル（変数、レイアウト、コンポーネント）。

## 内容

```css
:root {
    --color-primary: #005BBB;
    --color-secondary: #0B1F33;
    --color-accent: #00A6A6;
    --color-bg: #F4F7FB;
    --color-surface: #FFFFFF;
    --color-surface-soft: #EEF4FA;
    --color-text: #16202A;
    --color-text-muted: #5F6B7A;
    --color-success: #1F9D55;
    --color-warning: #D9822B;
    --color-danger: #C23030;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --shadow-lg: 0 18px 40px rgba(11, 31, 51, 0.10);
    --shadow-md: 0 10px 30px rgba(11, 31, 51, 0.08);
    --border-soft: 1px solid rgba(11, 31, 51, 0.08);
  }
  
  * {
    box-sizing: border-box;
  }
  
  body.demo-body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
    color: var(--color-text);
  }
  
  /* ===== Desktop shell ===== */
  .demo-app.desktop-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 280px 1fr;
  }
  
  .sidebar {
    background: linear-gradient(180deg, var(--color-secondary) 0%, #102941 100%);
    color: #fff;
    padding: 28px 22px;
  }
  
  .brand-block {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
  }
  
  .brand-mark {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    display: grid;
    place-items: center;
    font-weight: 700;
    color: white;
  }
  
  .brand-name {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.1;
  }
  
  .brand-sub {
    opacity: .72;
    font-size: 13px;
  }
  
  .sidebar-nav {
    display: grid;
    gap: 8px;
    margin-bottom: 26px;
  }
  
  .nav-item {
    color: rgba(255,255,255,.82);
    text-decoration: none;
    padding: 12px 14px;
    border-radius: 12px;
    transition: 0.2s ease;
  }
  
  .nav-item:hover,
  .nav-item.active {
    background: rgba(255,255,255,.10);
    color: white;
  }
  
  .sidebar-card {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 16px;
    padding: 16px;
  }
  
  .sidebar-card-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .08em;
    opacity: .72;
    margin-bottom: 6px;
  }
  
  .sidebar-card-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .main-area {
    padding: 32px;
  }
  
  .topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .eyebrow {
    color: var(--color-text-muted);
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .topbar h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.1;
  }
  
  .topbar-actions {
    display: flex;
    gap: 10px;
  }
  
  .btn {
    border: none;
    border-radius: 12px;
    padding: 12px 16px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .btn-primary {
    background: var(--color-primary);
    color: white;
    box-shadow: var(--shadow-md);
  }
  
  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-secondary);
    border: var(--border-soft);
  }
  
  .btn-ghost {
    background: transparent;
    color: var(--color-secondary);
    border: var(--border-soft);
  }
  
  .hero-card {
    background: linear-gradient(135deg, #ffffff 0%, #f2f8ff 100%);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: var(--border-soft);
    padding: 28px;
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 22px;
    margin-bottom: 24px;
  }
  
  .hero-card h2 {
    margin: 12px 0 10px;
    font-size: 34px;
    line-height: 1.05;
  }
  
  .hero-card p {
    color: var(--color-text-muted);
    font-size: 16px;
    line-height: 1.7;
    margin: 0 0 18px;
  }
  
  .hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .hero-metrics {
    display: grid;
    gap: 12px;
  }
  
  .metric-card {
    background: white;
    border-radius: 16px;
    border: var(--border-soft);
    padding: 18px;
    box-shadow: var(--shadow-md);
  }
  
  .metric-label {
    color: var(--color-text-muted);
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .metric-value {
    font-size: 34px;
    font-weight: 700;
    color: var(--color-secondary);
  }
  
  .content-grid {
    display: grid;
    grid-template-columns: 1.45fr .85fr;
    gap: 24px;
  }
  
  .content-column {
    display: grid;
    gap: 16px;
  }
  
  .feed-card,
  .panel {
    background: white;
    border-radius: 18px;
    border: var(--border-soft);
    box-shadow: var(--shadow-md);
  }
  
  .feed-card {
    padding: 20px;
  }
  
  .feed-card.featured {
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  }
  
  .feed-card-top,
  .mobile-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    color: var(--color-text-muted);
    font-size: 13px;
