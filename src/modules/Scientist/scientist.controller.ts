import { Request, Response } from "express";
import status from "http-status";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ScientistService } from "./scientist.service";

const createScientist = catchAsync(async (req: Request, res: Response) => {
  const result = await ScientistService.createScientist(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Scientist created successfully",
    data: result,
  });
});

const getAllScientists = catchAsync(async (_req: Request, res: Response) => {
  const result = await ScientistService.getAllScientists();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientists retrieved successfully",
    data: result,
  });
});

const getSingleScientist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ScientistService.getSingleScientist(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist retrieved successfully",
    data: result,
  });
});

const getScientistByUserId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await ScientistService.getScientistByUserId(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist retrieved successfully",
    data: result,
  });
});

const updateScientist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ScientistService.updateScientist(id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist updated successfully",
    data: result,
  });
});

const assignScientistSpecialties = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await ScientistService.assignScientistSpecialties(
      id,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Scientist specialties assigned successfully",
      data: result,
    });
  },
);

const removeScientistSpecialty = catchAsync(
  async (req: Request, res: Response) => {
    const { id, specialtyId } = req.params as {
      id: string;
      specialtyId: string;
    };

    const result = await ScientistService.removeScientistSpecialty(
      id,
      specialtyId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Scientist specialty removed successfully",
      data: result,
    });
  },
);

const deleteScientist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ScientistService.deleteScientist(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist deleted successfully",
    data: result,
  });
});

export const ScientistController = {
  createScientist,
  getAllScientists,
  getSingleScientist,
  getScientistByUserId,
  updateScientist,
  assignScientistSpecialties,
  removeScientistSpecialty,
  deleteScientist,
};
