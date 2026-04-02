
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ erreur: 'Clé API Gemini manquante' });
  }

  const { base64Image, mediaType } = req.body;

  if (!base64Image || !mediaType) {
    return res.status(400).json({ erreur: 'base64Image et mediaType requis' });
  }

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
              { text: `Tu es un nutritionniste expert. Analyse cette photo de repas.
Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks) :
{
  "aliments": [{"nom":"...","portion":"150g","glucides_g":35}],
  "total_glucides_g": 75,
  "fourchette_min": 60,
  "fourchette_max": 90,
  "dont_sucres_g": 12,
  "fibres_g": 4,
  "calories_estimees": 420,
  "index_glycemique": "Moyen (55-70)",
  "conseil": "Un conseil nutritionnel court et pratique."
}
Si aucune nourriture n'est visible : {"erreur": "Aucun aliment détecté."}` }
            ]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', data);
      return res.status(500).json({ erreur: `Erreur Gemini : ${data.error?.message || response.status}` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini raw:', text);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ erreur: "Aucun JSON dans la réponse." });
    }

    try {
      res.json(JSON.parse(match[0]));
    } catch {
      res.status(500).json({ erreur: "JSON malformé." });
    }

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ erreur: err.message });
  }
}
