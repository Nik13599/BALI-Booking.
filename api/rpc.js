const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyNFN6t7FHgj45kEMT-aOEISMK7mittnbqKKV2qUIWYBayZUp_DPe5PNslNjQKkiD4G/exec';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ok:true,service:'BALI Booking RPC',version:'20.1.0'});
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  const target = process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 20000);
    const upstream = await fetch(target, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(req.body || {}),
      redirect:'follow',
      signal:controller.signal,
      cache:'no-store'
    });
    clearTimeout(timer);
    const text = await upstream.text();
    if (upstream.status === 405) {
      return res.status(502).json({ok:false,error:'Apps Script backend не обновлён: опубликуйте актуальный Code.gs как новую версию Web App.'});
    }
    let body;
    try { body = JSON.parse(text); }
    catch { return res.status(502).json({ok:false,error:'Apps Script вернул не JSON. Проверьте doPost и актуальное развертывание Web App.'}); }
    return res.status(upstream.ok ? 200 : upstream.status).json(body);
  } catch (e) {
    return res.status(502).json({ok:false,error:e?.name==='AbortError'?'Backend timeout':String(e?.message||e)});
  }
}
