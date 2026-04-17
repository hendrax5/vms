import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
        session,
        isCustomer: (session?.user as any)?.role?.toLowerCase() === 'customer' || (session?.user as any)?.role?.toLowerCase()?.includes('tenant')
    });
}
