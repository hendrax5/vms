import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NocDashboard from "@/app/components/dashboard/NocDashboard";
import TenantDashboard from "@/app/components/dashboard/TenantDashboard";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const userRole = (session.user as any)?.role as string;

    if (userRole === "Customer") {
        return <TenantDashboard />;
    }

    // Default to NOC/Admin dashboard for SuperAdmin and NOC roles
    return <NocDashboard />;
}
