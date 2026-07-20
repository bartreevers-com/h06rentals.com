import { NextRequest, NextResponse } from "next/server";
import { readLocalFile, STORAGE_DRIVER, verifyLocalToken } from "@/lib/recruitment/storage";

/** Serves local-driver files against an HMAC-signed expiring token.
 *  Only active in development (Supabase Storage handles production). */
export async function GET(req: NextRequest) {
  if (STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const expires = Number(req.nextUrl.searchParams.get("expires"));
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!path || !expires || !token || path.includes("..")) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }
  try {
    if (!verifyLocalToken(path, expires, token)) {
      return NextResponse.json({ error: "Link expired" }, { status: 403 });
    }
    const data = readLocalFile(path);
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
