"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_crypto_1 = require("node:crypto");
const adapter_pg_1 = require("@prisma/adapter-pg");
const crypto_1 = require("better-auth/crypto");
const client_1 = require("../generated/prisma/client");
const connectionString = process.env.SEED_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("SEED_DATABASE_URL or DATABASE_URL is required.");
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
});
const name = process.env.SEED_ADMIN_NAME || "EcoSpark Admin";
const email = (process.env.SEED_ADMIN_EMAIL || "admin@ecospark.local")
    .trim()
    .toLowerCase();
const password = (process.env.SEED_ADMIN_PASSWORD || "Admin12345").trim();
const role = process.env.SEED_ADMIN_ROLE === client_1.Role.SUPER_ADMIN
    ? client_1.Role.SUPER_ADMIN
    : client_1.Role.ADMIN;
const contactNumber = process.env.SEED_ADMIN_CONTACT_NUMBER?.trim() || undefined;
const profileImage = process.env.SEED_ADMIN_PROFILE_IMAGE?.trim() || undefined;
const seedAdmin = async () => {
    if (password.length < 8) {
        throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters long.");
    }
    const hashedPassword = await (0, crypto_1.hashPassword)(password);
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            emailVerified: true,
            role,
            status: client_1.UserStatus.ACTIVE,
            needPasswordChange: false,
            isDeleted: false,
            deletedAt: null,
            image: profileImage,
        },
        create: {
            id: existingUser?.id || (0, node_crypto_1.randomUUID)(),
            name,
            email,
            emailVerified: true,
            role,
            status: client_1.UserStatus.ACTIVE,
            needPasswordChange: false,
            isDeleted: false,
            deletedAt: null,
            image: profileImage,
        },
    });
    const account = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
    });
    if (account) {
        await prisma.account.update({
            where: { id: account.id },
            data: {
                accountId: user.id,
                password: hashedPassword,
            },
        });
    }
    else {
        await prisma.account.create({
            data: {
                id: (0, node_crypto_1.randomUUID)(),
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashedPassword,
            },
        });
    }
    await prisma.admin.upsert({
        where: { userId: user.id },
        update: {
            name,
            email,
            profileImage,
            contactNumber,
            isDeleted: false,
            deletedAt: null,
        },
        create: {
            id: (0, node_crypto_1.randomUUID)(),
            name,
            email,
            profileImage,
            contactNumber,
            userId: user.id,
            isDeleted: false,
            deletedAt: null,
        },
    });
    console.log(`Admin ${existingUser ? "updated" : "created"}: ${email}`);
};
void seedAdmin()
    .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
