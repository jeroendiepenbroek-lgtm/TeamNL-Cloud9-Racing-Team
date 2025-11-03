import { useState } from 'react';

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ5MjgzMywiZXhwIjoyMDQ2MDY4ODMzfQ.NkV22nxX0pM4G2lEyF1SIHqp3zNVXy0T4YGlFsCFKI4';
const ZWIFT_API_KEY = '650c6d2fc4ef6858d74cbef1';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  data?: {
    name: string;
    club: string;
    ftp: number;
    weight: number;
    wkg: string;
    ranking: number;
    races: number;
  };
}

const workflowSteps = [
  'Voer Zwift Rider ID in',
  'Fetch data van ZwiftRacing API',
  'Parse rider data (FTP, weight, club)',
  'Insert in Supabase database',
  'Verify computed column (watts/kg)',
  'Toon resultaat + cleanup'
];

export default function E2ETest() {
  const [riderId, setRiderId] = useState('150437');
  const [result, setResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [currentStep, setCurrentStep] = useState(0);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult({ status: 'loading', message: 'Start E2E test...' });
    setCurrentStep(0);

    try {
      // Step 1: Fetch from API
      setCurrentStep(1);
      setResult({ status: 'loading', message: 'Ophalen van ZwiftRacing API...' });
      await sleep(300);

      const apiResponse = await fetch(
        `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
        { headers: { 'Authorization': ZWIFT_API_KEY } }
      );

      if (!apiResponse.ok) {
        throw new Error(`API failed: HTTP ${apiResponse.status}`);
      }

      const riderData = await apiResponse.json();

      // Step 2: Parse
      setCurrentStep(2);
      const expectedWkg = (riderData.zpFTP / riderData.weight).toFixed(2);
      setResult({ 
        status: 'loading', 
        message: `Data ontvangen: ${riderData.name} (${expectedWkg} W/kg)` 
      });
      await sleep(300);

      // Step 3: Insert
      setCurrentStep(3);
      setResult({ status: 'loading', message: 'Inserting in database...' });
      await sleep(300);

      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/riders`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            zwift_id: riderData.riderId,
            name: riderData.name,
            club_id: riderData.club?.id || null,
            club_name: riderData.club?.name || null,
            ftp: riderData.zpFTP,
            weight: riderData.weight,
            category_racing: riderData.zpCategory,
            age: parseInt(riderData.age) || null,
            gender: riderData.gender,
            country: riderData.country,
            total_races: riderData.race?.finishes || 0,
            total_wins: riderData.race?.wins || 0,
            ranking: Math.floor(riderData.race?.current?.rating || 0)
          })
        }
      );

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        throw new Error(`Database insert failed: ${error}`);
      }

      const inserted = await insertResponse.json();

      // Step 4: Verify
      setCurrentStep(4);
      setResult({ status: 'loading', message: 'Verifiëren...' });
      await sleep(300);

      const actualWkg = inserted[0].watts_per_kg;

      // Step 5: Cleanup
      setCurrentStep(5);
      setResult({ status: 'loading', message: 'Cleanup...' });
      await sleep(300);

      await fetch(
        `${SUPABASE_URL}/rest/v1/riders?zwift_id=eq.${riderId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      // Success!
      setCurrentStep(6);
      setResult({
        status: 'success',
        message: 'E2E Test Succesvol!',
        data: {
          name: riderData.name,
          club: riderData.club?.name || 'Geen',
          ftp: riderData.zpFTP,
          weight: riderData.weight,
          wkg: actualWkg,
          ranking: Math.floor(riderData.race?.current?.rating || 0),
          races: riderData.race?.finishes || 0
        }
      });

    } catch (error: any) {
      setResult({
        status: 'error',
        message: error.message || 'Test gefaald'
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🚴 TeamNL Cloud9 Racing
        </h1>
        <p className="text-gray-600 mb-8">
          End-to-End Test: ZwiftRacing API → Supabase Database
        </p>

        {/* Workflow */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-purple-600 mb-4">
            📋 Workflow
          </h2>
          <div className="space-y-3">
            {workflowSteps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className={`pt-0.5 text-sm ${index <= currentStep ? 'text-gray-800' : 'text-gray-500'}`}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={runTest} className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Zwift Rider ID
          </label>
          <input
            type="number"
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none mb-4"
            placeholder="Bijv: 150437"
            required
          />
          <button
            type="submit"
            disabled={result.status === 'loading'}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {result.status === 'loading' ? '⏳ Bezig...' : '🚀 Start E2E Test'}
          </button>
        </form>

        {/* Result */}
        {result.status !== 'idle' && (
          <div
            className={`rounded-lg p-6 ${
              result.status === 'success'
                ? 'bg-green-50 border-2 border-green-500'
                : result.status === 'error'
                ? 'bg-red-50 border-2 border-red-500'
                : 'bg-yellow-50 border-2 border-yellow-500'
            }`}
          >
            <h3
              className={`text-lg font-bold mb-2 ${
                result.status === 'success'
                  ? 'text-green-800'
                  : result.status === 'error'
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}
            >
              {result.status === 'loading' && '⏳ '}
              {result.status === 'success' && '🎉 '}
              {result.status === 'error' && '❌ '}
              {result.message}
            </h3>

            {result.data && (
              <>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-600 mb-1">FTP</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {result.data.ftp}W
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-600 mb-1">Gewicht</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {result.data.weight}kg
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-600 mb-1">W/kg</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {result.data.wkg}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-600 mb-1">Ranking</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {result.data.ranking}
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-white rounded-lg p-4 text-sm">
                  <div><strong>Naam:</strong> {result.data.name}</div>
                  <div><strong>Club:</strong> {result.data.club}</div>
                  <div><strong>Races:</strong> {result.data.races}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
