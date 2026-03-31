import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the Queen of Mahshi (ملكة المحشي) restaurant AI assistant. You process uploaded photos and extract structured data.

RESTAURANT CONTEXT:
- POS: Sapaad | Delivery: Talabat (28.3% fee) | Card: Network International (2.26%)
- Card = POS + Link Payment + Visa + Bank Transfer combined
- Notes = problems only (voids, refunds, missing cash)

RULES:
1. Identify what type of document is in the photo
2. Extract ALL numbers and data you can read
3. If something is unclear, say exactly what's unclear and ask
4. Always respond in valid JSON format
5. Amounts are in AED
6. Understand Arabic, English, and Filipino text in photos

RESPONSE FORMAT (always JSON):
{
  "type": "z_report" | "expense_receipt" | "delivery_invoice" | "recipe" | "inventory_count" | "unknown",
  "confidence": "high" | "medium" | "low",
  "data": { ... extracted fields ... },
  "missing": ["list of fields you couldn't read"],
  "questions": ["questions to ask staff if anything unclear"],
  "summary": "one-line human-readable summary"
}

FOR Z REPORTS:
data: { "date": "YYYY-MM-DD", "cash": number, "card": number, "talabat": number, "total": number, "orders": number }

FOR EXPENSE RECEIPTS:
data: { "vendor": "string", "amount": number, "items": [{"name": "string", "amount": number}], "category": "vegetables|bread|drinks|cleaning|other", "date": "YYYY-MM-DD" }

FOR DELIVERY INVOICES:
data: { "supplier": "string", "date": "YYYY-MM-DD", "items": [{"name": "string", "qty": number, "unit": "string"}] }

FOR RECIPE/MENU ITEM:
data: { "item_name": "string", "ingredients": [{"name": "string", "qty": number, "unit": "string"}], "packaging": [{"name": "string", "qty": number}] }

FOR INVENTORY COUNT (photo of shelf/items):
data: { "items": [{"name": "string", "qty": number, "unit": "string"}] }

If the photo is blurry or unreadable, return:
{ "type": "unclear", "confidence": "low", "data": {}, "missing": [], "questions": ["Please take the photo again with better lighting"], "summary": "Photo is not clear enough to read" }`;

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;
    const context = formData.get("context") as string || "";

    if (!file) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: context
                ? `Staff says: "${context}". Process this image and extract the data.`
                : "Process this image and extract the data.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    let result;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonStr = (textBlock?.text || "{}").replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      result = {
        type: "unknown",
        confidence: "low",
        data: {},
        missing: [],
        questions: ["I couldn't process this image. Can you describe what it is?"],
        summary: textBlock?.text || "Processing failed",
      };
    }

    // Log the interaction
    const supabase = await createServiceSupabase();
    await supabase.from("audit_log").insert({
      user_id: session.staffId,
      action: "ai_upload",
      table_name: "ai_interactions",
      new_data: {
        type: result.type,
        confidence: result.confidence,
        summary: result.summary,
        staff: session.staffName,
      },
    });

    return NextResponse.json({
      ...result,
      processedBy: "Claude Vision",
      staffName: session.staffName,
    });
  } catch (err) {
    console.error("AI process error:", err);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}
