import { NextResponse } from "next/server";
import { getBookedSeats } from "@/lib/db";
import { findShowtime } from "@/lib/cinema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert die bereits gebuchten Sitzplätze einer Vorstellung.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const showtime = findShowtime(params.id);
  if (!showtime) {
    return NextResponse.json({ ok: false, message: "Vorstellung nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    showtimeId: showtime.id,
    booked: getBookedSeats(showtime.id),
  });
}
