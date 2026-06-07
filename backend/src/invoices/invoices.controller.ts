import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/jwt.strategy';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({
    summary: 'List invoices with search, filter, sort and server-side pagination',
  })
  @ApiOkResponse({
    description: 'Paginated list of invoices',
    schema: {
      example: {
        data: [],
        paging: { page: 1, pageSize: 10, total: 100 },
      },
    },
  })
  findAll(@Query() query: QueryInvoicesDto) {
    return this.invoices.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @ApiOkResponse({ description: 'The invoice detail' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice (always created as Draft)' })
  @ApiCreatedResponse({ description: 'The created invoice' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.create(dto, user.id);
  }
}
