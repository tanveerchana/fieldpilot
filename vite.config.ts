import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { seed, reduce, type Workspace } from './src/domain';
// Local development only. Production requests go to api/workspace.ts and Postgres.
function localWorkspace(): Plugin {
  const workspaces = new Map<string, { state: Workspace; revision: number }>();
  return {
    name: 'fieldpilot-local-development-api',
    configureServer(server) {
      server.middlewares.use('/api/workspace', (req, res) => {
        const token = req.headers.authorization?.replace(/^Bearer /, '');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        if (!token || !/^[a-f0-9]{64}$/.test(token)) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: 'A valid demo workspace token is required.' }));
          return;
        }
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed.' }));
          return;
        }
        const current = workspaces.get(token) || { state: seed(), revision: 0 };
        if (req.method === 'GET') {
          workspaces.set(token, current);
          res.end(JSON.stringify(current));
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 100000) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'Request too large.' }));
            req.destroy();
          }
        });
        req.on('end', () => {
          if (res.writableEnded) return;
          try {
            const next = {
              state: reduce(current.state, JSON.parse(body).command),
              revision: current.revision + 1,
            };
            workspaces.set(token, next);
            res.end(JSON.stringify(next));
          } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: (error as Error).message }));
          }
        });
      });
    },
  };
}
export default defineConfig({ plugins: [react(), localWorkspace()] });
