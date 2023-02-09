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
const bookingRepository = {
  makeReservation,
  getRoom,
  getBookingsForThatRoom
};

export default bookingRepository;
