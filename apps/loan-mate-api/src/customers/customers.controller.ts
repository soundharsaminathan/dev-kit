import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BodyDto } from "../common/body-dto";
import { UserRole } from "../generated/prisma/client";
import { CustomerFileService } from "./customer-file.service";
import { CustomersService } from "./customers.service";
import type {
  AssignCollectionOfficerDto,
  BlacklistCustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";
import {
  CustomerAddressDto,
  CustomerBankAccountDto,
  CustomerEmploymentDto,
  CustomerKycDto,
  CustomerNomineeDto,
  CustomerReferenceDto,
  ReviewKycDto,
} from "./dto/customer-file.dto";

@Controller("customers")
@UseGuards(AuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
    @Inject(CustomerFileService) private readonly file: CustomerFileService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }

  @Get()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  list(@CurrentUser() user: AuthUser) {
    return this.customers.list(user);
  }

  @Get(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.get(user, id);
  }

  @Patch(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user, id, dto);
  }

  @Patch(":id/assignment")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  assignCollectionOfficer(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: AssignCollectionOfficerDto,
  ) {
    return this.customers.assignCollectionOfficer(user, id, dto);
  }

  @Post(":id/blacklist")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  blacklist(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: BlacklistCustomerDto,
  ) {
    return this.customers.blacklist(user, id, dto);
  }

  @Post(":id/request-npa-mark")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpaMark(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason: string; sourceLoanId?: string },
  ) {
    return this.customers.requestNpaMark(
      user,
      id,
      body.reason,
      body.sourceLoanId,
    );
  }

  @Post(":id/request-npa-clear")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpaClear(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.customers.requestNpaClear(user, id, body.reason);
  }

  @Post(":id/addresses")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addAddress(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerAddressDto) dto: CustomerAddressDto,
  ) {
    return this.file.addAddress(user, id, dto);
  }

  @Post(":id/employment")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addEmployment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerEmploymentDto) dto: CustomerEmploymentDto,
  ) {
    return this.file.addEmployment(user, id, dto);
  }

  @Post(":id/bank-accounts")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addBank(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerBankAccountDto) dto: CustomerBankAccountDto,
  ) {
    return this.file.addBankAccount(user, id, dto);
  }

  @Post(":id/nominees")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addNominee(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerNomineeDto) dto: CustomerNomineeDto,
  ) {
    return this.file.addNominee(user, id, dto);
  }

  @Post(":id/references")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addReference(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerReferenceDto) dto: CustomerReferenceDto,
  ) {
    return this.file.addReference(user, id, dto);
  }

  @Post(":id/kyc")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  addKyc(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @BodyDto(CustomerKycDto) dto: CustomerKycDto,
  ) {
    return this.file.addKyc(user, id, dto);
  }

  @Post(":id/kyc/:kycId/review")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  reviewKyc(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("kycId") kycId: string,
    @BodyDto(ReviewKycDto) dto: ReviewKycDto,
  ) {
    return this.file.reviewKyc(user, id, kycId, dto);
  }

  @Delete(":id")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.remove(user, id);
  }
}
