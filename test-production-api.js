const axios = require('axios');

async function checkApi() {
  const url = 'https://api.miolive.tv/api/v1/Video/GetList';
  const params = {
    cid: 1,
    page: 1,
    pageSize: 30,
    orderBy: 'latest',
    desc: 1,
    t: Math.floor(Date.now() / 1000)
  };
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.yfsp.tv',
    'Referer': 'https://www.yfsp.tv/'
  };

  console.log('Testing MIOLIVE API...');
  try {
    const res = await axios.get(url, { params, headers });
    console.log('Result:', JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkApi();
