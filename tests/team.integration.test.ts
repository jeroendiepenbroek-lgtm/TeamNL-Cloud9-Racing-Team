/**
 * Integration tests voor Team Management
 * 
 * Test de volledige flow van team creation tot member sync
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TeamService } from '../src/services/team.js';
import { TeamRepository } from '../src/database/repositories.js';
import { prisma } from '../src/database/client.js';

describe('Team Management Integration Tests', () => {
  let teamService: TeamService;
  let teamRepo: TeamRepository;
  let testTeamId: number;

  beforeAll(() => {
    teamService = new TeamService();
    teamRepo = new TeamRepository();
  });

  afterAll(async () => {
    // Cleanup: remove test teams
    if (testTeamId) {
      try {
        await teamRepo.deleteTeam(testTeamId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await prisma.$disconnect();
  });

  describe('Team Creation', () => {
    it('should create a new team', async () => {
      const team = await teamService.createTeam({
        name: 'Test Team',
        description: 'Integration test team',
        autoSyncEnabled: false,
      });

      expect(team).toBeDefined();
      expect(team.name).toBe('Test Team');
      expect(team.description).toBe('Integration test team');
      expect(team.autoSyncEnabled).toBe(false);
      expect(team.members).toHaveLength(0);

      testTeamId = team.id;
    });

    it('should list all teams', async () => {
      const teams = await teamService.listTeams();
      
      expect(teams).toBeDefined();
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
    });

    it('should get team by id', async () => {
      const team = await teamService.getTeam(testTeamId);
      
      expect(team).toBeDefined();
      expect(team.id).toBe(testTeamId);
      expect(team.name).toBe('Test Team');
    });
  });

  describe('Team Statistics', () => {
    it('should get team statistics', async () => {
      const stats = await teamService.getTeamStatistics(testTeamId);
      
      expect(stats).toBeDefined();
      expect(stats.team.id).toBe(testTeamId);
      expect(stats.stats).toBeDefined();
      expect(stats.stats.totalMembers).toBe(0);
      expect(stats.syncStatus).toBeDefined();
    });
  });

  describe('Member Management', () => {
    it('should detect duplicate member', async () => {
      // Add a member twice
      const testRiderId = 150437;
      
      // First add should succeed
      await teamService.addMember(testTeamId, testRiderId, 'member', 'Test rider');
      
      // Second add should fail
      await expect(
        teamService.addMember(testTeamId, testRiderId, 'member')
      ).rejects.toThrow('already a member');
    });

    it('should remove member from team', async () => {
      const testRiderId = 150437;
      
      await teamService.removeMember(testTeamId, testRiderId);
      
      const team = await teamService.getTeam(testTeamId);
      expect(team.members).toHaveLength(0);
    });
  });

  describe('Repository Operations', () => {
    it('should check if rider is in team', async () => {
      const testRiderId = 1; // Use internal DB ID
      
      const inTeam = await teamRepo.isRiderInTeam(testTeamId, testRiderId);
      expect(typeof inTeam).toBe('boolean');
    });

    it('should get pending team members', async () => {
      const pending = await teamRepo.getPendingTeamMembers(testTeamId);
      
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should update team sync timestamp', async () => {
      const before = new Date();
      
      await teamRepo.updateTeamSyncTimestamp(testTeamId);
      
      const team = await teamRepo.getTeam(testTeamId);
      expect(team?.lastSyncedAt).toBeDefined();
      expect(team?.lastSyncedAt! >= before).toBe(true);
    });
  });
});
