import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking database users and tenant configuration...\n");
  
  // Check tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: "acme-capital-001" },
  });
  
  if (!tenant) {
    console.log("❌ Tenant 'acme-capital-001' not found!");
    console.log("\nAvailable tenants:");
    const allTenants = await prisma.tenant.findMany();
    allTenants.forEach(t => console.log(`  - ${t.id}: ${t.name}`));
  } else {
    console.log(`✅ Tenant found: ${tenant.name} (${tenant.id})\n`);
  }
  
  // Check users
  console.log("👥 Users in database:\n");
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "alex.morgan@acmecapital.com",
          "jamie.lee@acmecapital.com",
          "priya.shah@acmecapital.com",
        ],
      },
    },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });
  
  if (users.length === 0) {
    console.log("❌ No users found with those emails!");
    console.log("\nAvailable users:");
    const allUsers = await prisma.user.findMany({ take: 10 });
    allUsers.forEach(u => console.log(`  - ${u.id}: ${u.email}`));
  } else {
    users.forEach((user) => {
      console.log(`📧 Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || "N/A"}`);
      
      if (user.memberships.length > 0) {
        user.memberships.forEach((m) => {
          console.log(`   └─ Tenant: ${m.tenant.name} (${m.tenant.id})`);
          console.log(`      Role: ${m.role}`);
        });
      } else {
        console.log(`   └─ ⚠️  No memberships found!`);
      }
      console.log();
    });
  }
  
  // Summary
  console.log("\n📋 Summary for Keycloak configuration:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  users.forEach((user) => {
    const membership = user.memberships.find(m => m.tenantId === "acme-capital-001");
    if (membership) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Keycloak Username: ${user.id}`);
      console.log(`  Keycloak tenant_id attribute: acme-capital-001`);
      console.log(`  Database Role: ${membership.role}`);
    }
  });
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
