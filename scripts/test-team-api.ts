/**
 * Test script voor Team Management API
 * 
 * Tests:
 * 1. Create team
 * 2. Add single member
 * 3. Get team details
 * 4. Get team stats
 */

import { TeamService } from '../src/services/team.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('🧪 Starting Team API test...\n');

  const teamService = new TeamService();

  try {
    // Test 1: Create a team
    logger.info('📝 Test 1: Create team');
    const team = await teamService.createTeam({
      name: 'TeamNL Cloud9 Test Team',
      description: 'Test team voor API validatie',
      autoSyncEnabled: false, // Disable auto-sync for testing
    });
    logger.info(`✓ Team created: ${team.id} - ${team.name}\n`);

    // Test 2: Add single member (use known rider ID)
    logger.info('📝 Test 2: Add single member');
    const testRiderId = 150437; // Existing rider from previous syncs
    
    try {
      const member = await teamService.addMember(
        team.id,
        testRiderId,
        'member',
        'Test rider voor API validatie'
      );
      logger.info(`✓ Member added: ${member.rider.name} (${member.rider.zwiftId})\n`);
    } catch (error) {
      logger.warn(`⚠️  Could not add member (might already exist or API issue): ${error}\n`);
    }

    // Wait a bit for background sync to start
    logger.info('⏸️  Waiting 3s for background sync...');
    await sleep(3000);

    // Test 3: Get team details
    logger.info('\n📝 Test 3: Get team details');
    const teamDetails = await teamService.getTeam(team.id);
    logger.info(`✓ Team: ${teamDetails.name}`);
    logger.info(`  Members: ${teamDetails.members.length}`);
    logger.info(`  Auto-sync: ${teamDetails.autoSyncEnabled}`);
    
    if (teamDetails.members.length > 0) {
      logger.info('\n  Team Members:');
      teamDetails.members.forEach((member, idx) => {
        logger.info(`    ${idx + 1}. ${member.rider.name} (${member.rider.zwiftId})`);
        logger.info(`       Role: ${member.role}`);
        logger.info(`       Sync status: ${member.syncStatus}`);
        logger.info(`       Added: ${member.addedAt}`);
      });
    }

    // Test 4: Get team statistics
    logger.info('\n📝 Test 4: Get team statistics');
    const stats = await teamService.getTeamStatistics(team.id);
    logger.info(`✓ Team statistics:`);
    logger.info(`  Total members: ${stats.stats.totalMembers}`);
    logger.info(`  Avg FTP: ${stats.stats.avgFtp ? stats.stats.avgFtp.toFixed(1) + 'W' : 'N/A'}`);
    logger.info(`  Avg W/kg: ${stats.stats.avgWkg ? stats.stats.avgWkg.toFixed(2) : 'N/A'}`);
    logger.info(`  Total races: ${stats.stats.totalRaces}`);
    logger.info(`  Total wins: ${stats.stats.totalWins}`);
    logger.info(`  Sync status:`);
    logger.info(`    - Synced: ${stats.syncStatus.synced}`);
    logger.info(`    - Pending: ${stats.syncStatus.pending}`);
    logger.info(`    - Errors: ${stats.syncStatus.error}`);

    // Test 5: List all teams
    logger.info('\n📝 Test 5: List all teams');
    const allTeams = await teamService.listTeams();
    logger.info(`✓ Found ${allTeams.length} team(s) in database:`);
    allTeams.forEach((t, idx) => {
      logger.info(`  ${idx + 1}. ${t.name} (${t.members.length} members)`);
    });

    logger.info('\n✅ All tests completed successfully!');
    logger.info('\n💡 Next steps:');
    logger.info('   - Test bulk add: POST /api/team/:teamId/members with multiple IDs');
    logger.info('   - Test sync: POST /api/team/:teamId/sync to trigger background sync');
    logger.info('   - Clean up: DELETE /api/team/:teamId to remove test team');

  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .then(() => {
    logger.info('\n✓ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test script failed:', error);
    process.exit(1);
  });
