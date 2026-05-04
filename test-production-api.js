const axios = require('axios');

async function checkApi() {
  const url = 'https://api.iyf.tv/api/mobile/Video/GetList';
  const params = {
    cid: 1,
    page: 1,
    pageSize: 30,
    t: Math.floor(Date.now() / 1000)
  };
  const headers = {
    'User-Agent': 'IYF/2.0.0 (iPhone; iOS 16.6; Scale/3.00)',
    'Accept-Language': 'zh-Hans-CA;q=1, en-CA;q=0.9',
    'Host': 'api.iyf.tv'
  };

  console.log('Testing IYF Mobile API...');
  try {
    const res = await axios.get(url, { params, headers });
    console.log('Result:', JSON.stringify(res.data));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkApi();
