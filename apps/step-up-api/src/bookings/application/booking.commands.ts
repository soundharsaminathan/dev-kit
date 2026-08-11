import { Inject, Injectable } from "@nestjs/common";
import type { BookingStatus, BookingType } from "@prisma/client";
import type { DecryptedUser } from "../../users/user-crypto.service";
import { BookingsService } from "../bookings.service";

@Injectable()
export class BookingCommandsService {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
  ) {}

  create(
    data: {
      studioId: string;
      studentId: string;
      type: BookingType;
      batchId?: string;
      sessionId?: string;
      trainerId?: string;
      notes?: string;
      startsAt?: string;
      endsAt?: string;
    },
    options: { requirePayment?: boolean } = {},
  ) {
    return this.bookings.create(data, options);
  }

  createPaymentOrder(id: string, actor: DecryptedUser) {
    return this.bookings.createPaymentOrder(id, actor);
  }

  confirmPayment(
    id: string,
    actor: DecryptedUser,
    payload: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    },
  ) {
    return this.bookings.confirmPayment(id, actor, payload);
  }

  abandonPayment(id: string, actor: DecryptedUser) {
    return this.bookings.abandonPayment(id, actor);
  }

  cancelBooking(id: string, actor: DecryptedUser, reason?: string) {
    return this.bookings.cancelBooking(id, actor, reason);
  }

  requestReschedule(
    id: string,
    actor: DecryptedUser,
    input: {
      sessionId?: string;
      startsAt?: string;
      endsAt?: string;
      notes?: string;
    },
  ) {
    return this.bookings.requestReschedule(id, actor, input);
  }

  updateStatus(
    id: string,
    input: {
      status: BookingStatus;
      sessionId?: string;
      startsAt?: string;
      endsAt?: string;
      trainerId?: string;
    },
  ) {
    return this.bookings.updateStatus(id, input);
  }
}
