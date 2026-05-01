import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AiService } from "./ai.service";
import { IChatPayload, IIdeaFormSuggestionPayload } from "./ai.interface";

const getSearchSuggestions = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.getSearchSuggestions(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI search suggestions retrieved successfully",
    data: result,
  });
});

const getRecommendations = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.getRecommendations(
    req.user!.userId,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI recommendations retrieved successfully",
    data: result,
  });
});

const getTrendingIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.getTrendingIdeas(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Trending ideas retrieved successfully",
    data: result,
  });
});

const getPersonalizedBanner = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AiService.getPersonalizedBanner(req.user?.userId);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Personalized banner retrieved successfully",
      data: result,
    });
  },
);

const getDashboardInsights = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.getDashboardInsights(
    req.user?.userId,
    req.user?.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI dashboard insights retrieved successfully",
    data: result,
  });
});

const getNextActions = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.getNextActions(
    req.user?.userId,
    req.user?.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI next actions retrieved successfully",
    data: result,
  });
});

const getAnomalyAlerts = catchAsync(async (_req: Request, res: Response) => {
  const result = await AiService.getAnomalyAlerts();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI anomaly alerts retrieved successfully",
    data: result,
  });
});

const chat = catchAsync(async (req: Request, res: Response) => {
  const result = await AiService.chat(req.user?.userId, req.body as IChatPayload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI response generated successfully",
    data: result,
  });
});

const getIdeaFormSuggestions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AiService.getIdeaFormSuggestions(
      req.user!.userId,
      req.body as IIdeaFormSuggestionPayload,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "AI idea form suggestions generated successfully",
      data: result,
    });
  },
);

export const AiController = {
  getSearchSuggestions,
  getRecommendations,
  getTrendingIdeas,
  getPersonalizedBanner,
  getDashboardInsights,
  getNextActions,
  getAnomalyAlerts,
  chat,
  getIdeaFormSuggestions,
};
