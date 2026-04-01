export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { base64Image, mediaType } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType, data: base64Image } },
              { text: `...ton prompt...` }
            ]
          }]
        })
      }
    );

    const data = await response.json();

    // ✅ 1. Vérifier que l'API n'a pas renvoyé une erreur
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ erreur: `Erreur Gemini : ${data.error?.message || response.status}` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // ✅ 2. Logger pour déboguer (à retirer en prod)
    console.log('Raw Gemini text:', text);

    // ✅ 3. Extraction robuste du JSON avec regex
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('No JSON found in:', text);
      return res.status(500).json({ erreur: "Aucun JSON trouvé dans la réponse de l'IA." });
    }

    try {
      res.json(JSON.parse(match[0]));
    } catch (e) {
      console.error('JSON parse error:', e.message, 'on:', match[0]);
      res.status(500).json({ erreur: "JSON malformé dans la réponse de l'IA." });
    }

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ erreur: err.message });
  }
}