import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

const app = express();

app.get('/test', async (req, res) => {
  try {
    console.log('Test endpoint hit');
    
    const { data, error } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*')
      .eq('rider_id', 150437)
      .limit(5);

    console.log('Query done:', { rows: data?.length, error });
    
    res.json({ 
      success: true, 
      count: data?.length,
      results: data 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
