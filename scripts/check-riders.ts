#!/usr/bin/env tsx
import { prisma } from '../src/database/client.js';

async function checkRiders() {
  const riders = await prisma.rider.findMany({
    where: {
      zwiftId: { in: [1495, 150437, 1813927] }
    },
    select: {
      zwiftId: true,
      name: true,
      ftp: true,
      ftpWkg: true,
      weight: true,
      height: true,
      gender: true,
      countryCode: true,
      categoryRacing: true,
      totalWins: true,
      totalPodiums: true,
      totalRaces: true,
      lastActive: true,
    },
    orderBy: { zwiftId: 'asc' }
  });

  console.log('\n📊 Test Riders Status:\n');
  
  riders.forEach(rider => {
    console.log(`👤 ${rider.name} (${rider.zwiftId})`);
    console.log(`   FTP: ${rider.ftp || 'N/A'} W${rider.ftpWkg ? ` (${rider.ftpWkg.toFixed(2)} W/kg)` : ''}`);
    console.log(`   Weight: ${rider.weight || 'N/A'} kg, Height: ${rider.height || 'N/A'} cm`);
    console.log(`   Gender: ${rider.gender || 'N/A'}, Country: ${rider.countryCode || 'N/A'}`);
    console.log(`   Category: ${rider.categoryRacing || 'N/A'}`);
    console.log(`   Races: ${rider.totalRaces || 0}, Wins: ${rider.totalWins || 0}, Podiums: ${rider.totalPodiums || 0}`);
    console.log(`   Last Active: ${rider.lastActive ? rider.lastActive.toISOString().split('T')[0] : 'N/A'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkRiders();
