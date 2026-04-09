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
    message: "Member promoted to scientist successfully",
    data: result,
  });
});

/*
const getAllScientists = catchAsync(async (_req: Request, res: Response) => {
  const result = await ScientistService.getAllScientists();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientists retrieved successfully",
    data: result,
  });
});

*/

const getAllScientists = catchAsync(async (req: Request, res: Response) => {
  const result = await ScientistService.getAllScientists(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientists retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleScientist = catchAsync(async (req: Request, res: Response) => {
  const result = await ScientistService.getSingleScientist(
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist retrieved successfully",
    data: result,
  });
});

const getScientistByUserId = catchAsync(async (req: Request, res: Response) => {
  const result = await ScientistService.getScientistByUserId(
    req.params.userId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist retrieved successfully",
    data: result,
  });
});

const updateScientist = catchAsync(async (req: Request, res: Response) => {
  const result = await ScientistService.updateScientist(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist updated successfully",
    data: result,
  });
});

const assignScientistSpecialties = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ScientistService.assignScientistSpecialties(
      req.params.id as string,
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
    await ScientistService.removeScientistSpecialty(
      req.params.id as string,
      req.params.specialtyId as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Scientist specialty removed successfully",
      data: null,
    });
  },
);

const verifyScientist = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await ScientistService.verifyScientist(
    req.params.id as string,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist verification updated successfully",
    data: result,
  });
});

const deleteScientist = catchAsync(async (req: Request, res: Response) => {
  await ScientistService.deleteScientist(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist demoted to member successfully",
    data: null,
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
  verifyScientist,
  deleteScientist,
};
