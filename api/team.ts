import { createTeamHandler } from './_lib/team.js';
import { seed } from '../src/domain.js';
export default createTeamHandler({ app: 'fieldpilot', seed: seed });
