import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let totalLessons, invalidLessons;
    let courses = [];
    let provider = "file";
    totalLessons = courses.reduce((count, course) => count + (course.lessonCount || 0), 0);
    invalidLessons = courses.reduce((count, course) => count + Math.max(0, (course.lessonCount || 0) - (course.validLessonCount || 0)), 0);
    $$renderer2.push(`<section class="page-card fade-in"><header class="page-header"><div><h2>Courses</h2> <p>Manage drafts and review validation status before publishing.</p></div> <span class="pill pill-active">Provider: ${escape_html(provider)}</span></header> <div class="grid-metrics"><article class="metric"><p class="label">Draft Courses</p> <p class="value">${escape_html(courses.length)}</p></article> <article class="metric"><p class="label">Draft Lessons</p> <p class="value">${escape_html(totalLessons)}</p></article> <article class="metric"><p class="label">Invalid Lessons</p> <p class="value">${escape_html(invalidLessons)}</p></article></div></section> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="page-card fade-in"><p>Loading courses and releases...</p></section>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C18Vg8fE.js.map
