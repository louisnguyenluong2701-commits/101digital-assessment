import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FILTERABLE_STATUSES, FilterableStatus } from '../invoice-status.enum';

export enum SortBy {
  invoiceDate = 'invoiceDate',
  dueDate = 'dueDate',
  totalAmount = 'totalAmount',
}

export enum Ordering {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class QueryInvoicesDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Records per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.invoiceDate })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.invoiceDate;

  @ApiPropertyOptional({ enum: Ordering, default: Ordering.DESC })
  @IsOptional()
  @IsEnum(Ordering)
  ordering: Ordering = Ordering.DESC;

  @ApiPropertyOptional({
    enum: FILTERABLE_STATUSES,
    description: 'Filter by status. "Overdue" is matched against the derived status.',
  })
  @IsOptional()
  @IsEnum(FILTERABLE_STATUSES as readonly string[] as string[], {
    message: 'status must be one of Draft, Pending, Paid, Overdue',
  })
  status?: FilterableStatus;

  @ApiPropertyOptional({
    description: 'Partial, case-insensitive search on invoice number or customer name',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Filter invoices on/after this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter invoices on/before this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601({ strict: true })
  toDate?: string;
}
