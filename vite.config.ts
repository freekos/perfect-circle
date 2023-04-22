import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"~src": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		outDir: "build",
		sourcemap: true,
	},
	plugins: [
		react(),
		checker({
			typescript: true,
			overlay: {
				initialIsOpen: false,
				position: "br",
			},
			// eslint: {
			// 	lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
			// },
		}),

		VitePWA({
			manifest: {
				name: "Colecta",
				short_name: "colecta",
				start_url: "/home",
				display: "standalone",
				background_color: "#ffffff",
				lang: "en",
				scope: "/",
				icons: [
					{
						src: "/android-chrome-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any maskable",
					},
					{
						src: "/android-chrome-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
				theme_color: "#ffffff",
			},
		}),
	],
});
