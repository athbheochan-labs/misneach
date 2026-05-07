import { h as head, c as attr_class, d as stringify, f as store_get, j as slot, k as unsubscribe_stores, l as bind_props, m as getContext } from './index2-DVd6YtVN.js';
import './root-CeRgNu-g.js';
import './state.svelte-G7CW6nfF.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';
import './attributes-DB4d7OBb.js';

const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let data = $$props["data"];
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Decyphr Admin</title>`);
      });
    });
    $$renderer2.push(`<div class="admin-shell"><aside class="admin-sidebar fade-in"><div class="brand"><div class="brand-mark" aria-hidden="true"></div> <h1>Decyphr Backoffice</h1> <p>Drafts, preview tokens, and immutable release publishing.</p></div> <div class="sidebar-user"><p class="email">${escape_html(data.auth?.email || "admin")}</p> <p class="role">Role: ${escape_html(data.auth?.role || "admin")}</p></div> <nav class="sidebar-nav" aria-label="Admin navigation"><a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/dashboard") ? "active" : "")}`)} href="/admin/dashboard"><span class="dot" aria-hidden="true"></span> Analytics</a> <a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/courses") ? "active" : "")}`)} href="/admin/courses"><span class="dot" aria-hidden="true"></span> Courses</a> <a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/discount-codes") ? "active" : "")}`)} href="/admin/discount-codes"><span class="dot" aria-hidden="true"></span> Discount Codes</a> <a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/surveys") ? "active" : "")}`)} href="/admin/surveys"><span class="dot" aria-hidden="true"></span> Surveys</a></nav> <p class="sidebar-footer">Environment: production-like admin workflow</p></aside> <main class="admin-main"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-ClwKSauH.js.map
