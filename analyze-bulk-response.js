// Parse de eerste succesvolle response om structuur te zien
const sampleResponse = {
  "name": "JRøne  CloudRacer-9 @YT (TeamNL)",
  "country": "nl",
  "zpCategory": "B",
  "zpFTP": 239,
  "race": {
    "current": {
      "rating": 1415.1223157205175
    }
  }
};

console.log('📋 Sample response structure:');
console.log(JSON.stringify(sampleResponse, null, 2));
console.log('');
console.log('Missing: zwiftId or id field!');
console.log('');
console.log('⚠️  We need to map riders by index!');
console.log('   Request: [150437, 8, 5574]');
console.log('   Response index 0 = rider 150437');
console.log('   Response index 1 = rider 8');
console.log('   Response index 2 = rider 5574');
