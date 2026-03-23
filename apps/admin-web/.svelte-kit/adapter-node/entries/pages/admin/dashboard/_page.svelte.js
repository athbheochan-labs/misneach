import { p as attr } from "../../../../chunks/attributes.js";
import { e as escape_html } from "../../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let loading = true;
    $$renderer2.push(`<section class="page-card fade-in"><header class="page-header"><div><h2>Engagement Dashboard</h2> <p>Completion, drop-off, feature usage, and course-goal/challenge engagement.</p></div> <button class="btn"${attr("disabled", loading, true)}>${escape_html("Refreshing...")}</button></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="page-card fade-in"><p>Loading analytics…</p></section>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
