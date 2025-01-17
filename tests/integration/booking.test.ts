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
import faker from "@faker-js/faker";
import * as jwt from "jsonwebtoken";

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
describe("POST /booking(authorization errors)", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
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
  it("should return status 402 when ticket does not exists, include hotel or is not paid", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);

    const body = { roomId };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(402);
    expect(bookings.length).toBe(0);
  });
  it("should return status 404 when enrollment does not exists", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);

    const body = { roomId };

    const result = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);

    expect(result.status).toBe(404);
    expect(bookings.length).toBe(0);
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
describe("GET /booking(authorization errors)", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
describe("GET /booking(in cases of error)", () => {
  it("should return status 404 when the user has no reservation", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    await createRoomWithHotelId(hotel.id);

    const booking = await bookingRepository.getBookingsForUser(user.id);

    const result = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(result.status).toBe(404);
    expect(booking).toBe(null);
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should return status 200 and object with bookingId", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);
    const room2 = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    const { id: roomId2 } = await bookingRepository.getRoom(room2.id);
    await createBooking(user.id, roomId);

    const body = { roomId: roomId2 };

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);
    const result = await server.put(`/booking/${bookings[0].id}`).send(body).set("Authorization", `Bearer ${token}`);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ bookingId: bookings[0].id });
  });
});
describe("PUT /booking/:bookingId(authorization errors)", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/:bookingId");

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/:bookingId").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/bookingId").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
describe("PUT /booking/:bookingId(in cases of error)", () => {
  it("should return status 404 for users without reservation", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);
    const room2 = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    const { id: roomId2 } = await bookingRepository.getRoom(room2.id);

    const body = { roomId: roomId2 };

    const result = await server.put("/booking/:bookingId").send(body).set("Authorization", `Bearer ${token}`);
    expect(result.status).toBe(404);
  });
  it("should return status 403 when user chooses a full room", async () => {
    const ticketType = await createTicketTypeWithHotel();
    const hotel = await createHotel();
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

    const user2 = await createUser();
    const enrollment2 = await createEnrollmentWithAddress(user2);
    await createTicket(enrollment2.id, ticketType.id, TicketStatus.PAID);

    const room = await createRoomWithHotelId(hotel.id);
    const room2 = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    const { id: roomId2 } = await bookingRepository.getRoom(room2.id);
    await createBooking(user.id, roomId);
    await createBooking(user2.id, roomId2);
    await createBooking(user2.id, roomId2);
    await createBooking(user2.id, roomId2);

    const body = { roomId: roomId2 };

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);
    const result = await server.put(`/booking/${bookings[0].id}`).send(body).set("Authorization", `Bearer ${token}`);

    expect(result.status).toBe(403);
  });
  it("should return status 400 when body is not in correct format", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);
    const room2 = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    const { id: roomId2 } = await bookingRepository.getRoom(room2.id);
    await createBooking(user.id, roomId);

    const body = { room: roomId2 };

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);
    const result = await server.put(`/booking/${bookings[0].id}`).send(body).set("Authorization", `Bearer ${token}`);

    expect(result.status).toBe(400);
  });
  it("should return status 404 when room does not exist", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const hotel = await createHotel();

    const room = await createRoomWithHotelId(hotel.id);
    const room2 = await createRoomWithHotelId(hotel.id);

    const { id: roomId } = await bookingRepository.getRoom(room.id);
    const { id: roomId2 } = await bookingRepository.getRoom(room2.id);
    await createBooking(user.id, roomId);

    const body = { roomId: roomId2 + 5 };

    const bookings = await bookingRepository.getBookingsForThatRoom(roomId);
    const result = await server.put(`/booking/${bookings[0].id}`).send(body).set("Authorization", `Bearer ${token}`);

    expect(result.status).toBe(404);
  });
});
