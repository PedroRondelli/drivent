import { prisma } from "@/config";

function makeReservation(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
    },
  });
}

function getRoom(roomId: number) {
  return prisma.room.findUnique({ where: { id: roomId } });
}

function getBookingsForThatRoom(roomId: number) {
  return prisma.booking.findMany({ where: { roomId } });
}

function getBookingsForUser(userId: number) {
  return prisma.booking.findFirst({ where: { userId }, select: { id: true, Room: true } });
}

function updateReservation(roomId: number, bookingId: number) {
  return prisma.booking.update({ where: { id: bookingId }, data: { roomId } });
}
const bookingRepository = {
  makeReservation,
  getRoom,
  getBookingsForThatRoom,
  getBookingsForUser,
  updateReservation,
};

export default bookingRepository;
