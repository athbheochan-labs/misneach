export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DsgE073C.js",app:"_app/immutable/entry/app.UDwTt6__.js",imports:["_app/immutable/entry/start.DsgE073C.js","_app/immutable/chunks/BanaRhV0.js","_app/immutable/chunks/DQOCauAi.js","_app/immutable/chunks/BLnzv3Cn.js","_app/immutable/chunks/DxYGrXeO.js","_app/immutable/entry/app.UDwTt6__.js","_app/immutable/chunks/DQOCauAi.js","_app/immutable/chunks/BS0r5F2C.js","_app/immutable/chunks/DWl0aRWR.js","_app/immutable/chunks/DxYGrXeO.js","_app/immutable/chunks/BWY7TCjC.js","_app/immutable/chunks/DhhxjDsr.js","_app/immutable/chunks/BBoSBWZm.js","_app/immutable/chunks/BLnzv3Cn.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin/courses",
				pattern: /^\/admin\/courses\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/admin/courses/[courseSlug]/[lessonSlug]",
				pattern: /^\/admin\/courses\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"courseSlug","optional":false,"rest":false,"chained":false},{"name":"lessonSlug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin/dashboard",
				pattern: /^\/admin\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/discount-codes",
				pattern: /^\/admin\/discount-codes\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/api/admin/[...path]",
				pattern: /^\/api\/admin(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/_...path_/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
