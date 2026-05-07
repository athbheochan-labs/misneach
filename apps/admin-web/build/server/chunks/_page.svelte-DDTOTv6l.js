import { e as attr } from './attributes-DB4d7OBb.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const emptyForm = () => ({
      id: null,
      key: "",
      legacyId: "",
      title: "",
      audience: "staff",
      description: "",
      isActive: true,
      questionsJson: "[]"
    });
    let saving = false;
    let form = emptyForm();
    $$renderer2.push(`<section class="page-card fade-in"><header class="page-header"><div><h2>Survey Templates</h2> <p>Create and manage DB-backed survey definitions used by setup preview and live forms.</p></div> <button class="btn">New template</button></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="field-grid cols-3" style="margin-top: 12px;"><div class="field"><label for="key">Key</label> <input id="key"${attr("value", form.key)} placeholder="staff-appetite"/></div> <div class="field"><label for="legacyId">Legacy ID (optional)</label> <input id="legacyId"${attr("value", form.legacyId)} placeholder="staff-cafe-v1"/></div> <div class="field"><label for="audience">Audience</label> `);
    $$renderer2.select({ id: "audience", value: form.audience }, ($$renderer3) => {
      $$renderer3.option({ value: "staff" }, ($$renderer4) => {
        $$renderer4.push(`Staff`);
      });
      $$renderer3.option({ value: "customers" }, ($$renderer4) => {
        $$renderer4.push(`Customers`);
      });
    });
    $$renderer2.push(`</div></div> <div class="field-grid cols-3" style="margin-top: 10px;"><div class="field"><label for="title">Title</label> <input id="title"${attr("value", form.title)}/></div> <div class="field"><label for="active">Active</label> `);
    $$renderer2.select({ id: "active", value: form.isActive }, ($$renderer3) => {
      $$renderer3.option({ value: true }, ($$renderer4) => {
        $$renderer4.push(`true`);
      });
      $$renderer3.option({ value: false }, ($$renderer4) => {
        $$renderer4.push(`false`);
      });
    });
    $$renderer2.push(`</div> <div class="field"></div></div> <div class="field" style="margin-top: 10px;"><label for="description">Description</label> <textarea id="description" class="textarea-md">`);
    const $$body = escape_html(form.description);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="field" style="margin-top: 10px;"><label for="questions">Questions JSON</label> <textarea id="questions" class="textarea-lg mono">`);
    const $$body_1 = escape_html(form.questionsJson);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></div> <div style="margin-top: 10px;"><button class="btn btn-primary"${attr("disabled", saving, true)}>${escape_html("Create template")}</button></div></section> <section class="page-card fade-in"><h3 class="section-title">Existing Templates</h3> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>Loading templates...</p>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DDTOTv6l.js.map
