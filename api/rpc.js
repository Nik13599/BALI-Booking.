export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  const target = process.env.APPS_SCRIPT_URL;
  if (!target) return res.status(500).json({ok:false,error:'APPS_SCRIPT_URL is not configured'});
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 20000);
    const upstream = await fetch(target, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(req.body || {}),
      redirect:'follow',
      signal:controller.signal
    });
    clearTimeout(timer);
    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); }
    catch { return res.status(502).json({ok:false,error:'Apps Script returned an invalid response'}); }
    return res.status(upstream.ok ? 200 : upstream.status).json(body);
  } catch (e) {
    return res.status(502).json({ok:false,error:e?.name==='AbortError'?'Backend timeout':String(e?.message||e)});
  }
}
