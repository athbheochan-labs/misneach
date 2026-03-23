import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.6kB0uJDf.js","_app/immutable/chunks/DWl0aRWR.js","_app/immutable/chunks/DQOCauAi.js","_app/immutable/chunks/7TiLPmAh.js","_app/immutable/chunks/BS0r5F2C.js","_app/immutable/chunks/DMhgFjwg.js","_app/immutable/chunks/DqOkPA8j.js","_app/immutable/chunks/NncHjJFE.js","_app/immutable/chunks/DhhxjDsr.js","_app/immutable/chunks/BBoSBWZm.js","_app/immutable/chunks/BLnzv3Cn.js","_app/immutable/chunks/CyJtSTYq.js","_app/immutable/chunks/BanaRhV0.js","_app/immutable/chunks/DxYGrXeO.js"];
export const stylesheets = ["_app/immutable/assets/0.OO3pKoCu.css"];
export const fonts = [];
