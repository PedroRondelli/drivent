import { requestError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";

async function makeReservation(userId: number, roomId: number) {
  await bookingPermission(userId, roomId);

  const result = await bookingRepository.makeReservation(userId, roomId);

  return result.id;
}

async function bookingPermission(userId: number, roomId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw requestError(404, "No enrollment found");
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw requestError(404, "Booking requirements not met");
  }

  const room = await bookingRepository.getRoom(roomId);
  if (!room) {
    throw requestError(404, "This room does not exist");
  }

  const { capacity } = room;
  const numberOfBookings = await bookingRepository.getBookingsForThatRoom(roomId);
  if (capacity === numberOfBookings.length) {
    throw requestError(403, "No vacancy!");
  }
}

const bookingService = {
  makeReservation,
};

export default bookingService;
