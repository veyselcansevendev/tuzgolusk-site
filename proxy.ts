import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().replace(/:\d+$/, "");
  if (host === "www.tuzgolusk.com") {
    const target = new URL("https://tuzgolusk.com");
    target.pathname = request.nextUrl.pathname;
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, 308);
  }
  return NextResponse.next();
}
export const config = { matcher: "/((?!_next/static|_next/image).*)" };
