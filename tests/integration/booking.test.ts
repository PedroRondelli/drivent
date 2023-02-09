import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { create } from "domain";
import httpStatus from "http-status";
import supertest from "supertest";
import { cleanDb, generateValidToken } from "../helpers";
import {
  createEnrollmentWithAddress,
  createTicket,
  createTicketTypeRemote,
  createUser,
  createHotel,
  createRoomWithHotelId,
  createTicketTypeWithHotel,
} from "../factories";
import { TicketStatus } from "@prisma/client";
import bookingRepository from "../../src/repositories/booking-repository/index";

const server = supertest(app);

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

describe("POST /booking", () => {
  it("should return statu 200 and an object that contains bookingId", async () => {
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
  it("should return status 400 when the body is in the wrong format", async () => {
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

    expect(result.status).toBe(400);
  });
});
