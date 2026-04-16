import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'VMS Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "operator@vms.local" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { 
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true
                                    }
                                }
                            }
                        }
                    }
                });

                if (!user) {
                    throw new Error("User not found");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("Incorrect password");
                }

                const userPermissions = user.role.permissions.map(rp => rp.permission.key);

                return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role.name,
                    datacenterId: user.datacenterId,
                    customerId: (user as any).customerId,
                    permissions: userPermissions
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.datacenterId = (user as any).datacenterId;
                token.customerId = (user as any).customerId;
                token.id = user.id;
                token.permissions = (user as any).permissions || [];
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).datacenterId = token.datacenterId;
                (session.user as any).customerId = token.customerId;
                (session.user as any).id = token.id;
                (session.user as any).permissions = token.permissions || [];
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "vms-secret-key-12345-do-not-use-in-prod"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
