import { ErrorType } from '../enums/import.enums';

export interface ValidationError {
  field: string;
  message: string;
  type: ErrorType;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class CsvValidationUtil {
  static validateRequired(value: any, field: string): ValidationError | null {
    if (value === undefined || value === null || value === '') {
      return {
        field,
        message: `${field} is required`,
        type: ErrorType.MISSING_DATA,
        value,
      };
    }
    return null;
  }

  static validateEmail(email: string, field: string = 'email'): ValidationError | null {
    if (!email) return null; // Email is optional in many cases

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        field,
        message: 'Invalid email format',
        type: ErrorType.VALIDATION,
        value: email,
      };
    }
    return null;
  }

  static validatePhone(phone: string, field: string = 'phone'): ValidationError | null {
    if (!phone) return null; // Phone is optional in many cases

    // Remove all non-numeric characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return {
        field,
        message: 'Phone number must be between 10-15 digits',
        type: ErrorType.VALIDATION,
        value: phone,
      };
    }
    return null;
  }

  static validateDecimal(value: string, field: string, allowNegative: boolean = false): ValidationError | null {
    if (!value || value.trim() === '') {
      return {
        field,
        message: `${field} is required`,
        type: ErrorType.MISSING_DATA,
        value,
      };
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        field,
        message: `${field} must be a valid decimal number`,
        type: ErrorType.FORMAT,
        value,
      };
    }

    if (!allowNegative && numValue < 0) {
      return {
        field,
        message: `${field} cannot be negative`,
        type: ErrorType.VALIDATION,
        value,
      };
    }

    return null;
  }

  static validateInteger(value: string, field: string, allowNegative: boolean = false): ValidationError | null {
    if (!value || value.trim() === '') {
      return {
        field,
        message: `${field} is required`,
        type: ErrorType.MISSING_DATA,
        value,
      };
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || !Number.isInteger(numValue)) {
      return {
        field,
        message: `${field} must be a valid integer`,
        type: ErrorType.FORMAT,
        value,
      };
    }

    if (!allowNegative && numValue < 0) {
      return {
        field,
        message: `${field} cannot be negative`,
        type: ErrorType.VALIDATION,
        value,
      };
    }

    return null;
  }

  static validateDate(value: string, field: string): ValidationError | null {
    if (!value || value.trim() === '') {
      return {
        field,
        message: `${field} is required`,
        type: ErrorType.MISSING_DATA,
        value,
      };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        field,
        message: `${field} must be a valid date`,
        type: ErrorType.FORMAT,
        value,
      };
    }

    // Don't allow future dates for invoice dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) {
      return {
        field,
        message: `${field} cannot be in the future`,
        type: ErrorType.VALIDATION,
        value,
      };
    }

    return null;
  }

  static validateInvoiceNumber(invoiceNumber: string): ValidationError | null {
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      return {
        field: 'invoiceNumber',
        message: 'Invoice number is required',
        type: ErrorType.MISSING_DATA,
        value: invoiceNumber,
      };
    }

    // TireMaster invoice format: YYYY-NNNNN or similar patterns
    const trimmed = invoiceNumber.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      return {
        field: 'invoiceNumber',
        message: 'Invoice number must be between 3-50 characters',
        type: ErrorType.VALIDATION,
        value: invoiceNumber,
      };
    }

    return null;
  }

  static validateCustomerName(name: string): ValidationError | null {
    if (!name || name.trim() === '') {
      return {
        field: 'customerName',
        message: 'Customer name is required',
        type: ErrorType.MISSING_DATA,
        value: name,
      };
    }

    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 255) {
      return {
        field: 'customerName',
        message: 'Customer name must be between 1-255 characters',
        type: ErrorType.VALIDATION,
        value: name,
      };
    }

    return null;
  }

  static validateProductCode(productCode: string): ValidationError | null {
    if (!productCode || productCode.trim() === '') {
      return {
        field: 'productCode',
        message: 'Product code is required',
        type: ErrorType.MISSING_DATA,
        value: productCode,
      };
    }

    const trimmed = productCode.trim();
    if (trimmed.length > 100) {
      return {
        field: 'productCode',
        message: 'Product code must be less than 100 characters',
        type: ErrorType.VALIDATION,
        value: productCode,
      };
    }

    return null;
  }

  static validateAllFields(data: Record<string, any>, validations: Record<string, (value: any) => ValidationError | null>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, validator] of Object.entries(validations)) {
      const error = validator(data[field]);
      if (error) {
        errors.push(error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}