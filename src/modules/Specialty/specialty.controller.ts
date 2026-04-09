import { Request, Response } from "express";
import status from "http-status";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SpecialtyService } from "./specialty.service";

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.createSpecialty(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Specialty created successfully",
    data: result,
  });
});

const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.getAllSpecialties(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Specialties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SpecialtyService.getSingleSpecialty(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Specialty retrieved successfully",
    data: result,
  });
});

const updateSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SpecialtyService.updateSpecialty(id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Specialty updated successfully",
    data: result,
  });
});

const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SpecialtyService.deleteSpecialty(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Specialty deleted successfully",
    data: result,
  });
});

export const SpecialtyController = {
  createSpecialty,
  getAllSpecialties,
  getSingleSpecialty,
  updateSpecialty,
  deleteSpecialty,
};
