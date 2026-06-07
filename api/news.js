// JAG Records - live music news aggregator (Vercel Serverless Function)
// Server-side RSS fetch + parse (no deps, no CORS), edge-cached so the
// page always shows fresh headlines with images and excerpts.
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
  const strip = (s) => (s || '')
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'").replace(/&#8211;/g, '-').replace(/&#8230;/g, '...')
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/\s+/g, ' ').trim();

  const imgFrom = (b) => {
    let m = b.match(/<media:content[^>]*url="([^"]+)"/i) ||
            b.match(/<media:thumbnail[^>]*url="([^"]+)"/i) ||
            b.match(/<enclosure[^>]*url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) ||
            b.match(/<img[^>]*src="([^"]+)"/i);
    return m ? m[1] : '';
  };

  const out = [];
  await Promise.all(feeds.map(async ([src, url]) => {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (JAG Records News Bot)' } });
      if (!r.ok) return;
      const xml = await r.text();
      const blocks = xml.split(/<item[\s>]/i).slice(1, 7);
      for (const b of blocks) {
        const title = strip(pick(b, 'title'));
        let link = strip(pick(b, 'link'));
        if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); if (m) link = m[1]; }
        const date = strip(pick(b, 'pubDate')) || strip(pick(b, 'dc:date'));
        let excerpt = strip(pick(b, 'description'));
        if (excerpt.length > 160) excerpt = excerpt.slice(0, 157).trim() + '...';
        const image = imgFrom(b);
        if (title) out.push({ title, link: link || '#', date, src, excerpt, image });
      }
    } catch (e) { /* skip failing feed */ }
  }));

  out.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ items: out.slice(0, 24), updated: new Date().toISOString() });
}
