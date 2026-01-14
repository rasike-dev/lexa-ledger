import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Fix user IDs and roles to match Keycloak and frontend expectations
 * 
 * This script:
 * 1. Updates user IDs to match email addresses (for Keycloak sub claim)
 * 2. Updates roles to match frontend expectations
 */
async function main() {
  console.log("🔧 Fixing user IDs and roles...\n");
  
  const TENANT_ID = "acme-capital-001";
  
  // Map: email -> { role }
  // Note: User IDs stay as user-alex-001, etc. (Keycloak username must match this)
  const userUpdates = [
    {
      email: "alex.morgan@acmecapital.com",
      role: UserRole.ORG_ADMIN, // Maps to TENANT_ADMIN in frontend
    },
    {
      email: "jamie.lee@acmecapital.com",
      role: UserRole.ANALYST, // Maps to TRADING_ANALYST in frontend
    },
    {
      email: "priya.shah@acmecapital.com",
      role: UserRole.OPS, // Maps to COMPLIANCE_AUDITOR in frontend
    },
  ];
  
  for (const update of userUpdates) {
    // Find user by email
    const existingUser = await prisma.user.findFirst({
      where: { email: update.email },
    });
    
    if (!existingUser) {
      console.log(`❌ User not found: ${update.email}`);
      continue;
    }
    
    console.log(`\n📧 Updating: ${update.email}`);
    console.log(`   Old ID: ${existingUser.id}`);
    console.log(`   New ID: ${update.newUserId}`);
    
    // If user ID needs to change, we need to:
    // 1. Update all foreign key references
    // 2. Update the user ID
    
    // Note: We keep the existing user ID (user-alex-001, etc.)
    // Keycloak username should match the database user ID, not the email
    // So in Keycloak, set username = existingUser.id
    console.log(`   ℹ️  Keep database ID: ${existingUser.id}`);
    console.log(`   ⚠️  IMPORTANT: In Keycloak, set username to: ${existingUser.id} (not email)`);
    
    // Update role in membership (using existing user ID)
    const membership = await prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: TENANT_ID,
          userId: existingUser.id,
        },
      },
    });
    
    if (membership) {
      await prisma.membership.update({
        where: {
          tenantId_userId: {
            tenantId: TENANT_ID,
            userId: existingUser.id,
          },
        },
        data: { role: update.role },
      });
      console.log(`   ✅ Role updated to: ${update.role}`);
    } else {
      console.log(`   ⚠️  Membership not found, creating...`);
      await prisma.membership.create({
        data: {
          tenantId: TENANT_ID,
          userId: existingUser.id,
          role: update.role,
        },
      });
      console.log(`   ✅ Membership created with role: ${update.role}`);
    }
  }
  
  console.log("\n✅ All users updated!\n");
  
  // Verify
  console.log("📋 Verification:\n");
  const users = await prisma.user.findMany({
    where: {
      email: { in: userUpdates.map(u => u.email) },
    },
    include: {
      memberships: {
        where: { tenantId: TENANT_ID },
      },
    },
  });
  
  users.forEach((user) => {
    const membership = user.memberships[0];
    console.log(`${user.email}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Role: ${membership?.role || "N/A"}`);
    console.log();
  });
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
