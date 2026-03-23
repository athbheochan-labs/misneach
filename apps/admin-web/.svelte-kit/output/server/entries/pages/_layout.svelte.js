import { g as getContext, h as head, a as attr_class, s as stringify, b as store_get, c as slot, u as unsubscribe_stores, d as bind_props } from "../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { e as escape_html } from "../../chunks/escaping.js";
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
    $$renderer2.push(`<div class="admin-shell"><aside class="admin-sidebar fade-in"><div class="brand"><div class="brand-mark" aria-hidden="true"></div> <h1>Decyphr Backoffice</h1> <p>Drafts, preview tokens, and immutable release publishing.</p></div> <div class="sidebar-user"><p class="email">${escape_html(data.auth?.email || "admin")}</p> <p class="role">Role: ${escape_html(data.auth?.role || "admin")}</p></div> <nav class="sidebar-nav" aria-label="Admin navigation"><a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/dashboard") ? "active" : "")}`)} href="/admin/dashboard"><span class="dot" aria-hidden="true"></span> Dashboard</a> <a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/courses") ? "active" : "")}`)} href="/admin/courses"><span class="dot" aria-hidden="true"></span> Courses</a> <a${attr_class(`nav-link ${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/discount-codes") ? "active" : "")}`)} href="/admin/discount-codes"><span class="dot" aria-hidden="true"></span> Discount Codes</a></nav> <p class="sidebar-footer">Environment: production-like admin workflow</p></aside> <main class="admin-main"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _layout as default
};
