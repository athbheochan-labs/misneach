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
		client: {start:"_app/immutable/entry/start.BxOezRWu.js",app:"_app/immutable/entry/app.B__ExlOd.js",imports:["_app/immutable/entry/start.BxOezRWu.js","_app/immutable/chunks/CgAOMZ2K.js","_app/immutable/chunks/CFwErDml.js","_app/immutable/chunks/D03Jp5QD.js","_app/immutable/chunks/CIDESXl7.js","_app/immutable/entry/app.B__ExlOd.js","_app/immutable/chunks/CFwErDml.js","_app/immutable/chunks/C0qFw6jL.js","_app/immutable/chunks/CV-uo2Ve.js","_app/immutable/chunks/CIDESXl7.js","_app/immutable/chunks/Bc0eKxI-.js","_app/immutable/chunks/BVQxI_WU.js","_app/immutable/chunks/C4WcZA4Q.js","_app/immutable/chunks/D03Jp5QD.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js'))
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
				id: "/admin/analytics",
				pattern: /^\/admin\/analytics\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/admin/courses",
				pattern: /^\/admin\/courses\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin/courses/[courseSlug]/[lessonSlug]",
				pattern: /^\/admin\/courses\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"courseSlug","optional":false,"rest":false,"chained":false},{"name":"lessonSlug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/dashboard",
				pattern: /^\/admin\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/admin/discount-codes",
				pattern: /^\/admin\/discount-codes\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/admin/surveys",
				pattern: /^\/admin\/surveys\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
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

export const prerendered = new Set([]);

export const base = "";