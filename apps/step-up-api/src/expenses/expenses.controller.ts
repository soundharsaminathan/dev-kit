import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ExpensePaymentMethod,
  ExpenseRecurrenceFrequency,
  UserRole,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { ExpensesService } from "./expenses.service";

class CreateExpenseDto {
  @IsString()
  studioId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptKey?: string;

  @IsOptional()
  @IsString()
  recurringExpenseId?: string;
}

class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptKey?: string;
}

class ListExpensesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["date", "amount", "category", "vendor"])
  sort?: "date" | "amount" | "category" | "vendor";

  @IsOptional()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

class CreateCategoryDto {
  @IsString()
  studioId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

class CreateRecurringExpenseDto {
  @IsString()
  studioId!: string;

  @IsString()
  categoryId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(ExpenseRecurrenceFrequency)
  frequency!: ExpenseRecurrenceFrequency;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(ExpenseRecurrenceFrequency)
  frequency?: ExpenseRecurrenceFrequency;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(["day", "week", "month"])
  bucket?: "day" | "week" | "month";
}

class RangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

const EXPENSE_ROLES = [UserRole.OWNER, UserRole.STAFF];

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ExpensesController {
  constructor(
    @Inject(ExpensesService) private readonly expensesService: ExpensesService,
  ) {}

  // ---- Categories ----

  @Get("expense-categories/studio/:studioId")
  @Roles(...EXPENSE_ROLES)
  listCategories(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.listCategories(studioId);
  }

  @Post("expense-categories")
  @Roles(...EXPENSE_ROLES)
  createCategory(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    assertSameStudio(user, dto.studioId);
    return this.expensesService.createCategory(user.id, dto);
  }

  @Patch("expense-categories/:id")
  @Roles(...EXPENSE_ROLES)
  updateCategory(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.expensesService.updateCategory(user.id, id, dto);
  }

  @Delete("expense-categories/:id")
  @Roles(...EXPENSE_ROLES)
  deleteCategory(@Param("id") id: string) {
    return this.expensesService.deleteCategory(id);
  }

  // ---- Expenses ----

  @Get("expenses/studio/:studioId")
  @Roles(...EXPENSE_ROLES)
  listExpenses(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.listExpenses(studioId, query);
  }

  @Get("expenses/studio/:studioId/dashboard")
  @Roles(...EXPENSE_ROLES)
  getDashboard(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: DashboardQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.getDashboard(studioId, query);
  }

  @Get("expenses/studio/:studioId/reports")
  @Roles(...EXPENSE_ROLES)
  getReports(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: RangeQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.getReports(studioId, query);
  }

  @Get("expenses/studio/:studioId/financial-overview")
  @Roles(...EXPENSE_ROLES)
  getFinancialOverview(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: RangeQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.getFinancialOverview(studioId, query);
  }

  @Get("expenses/:id")
  @Roles(...EXPENSE_ROLES)
  getExpense(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Query("studioId") studioId: string,
  ) {
    if (!studioId) {
      throw new BadRequestException("studioId is required");
    }
    assertSameStudio(user, studioId);
    return this.expensesService.getExpense(id, studioId);
  }

  @Post("expenses")
  @Roles(...EXPENSE_ROLES)
  createExpense(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(user.id, user.studioId!, dto);
  }

  @Patch("expenses/:id")
  @Roles(...EXPENSE_ROLES)
  updateExpense(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(user.id, id, user.studioId!, dto);
  }

  @Delete("expenses/:id")
  @Roles(...EXPENSE_ROLES)
  deleteExpense(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.expensesService.deleteExpense(id, user.studioId!);
  }

  // ---- Recurring expenses ----

  @Get("recurring-expenses/studio/:studioId")
  @Roles(...EXPENSE_ROLES)
  listRecurringExpenses(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.expensesService.listRecurringExpenses(studioId);
  }

  @Post("recurring-expenses")
  @Roles(...EXPENSE_ROLES)
  createRecurringExpense(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateRecurringExpenseDto,
  ) {
    return this.expensesService.createRecurringExpense(
      user.id,
      user.studioId!,
      dto,
    );
  }

  @Patch("recurring-expenses/:id")
  @Roles(...EXPENSE_ROLES)
  updateRecurringExpense(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringExpenseDto,
  ) {
    return this.expensesService.updateRecurringExpense(
      user.id,
      id,
      user.studioId!,
      dto,
    );
  }

  @Delete("recurring-expenses/:id")
  @Roles(...EXPENSE_ROLES)
  deleteRecurringExpense(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
  ) {
    return this.expensesService.deleteRecurringExpense(id, user.studioId!);
  }

  @Post("recurring-expenses/materialize")
  @Roles(...EXPENSE_ROLES)
  materializeRecurringExpenses(@CurrentUser() user: DecryptedUser) {
    return this.expensesService.materializeDueRecurringExpenses(
      user.studioId!,
      user.id,
    );
  }
}
