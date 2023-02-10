import app, { init } from "@/app";
import supertest from "supertest";
import { cleanDb, generateValidToken } from "../helpers";
import {
  createEnrollmentWithAddress,
  createTicket,
  createUser,
  createHotel,
  createRoomWithHotelId,
  createTicketTypeWithHotel,
} from "../factories";
import { TicketStatus } from "@prisma/client";
import bookingRepository from "../../src/repositories/booking-repository/index";
import { createBooking } from "../factories/booking-factory";

const server = supertest(app);

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

describe("POST /booking", () => {
  it("should return status 200 and an object that contains bookingId", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);

    const body = { roomId };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ bookingId: bookings[0].id });
  });
});
describe("POST /booking (in cases of error)", () => {
  it("should return status 403 when the body is in the wrong format", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);

    const body = { roomId: "vasco" };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(403);
    expect(bookings.length).toBe(0);
  });
  it("should return status 404 when room id does not exist", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);

    const body = { roomId: roomId + 1 };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(404);
    expect(bookings.length).toBe(0);
  });
  it("should return status 403 when the room has no vacancies", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    await createBooking(user.id, roomId);
    await createBooking(user.id, roomId);
    await createBooking(user.id, roomId);

    const body = { roomId };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(403);
    expect(bookings.length).toBe(3);
  });
});

describe("GET /booking", () => {
  it("should return status 200 and an object with the id and room of the reservation", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);
    const { id: roomId } = await bookingRepository.getRoom(room.id);
    await createBooking(user.id, roomId);

    const booking = await bookingRepository.getBookingsForUser(user.id);

    const result = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      id: booking.id,
      Room: {
        ...booking.Room,
        createdAt: booking.Room.createdAt.toISOString(),
        updatedAt: booking.Room.updatedAt.toISOString(),
      },
    });
  });
});
