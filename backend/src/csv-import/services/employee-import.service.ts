import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as Papa from 'papaparse';
import { EmployeeRole, CustomerStatus } from '@prisma/client';

@Injectable()
export class EmployeeImportService {
  private readonly logger = new Logger(EmployeeImportService.name);

  constructor(private prisma: PrismaService) {}

  async importEmployees(fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf-8');
    
    // Use header: false since the user specified no header row
    const parseResult = Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      this.logger.warn(`CSV Parse errors: ${JSON.stringify(parseResult.errors)}`);
    }

    const rows = parseResult.data as any[];
    this.logger.log(`Found ${rows.length} rows in employee CSV`);

    let processed = 0;
    let updated = 0;
    let created = 0;

    for (const row of rows) {
      try {
        // Column Mapping based on user input:
        // Column U (Index 20): Name
        // Column Z (Index 25): Mechanic (Yes/No)
        // Column AA (Index 26): Active (Yes/No)

        const nameRaw = row[20];
        const mechRaw = row[25];
        const activeRaw = row[26];

        if (!nameRaw) {
            // Skip empty rows or rows without name in column U
            continue;
        }

        // 1. Extract Name
        let firstName = '';
        let lastName = '';
        
        const nameStr = String(nameRaw).trim();
        
        // Check for "Last, First" format
        if (nameStr.includes(',')) {
            const parts = nameStr.split(',');
            lastName = parts[0].trim();
            firstName = parts[1].trim();
        } else {
            // Assume "First Last"
            const parts = nameStr.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ') || 'Unknown';
        }

        if (!firstName) {
            this.logger.warn(`Skipping row with invalid name format: ${nameStr}`);
            continue;
        }

        // 2. Extract ID (Generate one since CSV doesn't seem to have it)
        // Use a consistent ID generation based on name to avoid duplicates if re-imported without ID
        const nameSlug = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const employeeId = `EMP-${nameSlug.substring(0, 10).toUpperCase()}`;

        // 3. Determine Role and isMechanic
        let role: EmployeeRole = EmployeeRole.TECHNICIAN;
        
        const isMechStr = String(mechRaw || '').toLowerCase().trim();
        const isMech = isMechStr === 'yes' || isMechStr === 'y' || isMechStr === 'true';
        
        // Default to Technician if Yes, otherwise Service Advisor
        if (isMech) {
            role = EmployeeRole.TECHNICIAN;
        } else {
            role = EmployeeRole.SERVICE_ADVISOR;
        }

        // 4. Determine Status
        let status: CustomerStatus = CustomerStatus.ACTIVE;
        const statusStr = String(activeRaw || '').toLowerCase().trim();
        
        if (statusStr === 'yes' || statusStr === 'y' || statusStr === 'true') {
            status = CustomerStatus.ACTIVE;
        } else if (statusStr === 'no' || statusStr === 'n' || statusStr === 'false' || statusStr.includes('inactive')) {
            status = CustomerStatus.INACTIVE;
        }

        // 5. Upsert
        const existing = await this.prisma.employee.findFirst({
          where: {
            OR: [
              { employeeId: employeeId },
              { 
                AND: [
                  { firstName: { equals: firstName, mode: 'insensitive' } },
                  { lastName: { equals: lastName, mode: 'insensitive' } }
                ]
              }
            ]
          }
        });

        if (existing) {
          await this.prisma.employee.update({
            where: { id: existing.id },
            data: {
              role,
              isMechanic: isMech,
              status,
              // Ensure employeeId is set if we matched by name
              employeeId: existing.employeeId
            }
          });
          updated++;
        } else {
          await this.prisma.employee.create({
            data: {
              firstName,
              lastName,
              employeeId,
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`, // Placeholder
              role,
              isMechanic: isMech,
              status,
              hireDate: new Date(),
              hourlyRate: null
            }
          });
          created++;
        }
        processed++;

      } catch (error) {
        this.logger.error(`Failed to process row: ${JSON.stringify(row)}`, error);
      }
    }

    return { processed, created, updated };
  }
}
