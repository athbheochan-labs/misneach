
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/analytics" | "/admin/courses" | "/admin/courses/[courseSlug]" | "/admin/courses/[courseSlug]/[lessonSlug]" | "/admin/dashboard" | "/admin/discount-codes" | "/admin/surveys" | "/api" | "/api/admin" | "/api/admin/[...path]";
		RouteParams(): {
			"/admin/courses/[courseSlug]": { courseSlug: string };
			"/admin/courses/[courseSlug]/[lessonSlug]": { courseSlug: string; lessonSlug: string };
			"/api/admin/[...path]": { path: string }
		};
		LayoutParams(): {
			"/": { courseSlug?: string; lessonSlug?: string; path?: string };
			"/admin": { courseSlug?: string; lessonSlug?: string };
			"/admin/analytics": Record<string, never>;
			"/admin/courses": { courseSlug?: string; lessonSlug?: string };
			"/admin/courses/[courseSlug]": { courseSlug: string; lessonSlug?: string };
			"/admin/courses/[courseSlug]/[lessonSlug]": { courseSlug: string; lessonSlug: string };
			"/admin/dashboard": Record<string, never>;
			"/admin/discount-codes": Record<string, never>;
			"/admin/surveys": Record<string, never>;
			"/api": { path?: string };
			"/api/admin": { path?: string };
			"/api/admin/[...path]": { path: string }
		};
		Pathname(): "/" | "/admin/analytics" | "/admin/courses" | `/admin/courses/${string}/${string}` & {} | "/admin/dashboard" | "/admin/discount-codes" | "/admin/surveys" | `/api/admin/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}