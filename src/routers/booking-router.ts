import { getBooking, makeReservation } from "@/controllers";
import { authenticateToken } from "@/middlewares";
import { Router } from "express";

export const bookingRouters = Router();

bookingRouters.all("/*", authenticateToken).post("", makeReservation).get("", getBooking);
