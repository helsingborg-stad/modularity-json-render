import { createViteConfig } from "vite-config-factory";

const entries = {
        'js/Admin/IndexAdmin': './source/js/Admin/IndexAdmin.tsx',
        'js/Front/IndexFront': './source/js/Front/IndexFront.tsx',        
        'css/modularity-json-render-admin': './source/sass/modularity-json-render-admin.scss',
        'css/modularity-json-render-front': './source/sass/modularity-json-render-front.scss'
};

export default createViteConfig(entries, {
	outDir: "assets/dist",
	manifestFile: "manifest.json",
});
