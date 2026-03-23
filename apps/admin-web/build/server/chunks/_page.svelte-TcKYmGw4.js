import { e as attr } from './attributes-DB4d7OBb.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const emptyForm = () => ({
      id: null,
      code: "",
      label: "",
      description: "",
      audience: "both",
      appliesTo: "any",
      discountType: "percent",
      discountValue: 10,
      currency: "eur",
      isEnabled: true,
      startsAt: "",
      endsAt: ""
    });
    let saving = false;
    let form = emptyForm();
    $$renderer2.push(`<section class="page-card fade-in"><header class="page-header"><div><h2>Discount Codes</h2> <p>Create, enable, and schedule promo windows for learner and business checkout flows.</p></div> <button class="btn">New code</button></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="field-grid cols-3" style="margin-top: 12px;"><div class="field"><label for="code">Code</label> <input id="code"${attr("value", form.code)} placeholder="e.g. SPRING25"/></div> <div class="field"><label for="label">Label</label> <input id="label"${attr("value", form.label)} placeholder="Spring launch"/></div> <div class="field"><label for="currency">Currency</label> <input id="currency"${attr("value", form.currency)}/></div></div> <div class="field" style="margin-top: 10px;"><label for="description">Description</label> <textarea id="description" class="textarea-md">`);
    const $$body = escape_html(form.description);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="field-grid cols-3" style="margin-top: 10px;"><div class="field"><label for="audience">Audience</label> `);
    $$renderer2.select({ id: "audience", value: form.audience }, ($$renderer3) => {
      $$renderer3.option({ value: "both" }, ($$renderer4) => {
        $$renderer4.push(`Both`);
      });
      $$renderer3.option({ value: "learner" }, ($$renderer4) => {
        $$renderer4.push(`Learner`);
      });
      $$renderer3.option({ value: "business" }, ($$renderer4) => {
        $$renderer4.push(`Business`);
      });
    });
    $$renderer2.push(`</div> <div class="field"><label for="appliesTo">Applies To</label> `);
    $$renderer2.select({ id: "appliesTo", value: form.appliesTo }, ($$renderer3) => {
      $$renderer3.option({ value: "any" }, ($$renderer4) => {
        $$renderer4.push(`Any`);
      });
      $$renderer3.option({ value: "monthly" }, ($$renderer4) => {
        $$renderer4.push(`Monthly`);
      });
      $$renderer3.option({ value: "annual" }, ($$renderer4) => {
        $$renderer4.push(`Annual`);
      });
      $$renderer3.option({ value: "business-kit" }, ($$renderer4) => {
        $$renderer4.push(`Business kit`);
      });
    });
    $$renderer2.push(`</div> <div class="field"><label for="isEnabled">Enabled</label> `);
    $$renderer2.select({ id: "isEnabled", value: form.isEnabled }, ($$renderer3) => {
      $$renderer3.option({ value: true }, ($$renderer4) => {
        $$renderer4.push(`Enabled`);
      });
      $$renderer3.option({ value: false }, ($$renderer4) => {
        $$renderer4.push(`Disabled`);
      });
    });
    $$renderer2.push(`</div></div> <div class="field-grid cols-3" style="margin-top: 10px;"><div class="field"><label for="discountType">Discount Type</label> `);
    $$renderer2.select({ id: "discountType", value: form.discountType }, ($$renderer3) => {
      $$renderer3.option({ value: "percent" }, ($$renderer4) => {
        $$renderer4.push(`Percent`);
      });
      $$renderer3.option({ value: "fixed_cents" }, ($$renderer4) => {
        $$renderer4.push(`Fixed cents`);
      });
    });
    $$renderer2.push(`</div> <div class="field"><label for="discountValue">Discount Value</label> <input id="discountValue" type="number" min="0"${attr("value", form.discountValue)}/></div> <div class="field"></div></div> <div class="field-grid cols-3" style="margin-top: 10px;"><div class="field"><label for="startsAt">Starts At (optional)</label> <input id="startsAt" type="datetime-local"${attr("value", form.startsAt)}/></div> <div class="field"><label for="endsAt">Ends At (optional)</label> <input id="endsAt" type="datetime-local"${attr("value", form.endsAt)}/></div> <div class="field" style="display:flex;align-items:flex-end;"><button class="btn btn-primary"${attr("disabled", saving, true)}>${escape_html("Create code")}</button></div></div></section> <section class="page-card fade-in"><h3 class="section-title">Existing Codes</h3> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>Loading discount codes...</p>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-TcKYmGw4.js.map
