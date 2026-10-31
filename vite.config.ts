import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// Use the same server handlers in development and production. No local auth bypass.
function workspaceApi(): Plugin {
  return {
    name: 'fieldpilot-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const route = req.url?.split('?')[0];
        if (!route || !['/workspace', '/auth', '/team'].includes(route)) return next();
        try {
          const module = await server.ssrLoadModule(`/api${route}.ts`);
          await module.default(req, res);
        } catch {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              error:
                'The workspace API is unavailable locally. Configure the server environment or use the deployed application.',
            }),
          );
        }
      });
    },
  };
}
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const name of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'PORTFOLIO_BACKEND_KEY']) {
    if (env[name] && !process.env[name]) process.env[name] = env[name];
  }
  return { plugins: [react(), workspaceApi()] };
});
