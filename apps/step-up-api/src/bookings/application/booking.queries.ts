import { Inject, Injectable } from "@nestjs/common";
import type { DecryptedUser } from "../../users/user-crypto.service";
import { BookingsService } from "../bookings.service";

@Injectable()
export class BookingQueriesService {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
  ) {}

  listForStudent(studentId: string) {
    return this.bookings.listForStudent(studentId);
  }

  listForStudio(studioId: string) {
    return this.bookings.listForStudio(studioId);
  }

  getById(id: string, actor: DecryptedUser) {
    return this.bookings.getById(id, actor);
  }
}
