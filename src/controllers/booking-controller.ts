import { AuthenticatedRequest } from "@/middlewares";
import { bookingSchema } from "@/schemas";
import bookingService from "@/services/booking-service";
import { Response } from "express";
export async function makeReservation(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const validation = bookingSchema.validate(req.body);
  if (validation.error) return res.sendStatus(400);
  const { roomId } = req.body;
  try {
    const bookingId = await bookingService.makeReservation(userId, roomId);
    return res.status(200).send({ bookingId });
  } catch (error) {
    if (error.name === "RequestError") {
      return res.sendStatus(error.status);
    } else {
      return res.sendStatus(403);
    }
  }
}
