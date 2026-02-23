import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../src/lib/firebaseAdmin";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const data = req.body;
    const ref = db.ref("members");
    await ref.push(data);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: "Failed to save member",
      details: error.message,
    });
  }
}