import { prisma } from './client.js';

// MVP Repositories (cleaned, only existing tables)
export {
  RiderRepository,
  ClubRepository,
  ResultRepository,
  EventRepository,
} from './repositories-mvp.js';

// Export Prisma client
export { prisma };
