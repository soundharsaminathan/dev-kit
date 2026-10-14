import { Module } from "@nestjs/common";
import { UserCryptoModule } from "../users/user-crypto.module";
import { RazorpayService } from "./razorpay.service";

@Module({
  imports: [UserCryptoModule],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class PaymentsModule {}
