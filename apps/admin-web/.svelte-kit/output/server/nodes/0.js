import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.C5Ulb1Ya.js","_app/immutable/chunks/CV-uo2Ve.js","_app/immutable/chunks/CFwErDml.js","_app/immutable/chunks/ZzBmS5aR.js","_app/immutable/chunks/C0qFw6jL.js","_app/immutable/chunks/BxzefiSg.js","_app/immutable/chunks/DOx_Xe0r.js","_app/immutable/chunks/tYs969gl.js","_app/immutable/chunks/BVQxI_WU.js","_app/immutable/chunks/C4WcZA4Q.js","_app/immutable/chunks/D03Jp5QD.js","_app/immutable/chunks/DQARHGcH.js","_app/immutable/chunks/CgAOMZ2K.js","_app/immutable/chunks/CIDESXl7.js"];
export const stylesheets = ["_app/immutable/assets/0.OO3pKoCu.css"];
export const fonts = [];
