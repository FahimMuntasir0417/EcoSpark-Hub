import express from "express";

import { AuthRoutes } from "../modules/Auth/auth.route";
import { SpecialtyRoutes } from "../modules/Specialty/specialty.route";
import { ScientistRoutes } from "../modules/Scientist/scientist.route";
import { IdeaRoutes } from "../modules/Idea/idea.route";
import { CampaignRoutes } from "../modules/Campaign/campaign.route";
import { InteractionRoutes } from "../modules/Interaction/interaction.route";
import { ModerationRoutes } from "../modules/Moderation/moderation.route";
import { CommerceRoutes } from "../modules/Commerce/commerce.route";
import { CommunityRoutes } from "../modules/Community/community.route";

import { CategoryRoutes } from "../modules/Category/category.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/specialties",
    route: SpecialtyRoutes,
  },
  {
    path: "/scientists",
    route: ScientistRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/tags",
    route: TagRoutes,
  },
  {
    path: "/ideas",
    route: IdeaRoutes,
  },
  {
    path: "/campaigns",
    route: CampaignRoutes,
  },
  {
    path: "/interactions",
    route: InteractionRoutes,
  },
  {
    path: "/moderation",
    route: ModerationRoutes,
  },
  {
    path: "/commerce",
    route: CommerceRoutes,
  },
  {
    path: "/community",
    route: CommunityRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
