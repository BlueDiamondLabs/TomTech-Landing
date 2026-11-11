module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  const sheet = process.env.DJ_SHEET_URL;
  return res.status(200).json({ djSheetUrl: sheet && sheet.startsWith("https://docs.google.com/spreadsheets/") ? sheet : null });
};
