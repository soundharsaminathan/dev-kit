import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    @Inject(ProductsService) private readonly products: ProductsService,
  ) {}

  @Post()
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @Get()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
  )
  list(@CurrentUser() user: AuthUser) {
    return this.products.list(user);
  }

  @Patch(":id")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }
}
