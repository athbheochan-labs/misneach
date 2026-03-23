<script lang="ts">
  import { page } from '$app/stores';
  import '../app.css';

  export let data: {
    auth: {
      email?: string;
      role?: string;
    } | null;
  };
</script>

<svelte:head>
  <title>Decyphr Admin</title>
</svelte:head>

<div class="admin-shell">
  <aside class="admin-sidebar fade-in">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"></div>
      <h1>Decyphr Backoffice</h1>
      <p>Drafts, preview tokens, and immutable release publishing.</p>
    </div>

    <div class="sidebar-user">
      <p class="email">{data.auth?.email || 'admin'}</p>
      <p class="role">Role: {data.auth?.role || 'admin'}</p>
    </div>

    <nav class="sidebar-nav" aria-label="Admin navigation">
      <a
        class="nav-link {$page.url.pathname.startsWith('/admin/dashboard') ? 'active' : ''}"
        href="/admin/dashboard"
      >
        <span class="dot" aria-hidden="true"></span>
        Analytics
      </a>
      <a
        class="nav-link {$page.url.pathname.startsWith('/admin/courses') ? 'active' : ''}"
        href="/admin/courses"
      >
        <span class="dot" aria-hidden="true"></span>
        Courses
      </a>
      <a
        class="nav-link {$page.url.pathname.startsWith('/admin/discount-codes') ? 'active' : ''}"
        href="/admin/discount-codes"
      >
        <span class="dot" aria-hidden="true"></span>
        Discount Codes
      </a>
      <a
        class="nav-link {$page.url.pathname.startsWith('/admin/surveys') ? 'active' : ''}"
        href="/admin/surveys"
      >
        <span class="dot" aria-hidden="true"></span>
        Surveys
      </a>
    </nav>

    <p class="sidebar-footer">Environment: production-like admin workflow</p>
  </aside>

  <main class="admin-main">
    <slot />
  </main>
</div>
