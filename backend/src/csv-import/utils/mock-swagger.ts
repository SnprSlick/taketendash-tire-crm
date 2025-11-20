/**
 * Mock Swagger decorators
 * Temporary replacement until @nestjs/swagger is installed
 */

export const ApiTags = (tag: string) => (target: any) => {};
export const ApiOperation = (options: any) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiResponse = (options: any) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiParam = (options: any) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiQuery = (options: any) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiConsumes = (...types: string[]) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiBody = (options: any) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
export const ApiProperty = (options?: any) => (target: any, propertyName: string) => {};
export const ApiPropertyOptional = (options?: any) => (target: any, propertyName: string) => {};