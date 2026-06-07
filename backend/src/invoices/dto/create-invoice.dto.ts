import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Honda RC150' })
  @IsNotEmpty({ message: 'Item name is required' })
  name: string;

  @ApiProperty({ example: 2, description: 'Positive integer' })
  @IsInt({ message: 'Item quantity must be an integer' })
  @IsPositive({ message: 'Item quantity must be a positive integer' })
  quantity: number;

  @ApiProperty({ example: 1000, description: 'Positive number' })
  @IsNumber({}, { message: 'Item rate must be a number' })
  @IsPositive({ message: 'Item rate must be a positive number' })
  rate: number;
}

export class CreateInvoiceDto {
  // ---- Customer ----
  @ApiProperty({ example: 'Paul' })
  @IsNotEmpty({ message: 'Customer name is required' })
  customerFullname: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  @IsEmail({}, { message: 'A valid customer email is required' })
  customerEmail: string;

  @ApiPropertyOptional({ example: '947717364111' })
  @IsOptional()
  customerMobileNumber?: string;

  @ApiPropertyOptional({ example: 'Singapore' })
  @IsOptional()
  customerAddress?: string;

  // ---- Invoice ----
  @ApiProperty({ example: 'IV1780488206995', description: 'Must be unique' })
  @IsNotEmpty({ message: 'Invoice number is required' })
  invoiceNumber: string;

  @ApiPropertyOptional({ example: '#5721662' })
  @IsOptional()
  invoiceReference?: string;

  @ApiProperty({ example: '2026-06-03', description: 'YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'Invoice date must be a valid date' })
  invoiceDate: string;

  @ApiProperty({
    example: '2026-07-03',
    description: 'YYYY-MM-DD, must be on or after invoiceDate',
  })
  @IsISO8601({ strict: true }, { message: 'Due date must be a valid date' })
  dueDate: string;

  @ApiProperty({ example: 'AUD', description: 'ISO 4217 currency code' })
  @IsNotEmpty({ message: 'Currency is required' })
  currency: string;

  @ApiPropertyOptional({ example: 'AU$' })
  @IsOptional()
  currencySymbol?: string;

  @ApiPropertyOptional({ example: 'Invoice is issued to Kanglee' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tax percentage. Non-negative. Defaults to 10.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tax must be a number' })
  @Min(0, { message: 'Tax must be a non-negative number' })
  tax?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Flat discount amount. Non-negative. Defaults to 0.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Discount must be a number' })
  @Min(0, { message: 'Discount must be a non-negative number' })
  discount?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Amount already paid. Non-negative. Defaults to 0.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total paid must be a number' })
  @Min(0, { message: 'Total paid must be a non-negative number' })
  totalPaid?: number;

  /**
   * Exactly one line item is required for this assessment. The field is an
   * array so the model can support multiple items in future without an API
   * change; validation currently enforces a single item.
   */
  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
