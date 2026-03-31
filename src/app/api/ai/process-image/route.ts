import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the Queen of Mahshi restaurant AI. You process photos and extract data. Be fast, smart, and don't over-ask.

CONTEXT:
- POS: Sapaad | Delivery: Talabat (28.3% fee) | Card: Network International (2.26%)
- Card = POS + Link + Visa + Bank Transfer combined
- Currency: AED | Languages: Arabic, English, Filipino

CRITICAL RULES:
1. If the staff told you what the document is (in the context message), TRUST THEM. Don't ask again.
2. Extract whatever numbers you CAN read. Don't ask about things you can figure out.
3. If you got the main data (amounts, items), go with it. Set confidence to "medium" if some minor details are missing.
4. ONLY ask questions if critical numbers are completely unreadable (like total amount is cut off).
5. NEVER ask "what is this document?" if the staff already told you.
6. Keep questions to maximum 1-2. Not a list of 5 questions.
7. If you can guess a field from context (today's date, category from items), just fill it in.

RESPONSE FORMAT (always valid JSON, nothing else):
{
  "type": "z_report" | "expense_receipt" | "delivery_invoice" | "recipe" | "inventory_count" | "bank_statement" | "other",
  "confidence": "high" | "medium" | "low",
  "data": { ... },
  "missing": [],
  "questions": [],
  "summary": "short one-line summary"
}

TYPE FORMATS:
- z_report: { "date": "YYYY-MM-DD", "cash": N, "card": N, "talabat": N, "total": N, "orders": N }
- expense_receipt: { "vendor": "X", "amount": N, "items": [{"name":"X","amount":N}], "category": "vegetables|bread|drinks|cleaning|other", "date": "YYYY-MM-DD" }
- delivery_invoice: { "supplier": "X", "date": "YYYY-MM-DD", "items": [{"name":"X","qty":N,"unit":"X"}] }
- recipe: { "item_name": "X", "ingredients": [{"name":"X","qty":N,"unit":"X"}], "packaging": [{"name":"X","qty":N}] }
- inventory_count: { "items": [{"name":"X","qty":N,"unit":"X"}] }
- bank_statement: { "transactions": [{"date":"X","description":"X","debit":N,"credit":N,"balance":N}] }
- other: { "description": "X", "amounts": [N], "text_found": "X" }

If photo is truly unreadable (blurry, black, wrong orientation):
{ "type": "unclear", "confidence": "low", "data": {}, "missing": [], "questions": ["Photo is not clear. Please retake with better lighting."], "summary": "Cannot read photo" }

REMEMBER: Extract first, ask later. If you got 80% of the data, that's enough — save it.`;

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
