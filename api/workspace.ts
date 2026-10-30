import { createWorkspaceHandler } from './_lib/workspace.js';
import { seed, reduce, type Workspace } from '../src/domain.js';
export default createWorkspaceHandler<Workspace>({app:'fieldpilot',seed,reduce});
