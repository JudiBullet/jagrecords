// JAG Records - live music news aggregator (Vercel Serverless Function)
// Fetches RSS feeds server-side (no CORS), parses without dependencies,
// caches at the edge so the page always shows fresh headlines.
export default async function handler(req, res) {
  const feeds = [
    ['Loudwire', 'https://loudwire.com/feed/'],
    ['NME', 'https://www.nme.com/news/music/feed'],
    ['Stereogum', 'https://www.stereogum.com/feed/'],
    ['Metal Injection', 'https://metalinjection.net/feed/'],
    ['Consequence', 'https://consequence.net/feed/'],
    ['Brooklyn Vegan', 'https://www.brooklynvegan.com/feed/'],
    ['Pitchfork', 'https://pitchfork.com/feed/feed-news/rss']
  ];

  const pick = (s, tag) => {
    const m = s.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
    return m ? m[1] : '';
  };
  const clean = (s) => (s || '')
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

  const out = [];
  await Promise.all(feeds.map(async ([src, url]) => {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (JAG Records News Bot)' } });
      if (!r.ok) return;
      const xml = await r.text();
      const blocks = xml.split(/<item[\s>]/i).slice(1, 6);
      for (const b of blocks) {
        const title = clean(pick(b, 'title'));
        let link = clean(pick(b, 'link'));
        if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); if (m) link = m[1]; }
        const date = clean(pick(b, 'pubDate')) || clean(pick(b, 'dc:date'));
        if (title) out.push({ title, link: link || '#', date, src });
      }
    } catch (e) { /* skip failing feed */ }
  }));

  out.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ items: out.slice(0, 12), updated: new Date().toISOString() });
}
