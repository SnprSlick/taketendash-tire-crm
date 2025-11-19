import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample employees
  const john = await prisma.employee.create({
    data: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@tiremaster.com',
      role: 'MANAGER',
      employeeId: 'EMP001',
      hireDate: new Date('2023-01-15'),
      hourlyRate: 25.00,
      status: 'ACTIVE',
    },
  });

  const sarah = await prisma.employee.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@tiremaster.com',
      role: 'TECHNICIAN',
      employeeId: 'EMP002',
      hireDate: new Date('2023-03-20'),
      hourlyRate: 22.00,
      status: 'ACTIVE',
    },
  });

  const mike = await prisma.employee.create({
    data: {
      firstName: 'Mike',
      lastName: 'Davis',
      email: 'mike.davis@tiremaster.com',
      role: 'SERVICE_ADVISOR',
      employeeId: 'EMP003',
      hireDate: new Date('2023-05-10'),
      hourlyRate: 20.00,
      status: 'ACTIVE',
    },
  });

  console.log('👥 Created employees');

  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      firstName: 'Robert',
      lastName: 'Wilson',
      email: 'robert.wilson@email.com',
      phone: '(555) 111-2222',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      accountType: 'INDIVIDUAL',
      status: 'ACTIVE',
      preferredCommunication: 'EMAIL',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      firstName: 'Jennifer',
      lastName: 'Brown',
      email: 'jennifer.brown@email.com',
      phone: '(555) 333-4444',
      address: '456 Oak Ave',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702',
      accountType: 'INDIVIDUAL',
      status: 'ACTIVE',
      preferredCommunication: 'PHONE',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      firstName: 'Michael',
      lastName: 'Garcia',
      email: 'michael.garcia@email.com',
      phone: '(555) 555-6666',
      address: '789 Pine St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62703',
      accountType: 'LARGE_ACCOUNT',
      status: 'ACTIVE',
      preferredCommunication: 'EMAIL',
    },
  });

  console.log('🧑‍💼 Created customers');

  // Create sample vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      customerId: customer1.id,
      year: 2020,
      make: 'Honda',
      model: 'Civic',
      vin: '1HGBH41JXMN109186',
      licensePlate: 'ABC123',
      mileage: 45000,
      tireSize: '205/55R16',
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      customerId: customer2.id,
      year: 2019,
      make: 'Toyota',
      model: 'Camry',
      vin: '4T1BF1FK5KU123456',
      licensePlate: 'XYZ789',
      mileage: 52000,
      tireSize: '215/60R16',
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      customerId: customer3.id,
      year: 2021,
      make: 'Ford',
      model: 'F-150',
      vin: '1FTFW1ET5MKE12345',
      licensePlate: 'TRK456',
      mileage: 35000,
      tireSize: 'LT265/70R17',
    },
  });

  console.log('🚗 Created vehicles');

  // Create sample sales data
  const salesData = [];
  const categories = ['tires', 'service', 'parts', 'labor'];
  const today = new Date();

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
    const transactionDate = new Date(today);
    transactionDate.setDate(today.getDate() - daysAgo);

    const category = categories[Math.floor(Math.random() * categories.length)];
    const unitPrice = Math.random() * 100 + 20; // $20-$120 per unit
    const quantity = Math.floor(Math.random() * 5) + 1;
    const taxAmount = unitPrice * quantity * 0.08; // 8% tax

    const sale = await prisma.salesData.create({
      data: {
        tireMasterId: `TM-${String(i + 1).padStart(6, '0')}`,
        transactionDate,
        transactionType: 'SALE',
        category,
        itemDescription: `${category} - Sample item ${i + 1}`,
        quantity,
        unitPrice,
        taxAmount,
        customerId: [customer1.id, customer2.id, customer3.id][Math.floor(Math.random() * 3)],
        employeeId: [john.id, sarah.id, mike.id][Math.floor(Math.random() * 3)],
      },
    });

    salesData.push(sale);
  }

  console.log('💰 Created sales data');

  // Create sample service records
  const serviceRecord1 = await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicle1.id,
      customerId: customer1.id,
      employeeId: sarah.id,
      serviceDate: new Date('2024-10-15'),
      serviceType: 'Tire Rotation',
      description: 'Rotated all four tires and checked pressure',
      laborHours: 1.0,
      partsCost: 0,
      laborCost: 75.00,
      taxAmount: 6.00,
      paymentStatus: 'PAID',
    },
  });

  const serviceRecord2 = await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicle2.id,
      customerId: customer2.id,
      employeeId: john.id,
      serviceDate: new Date('2024-09-20'),
      serviceType: 'Oil Change',
      description: 'Changed engine oil and filter',
      laborHours: 0.5,
      partsCost: 45.00,
      laborCost: 50.00,
      taxAmount: 7.60,
      paymentStatus: 'PAID',
    },
  });

  console.log('🔧 Created service records');

  // Create sample appointments
  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 7);

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 14);

  const appointmentTime1 = new Date();
  appointmentTime1.setHours(9, 0, 0, 0); // 9:00 AM

  const appointmentTime2 = new Date();
  appointmentTime2.setHours(14, 30, 0, 0); // 2:30 PM

  const appointment1 = await prisma.appointment.create({
    data: {
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      employeeId: sarah.id,
      appointmentDate: futureDate1,
      appointmentTime: appointmentTime1,
      duration: 120, // 2 hours
      serviceType: 'Tire Installation',
      description: 'Install new set of Michelin tires',
      status: 'SCHEDULED',
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      customerId: customer3.id,
      vehicleId: vehicle3.id,
      employeeId: john.id,
      appointmentDate: futureDate2,
      appointmentTime: appointmentTime2,
      duration: 60, // 1 hour
      serviceType: 'Brake Inspection',
      description: 'Comprehensive brake system inspection',
      status: 'SCHEDULED',
    },
  });

  console.log('📅 Created appointments');

  // Create sample service reminders
  const reminder1 = await prisma.serviceReminder.create({
    data: {
      vehicleId: vehicle1.id,
      customerId: customer1.id,
      lastServiceId: serviceRecord1.id,
      reminderType: 'Tire Rotation',
      reminderDate: new Date('2025-04-15'),
      reminderMessage: 'Your Honda Civic is due for tire rotation',
      status: 'PENDING',
      communicationMethod: 'EMAIL',
    },
  });

  const reminder2 = await prisma.serviceReminder.create({
    data: {
      vehicleId: vehicle2.id,
      customerId: customer2.id,
      lastServiceId: serviceRecord2.id,
      reminderType: 'Oil Change',
      reminderDate: new Date('2025-03-20'),
      reminderMessage: 'Your Toyota Camry is due for oil change',
      status: 'PENDING',
      communicationMethod: 'PHONE',
    },
  });

  console.log('⏰ Created service reminders');

  // Create sample large account
  const largeAccount = await prisma.largeAccount.create({
    data: {
      customerId: customer3.id,
      accountManagerId: mike.id,
      companyName: 'Garcia Delivery Services',
      contractNumber: 'CONTRACT-2024-001',
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2024-12-31'),
      creditLimit: 50000.00,
      paymentTerms: '30 days',
      discountRate: 15.0,
      billingContact: 'Michael Garcia',
      billingEmail: 'billing@garciadelivery.com',
      notes: 'Fleet account for local delivery company with 25 vehicles',
    },
  });

  console.log('🏢 Created large account');

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- ${3} employees created`);
  console.log(`- ${3} customers created`);
  console.log(`- ${3} vehicles created`);
  console.log(`- ${50} sales records created`);
  console.log(`- ${2} service records created`);
  console.log(`- ${2} appointments created`);
  console.log(`- ${2} service reminders created`);
  console.log(`- ${1} large account created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });