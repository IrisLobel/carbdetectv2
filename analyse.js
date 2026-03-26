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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      res.json(JSON.parse(clean));
    } catch {
      res.status(500).json({ erreur: "Réponse invalide de l'IA." });
    }

  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
}
