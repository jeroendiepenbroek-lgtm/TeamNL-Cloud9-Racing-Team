import { prisma } from './client.js';

export class TeamRepository {
  async createTeam(data: { name: string; description?: string; clubId?: number }) {
    return prisma.team.create({ data });
  }

  async getTeam(teamId: number) {
    return prisma.team.findUnique({ where: { id: teamId } });
  }

  async listTeams() {
    return prisma.team.findMany();
  }

  async addMember(teamId: number, riderId: number, role = 'member', notes?: string) {
    return prisma.teamMember.create({
      data: {
        teamId,
        riderId,
        role,
        notes,
      },
    });
  }

  async removeMember(teamId: number, riderId: number) {
    return prisma.teamMember.deleteMany({ where: { teamId, riderId } });
  }

  async listMembers(teamId: number) {
    return prisma.teamMember.findMany({ where: { teamId }, include: { rider: true } });
  }
}

export const teamRepo = new TeamRepository();
