
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const username = 'jbyerlytest';
  console.log(`Checking user: ${username}`);
  
  const user = await prisma.user.findUnique({
    where: { username },
    include: { employee: true }
  });

  if (user) {
    console.log('User found:', JSON.stringify(user, null, 2));
    if (user.employee) {
      console.log('Employee found:', JSON.stringify(user.employee, null, 2));
    } else {
      console.log('No employee linked to this user.');
    }
  } else {
    console.log('User not found.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
