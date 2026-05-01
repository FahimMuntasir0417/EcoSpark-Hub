import status from "http-status";
import AppError from "../../errors/AppError";
import { envVars } from "../../config";
import {
  IdeaStatus,
  ModerationStatus,
  PaymentStatus,
  Prisma,
  Role,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  IAiAction,
  IAiAlert,
  IAiInsight,
  IAiSuggestion,
  IChatPayload,
  IIdeaFormSuggestionPayload,
} from "./ai.interface";

type ScoreItem = {
  id: string;
  name: string;
  slug?: string | null;
  score: number;
};

type PreferenceIdea = {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type AiProviderConfig = {
  provider: "openai";
  apiKey: string;
  model: string;
};

type OpenAiContent = {
  text?: string;
};

type OpenAiOutput = {
  content?: OpenAiContent[];
};

type OpenAiResponseBody = {
  output_text?: string;
  output?: OpenAiOutput[];
  error?: {
    message?: string;
  };
};

const ideaCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  status: true,
  accessType: true,
  price: true,
  currency: true,
  ecoScore: true,
  totalViews: true,
  totalUpvotes: true,
  totalBookmarks: true,
  totalComments: true,
  publishedAt: true,
  lastActivityAt: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
    },
  },
} as const;

const preferenceIdeaSelect = {
  id: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

const publicIdeaWhere: Prisma.IdeaWhereInput = {
  deletedAt: null,
  OR: [
    {
      publishedAt: {
        not: null,
      },
    },
    {
      status: IdeaStatus.APPROVED,
    },
  ],
};

const clampLimit = (
  value: unknown,
  defaultLimit = 8,
  maxLimit = 20,
): number => {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(limit), maxLimit);
};

const normalizeSearchTerm = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getDefaultBanner = () => ({
  title: "Discover High-Impact Sustainability Ideas",
  subtitle:
    "Explore trending EcoSpark ideas ranked by activity and eco impact.",
  ctaText: "Explore Trending Ideas",
  ctaLink: "/ai-discover",
  personalization: {
    category: null,
    tag: null,
  },
});

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasKeyword = (value: string, keyword: string) => {
  const normalizedKeyword = keyword.toLowerCase().trim();

  if (!normalizedKeyword) {
    return false;
  }

  if (normalizedKeyword.length <= 4 || normalizedKeyword.includes(" ")) {
    return new RegExp(
      `(^|\\W)${escapeRegExp(normalizedKeyword)}(\\W|$)`,
      "i",
    ).test(value);
  }

  return value.includes(normalizedKeyword);
};

const hasAnyKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => hasKeyword(value, keyword));

type FallbackChatAnswer = {
  id: string;
  keywords: string[];
  reply:
    | string
    | ((context: { hasUserContext: boolean; message: string }) => string);
};

const getChatSuggestedActions = (hasUserContext: boolean, message = "") => {
  const normalizedMessage = message.toLowerCase();

  if (hasAnyKeyword(normalizedMessage, ["search", "find", "browse"])) {
    return [
      {
        label: "Browse ideas",
        href: "/idea",
      },
      {
        label: "Open AI Discover",
        href: "/ai-discover",
      },
    ];
  }

  if (hasAnyKeyword(normalizedMessage, ["campaign"])) {
    return [
      {
        label: "View campaigns",
        href: "/campaigns",
      },
      {
        label: "Browse ideas",
        href: "/idea",
      },
    ];
  }

  if (
    hasAnyKeyword(normalizedMessage, [
      "submit",
      "create",
      "post",
      "autofill",
      "form",
    ])
  ) {
    return [
      {
        label: hasUserContext ? "Create idea" : "Login to create",
        href: hasUserContext ? "/scientist/dashboard/create-idea" : "/login",
      },
      {
        label: "Browse examples",
        href: "/idea",
      },
    ];
  }

  if (
    hasAnyKeyword(normalizedMessage, [
      "dashboard",
      "analytics",
      "insight",
      "report",
      "anomaly",
    ])
  ) {
    return [
      {
        label: hasUserContext ? "Open dashboard" : "Login for dashboard",
        href: hasUserContext ? "/dashboard" : "/login",
      },
      {
        label: "Open AI Discover",
        href: "/ai-discover",
      },
    ];
  }

  if (
    hasAnyKeyword(normalizedMessage, [
      "recommend",
      "personalized",
      "trending",
      "suggest",
    ])
  ) {
    return [
      {
        label: "Open AI Discover",
        href: "/ai-discover",
      },
      {
        label: hasUserContext ? "Browse ideas" : "Login for personalization",
        href: hasUserContext ? "/idea" : "/login",
      },
    ];
  }

  return hasUserContext
    ? [
        {
          label: "Explore recommended ideas",
          href: "/ai-discover",
        },
        {
          label: "Review dashboard insights",
          href: "/dashboard",
        },
      ]
    : [
        {
          label: "Browse ideas",
          href: "/idea",
        },
        {
          label: "Login for personalization",
          href: "/login",
        },
      ];
};

const fallbackChatAnswers: FallbackChatAnswer[] = [
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "salam", "assalamu"],
    reply:
      "Hi. I can help with EcoSpark ideas, AI recommendations, search, campaigns, paid access, dashboards, and idea submission. Ask me what you want to do next.",
  },
  {
    id: "what-is-ecospark",
    keywords: ["what is ecospark", "about ecospark", "eco spark"],
    reply:
      "EcoSpark is a sustainability innovation platform where people discover eco ideas, scientists submit solutions, members interact with ideas, and admins manage platform activity.",
  },
  {
    id: "how-it-works",
    keywords: ["how it works", "how works", "how does it work", "work"],
    reply:
      "EcoSpark works in four steps: browse ideas, sign in for personalization, interact through votes/bookmarks/comments/purchases, and use dashboards to track insights or submissions.",
  },
  {
    id: "main-features",
    keywords: ["features", "what can", "what do", "capabilities"],
    reply:
      "Main features include idea browsing, AI Discover, recommendations, chatbot support, smart idea autofill, campaigns, comments, voting, bookmarks, paid idea access, and role dashboards.",
  },
  {
    id: "ai-features",
    keywords: ["ai feature", "ai features", "artificial intelligence"],
    reply:
      "EcoSpark AI features include search suggestions, personalized recommendations, trending ideas, dynamic banners, chatbot support, smart idea autofill, dashboard insights, next actions, and anomaly alerts.",
  },
  {
    id: "chatbot-purpose",
    keywords: ["chatbot", "assistant", "bot"],
    reply:
      "The chatbot answers EcoSpark product questions, explains workflows, suggests useful pages, and falls back to built-in answers if the live AI provider is unavailable.",
  },
  {
    id: "chatbot-not-ai",
    keywords: ["same answer", "repeated answer", "not ai"],
    reply:
      "If answers feel repeated, the backend is likely using fallback mode because the OpenAI provider failed. Fallback mode still answers project questions, but real AI needs a valid API key, model access, and quota.",
  },
  {
    id: "search-ideas",
    keywords: ["search ideas", "find ideas", "browse ideas"],
    reply:
      "Use the idea library to search by title, summary, author, or category. AI Discover can also show search suggestions while typing.",
  },
  {
    id: "search-suggestions",
    keywords: ["search suggestion", "suggestions while typing", "autocomplete"],
    reply:
      "AI search suggestions look at matching ideas, categories, and tags, then return quick links so users can move faster while typing.",
  },
  {
    id: "recommendations",
    keywords: ["recommend", "recommendation", "personalized"],
    reply: ({ hasUserContext }) =>
      hasUserContext
        ? "Your recommendations use your votes, bookmarks, purchases, and created ideas to rank matching sustainability ideas."
        : "Personalized recommendations need login because the backend needs your activity history. Guests can still see trending ideas.",
  },
  {
    id: "trending-ideas",
    keywords: ["trending", "popular", "hot ideas"],
    reply:
      "Trending ideas are ranked from activity signals such as views, votes, bookmarks, comments, eco score, and recency.",
  },
  {
    id: "dynamic-banner",
    keywords: ["dynamic banner", "hero banner", "personalized banner"],
    reply:
      "The dynamic banner changes its title, subtitle, and call-to-action based on user preferences when the user is signed in. Guests see a general discovery banner.",
  },
  {
    id: "coupon",
    keywords: ["coupon", "discount", "offer"],
    reply:
      "Predictive coupons can be suggested from user behavior when coupon data exists. A user who browses or purchases related ideas can receive more relevant offers.",
  },
  {
    id: "dashboard-insights",
    keywords: ["dashboard insight", "insights", "analytics"],
    reply:
      "Dashboard AI insights summarize platform or user activity, such as idea progress, bookmarks, purchases, moderation queues, and top activity categories.",
  },
  {
    id: "next-actions",
    keywords: ["next action", "what next", "next steps"],
    reply:
      "AI next actions suggest useful follow-ups, such as submitting draft ideas, checking pending purchases, reviewing notifications, or exploring trending ideas.",
  },
  {
    id: "anomaly-alerts",
    keywords: ["anomaly", "unusual", "alert", "spike"],
    reply:
      "Admin anomaly detection compares recent activity with the previous period and flags report spikes, failed purchase spikes, idea drops, rejection increases, or signup spikes.",
  },
  {
    id: "admin-dashboard",
    keywords: ["admin dashboard", "admin analytics", "admin panel"],
    reply:
      "The admin dashboard shows users, ideas, commerce, moderation queues, campaigns, scientist verification, community signals, and AI anomaly alerts.",
  },
  {
    id: "member-dashboard",
    keywords: ["member dashboard", "member panel"],
    reply:
      "The member dashboard focuses on purchases, saved ideas, votes, comments, notifications, and personalized next actions.",
  },
  {
    id: "scientist-dashboard",
    keywords: ["scientist dashboard", "scientist panel"],
    reply:
      "The scientist dashboard helps researchers manage profile readiness, submitted ideas, review status, engagement, and smart idea creation.",
  },
  {
    id: "submit-idea",
    keywords: ["submit idea", "create idea", "post idea", "new idea"],
    reply:
      "To submit an idea, sign in as a scientist, open Create Idea, fill the core details, use Smart idea autofill if needed, then submit for review.",
  },
  {
    id: "smart-autofill",
    keywords: ["smart autofill", "autofill", "form suggestion"],
    reply:
      "Smart idea autofill reads the draft title, problem, solution, audience, category, and tags, then suggests stronger description fields and metadata.",
  },
  {
    id: "idea-title",
    keywords: ["idea title", "title field"],
    reply:
      "A good idea title should be short, specific, and outcome-focused, for example 'Solar Water Purifier for Rural Homes'.",
  },
  {
    id: "problem-statement",
    keywords: ["problem statement", "problem field"],
    reply:
      "The problem statement should explain the environmental issue, who is affected, why it matters, and what happens if nothing changes.",
  },
  {
    id: "proposed-solution",
    keywords: ["proposed solution", "solution field"],
    reply:
      "The proposed solution should explain the method, materials or process, who will use it, and why it is practical for the target audience.",
  },
  {
    id: "implementation-steps",
    keywords: ["implementation steps", "steps field"],
    reply:
      "Implementation steps should be sequential: validate the problem, run a pilot, measure impact, improve, then scale through partners or campaigns.",
  },
  {
    id: "expected-benefits",
    keywords: ["expected benefits", "benefits field"],
    reply:
      "Expected benefits should describe environmental, social, cost, and usability outcomes, ideally with measurable indicators.",
  },
  {
    id: "risks",
    keywords: ["risks", "challenges", "risk field"],
    reply:
      "Risks and challenges can include low adoption, funding gaps, technical limits, weak measurement, supply issues, or maintenance problems.",
  },
  {
    id: "resources",
    keywords: ["required resources", "resources field"],
    reply:
      "Required resources should list people, materials, tools, partners, budget, data, or facilities needed to test and scale the idea.",
  },
  {
    id: "categories",
    keywords: ["category", "categories"],
    reply:
      "Categories group ideas by sustainability area, such as energy, water, recycling, climate, agriculture, or community impact.",
  },
  {
    id: "tags",
    keywords: ["tag", "tags"],
    reply:
      "Tags add smaller discovery labels to ideas. They help search, recommendations, and filtering understand the topic more accurately.",
  },
  {
    id: "campaigns",
    keywords: ["campaign", "campaigns"],
    reply:
      "Campaigns organize sustainability activity around a goal, challenge, event, or impact area. Users can browse campaigns and connect ideas to them.",
  },
  {
    id: "join-campaign",
    keywords: ["join campaign", "participate campaign"],
    reply:
      "To participate in a campaign, open the campaign page, review its goals and timeline, then interact with related ideas or submissions.",
  },
  {
    id: "create-campaign",
    keywords: ["create campaign", "arrange campaign"],
    reply:
      "Campaign creation is handled from the dashboard area. It usually needs a title, description, timeline, target goal, and campaign status.",
  },
  {
    id: "vote",
    keywords: ["vote", "upvote", "downvote"],
    reply:
      "Voting lets users signal support or disagreement. Votes also help AI recommendations learn what a user finds useful.",
  },
  {
    id: "comments",
    keywords: ["comment", "comments", "reply"],
    reply:
      "Comments support discussion around an idea. Users can ask questions, provide feedback, or discuss implementation details.",
  },
  {
    id: "bookmarks",
    keywords: ["bookmark", "saved idea", "save idea"],
    reply:
      "Bookmarks save ideas for later and also help the recommendation system understand a user's interests.",
  },
  {
    id: "views",
    keywords: ["views", "unique views"],
    reply:
      "Idea views measure attention. Unique views count distinct visitors, while total views can include repeated visits.",
  },
  {
    id: "paid-ideas",
    keywords: ["paid idea", "premium idea", "locked idea"],
    reply:
      "Paid ideas keep full details locked until the user completes checkout and the purchase status becomes paid.",
  },
  {
    id: "free-ideas",
    keywords: ["free idea", "free access"],
    reply:
      "Free ideas can be opened directly from the public idea library without completing checkout.",
  },
  {
    id: "checkout",
    keywords: ["checkout", "payment", "stripe"],
    reply:
      "Checkout creates a payment session for paid ideas. After payment succeeds, the purchase record should unlock the idea details.",
  },
  {
    id: "purchase-status",
    keywords: ["purchase status", "pending purchase", "paid status"],
    reply:
      "Purchase status can be pending, paid, failed, cancelled, or refunded. Paid status is the one that unlocks protected idea details.",
  },
  {
    id: "refund",
    keywords: ["refund", "refunded"],
    reply:
      "Refunded purchases are tracked in commerce analytics. Access behavior depends on how your backend policy handles refunded paid ideas.",
  },
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost"],
    reply:
      "Idea pricing depends on access type. Free ideas use price 0; paid ideas need a price and currency before checkout.",
  },
  {
    id: "login",
    keywords: ["login", "sign in"],
    reply:
      "Login is needed for personalization, dashboards, saved ideas, purchases, voting, comments, and idea submission.",
  },
  {
    id: "register",
    keywords: ["register", "signup", "sign up"],
    reply:
      "Registration creates an EcoSpark account. After registration, users can interact with ideas and access role-specific dashboards.",
  },
  {
    id: "logout",
    keywords: ["logout", "log out"],
    reply:
      "Logout clears the session and returns the user to public browsing mode. Personalized features need login again.",
  },
  {
    id: "password-reset",
    keywords: ["forgot password", "reset password", "change password"],
    reply:
      "Use forgot password to request a reset flow, or change password from the protected account settings after login.",
  },
  {
    id: "profile",
    keywords: ["profile", "my profile"],
    reply:
      "The profile page manages personal information. Scientist users may also need profile verification for trust signals.",
  },
  {
    id: "scientist-verification",
    keywords: ["scientist verification", "verify scientist", "verified scientist"],
    reply:
      "Scientist verification helps build trust around submitted ideas. Admins review verification status from the dashboard.",
  },
  {
    id: "roles",
    keywords: ["role", "roles", "user type"],
    reply:
      "EcoSpark roles include guest, member, scientist, admin, and super admin. Each role sees different actions and dashboard areas.",
  },
  {
    id: "guest-access",
    keywords: ["guest", "without login", "not logged in"],
    reply:
      "Guests can browse public ideas, use public AI search, see trending content, and use the chatbot. Personalization needs login.",
  },
  {
    id: "moderation",
    keywords: ["moderation", "review queue"],
    reply:
      "Moderation lets admins review reports, rejected content, and suspicious activity so the public platform stays useful and safe.",
  },
  {
    id: "report-idea",
    keywords: ["report idea", "flag idea"],
    reply:
      "Idea reports let users flag content for admin review. Admin dashboards summarize pending reports and moderation workload.",
  },
  {
    id: "report-comment",
    keywords: ["report comment", "flag comment"],
    reply:
      "Comment reports help moderation teams find problematic discussion. They appear in moderation analytics and admin workflows.",
  },
  {
    id: "notifications",
    keywords: ["notification", "notifications"],
    reply:
      "Notifications tell users about relevant account, idea, purchase, or dashboard activity. AI next actions can remind users to review unread notifications.",
  },
  {
    id: "newsletter",
    keywords: ["newsletter", "email update"],
    reply:
      "Newsletter subscriptions let users receive EcoSpark updates. Smart newsletter recommendations can later send relevant ideas or campaigns.",
  },
  {
    id: "contact",
    keywords: ["contact", "contact form"],
    reply:
      "Use the contact page to send a structured request. Include your account email, issue type, and the page where the problem happened.",
  },
  {
    id: "support",
    keywords: ["support", "help center", "help"],
    reply:
      "Support can help with login, purchases, idea access, account issues, and general platform questions.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "data privacy"],
    reply:
      "Privacy information should explain what user data is collected, why it is used, and how account or activity data supports platform features.",
  },
  {
    id: "terms",
    keywords: ["terms", "conditions", "rules"],
    reply:
      "Terms explain platform usage rules, account responsibilities, content expectations, paid access rules, and acceptable behavior.",
  },
  {
    id: "saved-ideas",
    keywords: ["saved ideas", "my saved"],
    reply:
      "Saved ideas are bookmarked ideas. They are useful for revisiting concepts and improving recommendation quality.",
  },
  {
    id: "my-purchases",
    keywords: ["my purchases", "purchase history"],
    reply:
      "My purchases shows paid, pending, failed, cancelled, or refunded idea purchases tied to the current account.",
  },
  {
    id: "my-votes",
    keywords: ["my votes", "vote history"],
    reply:
      "My votes shows ideas you have supported or rated. Vote history also helps personalize recommendations.",
  },
  {
    id: "my-comments",
    keywords: ["my comments", "comment history"],
    reply:
      "My comments helps users revisit their idea discussions and manage past conversation activity.",
  },
  {
    id: "category-management",
    keywords: ["create category", "category management"],
    reply:
      "Admins can create and manage idea categories so public ideas stay organized and easier to discover.",
  },
  {
    id: "tag-management",
    keywords: ["tag management", "create tag"],
    reply:
      "Tag management lets admins maintain searchable labels that support filtering, AI suggestions, and recommendations.",
  },
  {
    id: "user-management",
    keywords: ["user management", "manage users"],
    reply:
      "User management helps admins review accounts, roles, profile state, blocked users, and platform access.",
  },
  {
    id: "scientist-management",
    keywords: ["scientist management", "manage scientists"],
    reply:
      "Scientist management lets admins review scientist profiles, verification status, specialties, and related user accounts.",
  },
  {
    id: "commerce-analytics",
    keywords: ["commerce analytics", "sales", "revenue"],
    reply:
      "Commerce analytics summarize purchase counts, paid purchases, pending purchases, failed payments, refunds, and total revenue.",
  },
  {
    id: "eco-score",
    keywords: ["eco score", "ecoscore"],
    reply:
      "Eco score reflects environmental strength. Higher eco scores can help ideas appear stronger in rankings and dashboards.",
  },
  {
    id: "impact-score",
    keywords: ["impact score"],
    reply:
      "Impact score estimates how meaningful the idea's outcome could be for users, communities, or the environment.",
  },
  {
    id: "feasibility-score",
    keywords: ["feasibility score", "feasible"],
    reply:
      "Feasibility score reflects how practical the idea is to implement with available resources, time, and constraints.",
  },
  {
    id: "co2-reduction",
    keywords: ["co2", "carbon", "emission"],
    reply:
      "CO2 reduction fields estimate monthly carbon impact. Strong ideas should explain how the reduction is calculated or measured.",
  },
  {
    id: "waste-reduction",
    keywords: ["waste reduction", "waste"],
    reply:
      "Waste reduction estimates how much material waste the idea can reduce each month, usually in kilograms.",
  },
  {
    id: "water-saving",
    keywords: ["water saving", "water saved", "water"],
    reply:
      "Water saved measures estimated monthly water conservation. It is useful for purification, irrigation, reuse, and conservation ideas.",
  },
  {
    id: "energy-saving",
    keywords: ["energy saving", "energy saved", "kwh"],
    reply:
      "Energy saved estimates monthly energy reduction, often measured in kWh. It supports energy efficiency and renewable ideas.",
  },
  {
    id: "search-filter",
    keywords: ["filter", "filters"],
    reply:
      "The idea page supports filtering by category, price, date, location, and search text so users can narrow results quickly.",
  },
  {
    id: "sort-ideas",
    keywords: ["sort", "sorting"],
    reply:
      "Ideas can be sorted by newest activity, old activity, price, impact score, eco score, views, or title.",
  },
  {
    id: "location-filter",
    keywords: ["location filter", "city", "country", "region"],
    reply:
      "Location filtering checks location-like fields on ideas and authors so users can find ideas relevant to a place.",
  },
  {
    id: "date-filter",
    keywords: ["date filter", "date from", "date to"],
    reply:
      "Date filters help users find ideas updated or active within a selected time range.",
  },
  {
    id: "attachments",
    keywords: ["attachment", "attachments", "file"],
    reply:
      "Idea attachments can store supporting files such as documents, diagrams, or evidence for implementation.",
  },
  {
    id: "media",
    keywords: ["media", "video", "cover image"],
    reply:
      "Idea media and cover images help users understand the concept visually. Use clear, relevant assets instead of decorative images.",
  },
  {
    id: "seo",
    keywords: ["seo", "seo title", "seo description"],
    reply:
      "SEO fields improve discoverability by giving ideas clear titles and descriptions for search and sharing surfaces.",
  },
  {
    id: "slug",
    keywords: ["slug", "url slug"],
    reply:
      "A slug is the URL-friendly version of a title. It should be lowercase, short, readable, and unique.",
  },
  {
    id: "draft-status",
    keywords: ["draft", "draft idea"],
    reply:
      "Draft ideas are not final. The user can continue editing before submitting the idea for review.",
  },
  {
    id: "submit-review",
    keywords: ["submit for review", "under review"],
    reply:
      "Submitting for review moves an idea from draft or preparation into the review workflow where admins can approve, reject, or request changes.",
  },
  {
    id: "approval",
    keywords: ["approved", "approval"],
    reply:
      "Approved ideas passed review and can become visible or usable depending on publication and visibility settings.",
  },
  {
    id: "rejection",
    keywords: ["rejected", "rejection"],
    reply:
      "Rejected ideas should include feedback so the creator understands what needs improvement before resubmission.",
  },
  {
    id: "archived",
    keywords: ["archived", "archive"],
    reply:
      "Archived ideas are removed from active circulation without necessarily deleting their history.",
  },
  {
    id: "featured",
    keywords: ["featured", "feature idea"],
    reply:
      "Featured ideas are promoted by the platform and can receive stronger visibility in dashboards or public sections.",
  },
  {
    id: "highlighted",
    keywords: ["highlighted", "highlight idea"],
    reply:
      "Highlighted ideas are marked for extra attention, often because they are timely, high-impact, or strategically important.",
  },
  {
    id: "visibility",
    keywords: ["visibility", "public", "private"],
    reply:
      "Visibility controls whether an idea is public or private. Public ideas can appear in the public library when approved or published.",
  },
  {
    id: "access-type",
    keywords: ["access type", "free access", "paid access"],
    reply:
      "Access type controls whether idea details are free or paid. Paid access uses checkout and purchase status.",
  },
  {
    id: "api-base-url",
    keywords: ["api base url", "next_public_api_base_url", "base url"],
    reply:
      "The frontend uses NEXT_PUBLIC_API_BASE_URL to decide which backend API it calls. Use local backend URL for local testing and deployed API URL for production.",
  },
  {
    id: "service-unavailable",
    keywords: ["service unavailable", "temporarily unavailable", "503"],
    reply:
      "Service unavailable usually means the backend returned a server error. For chatbot, check backend deployment, AI env variables, model access, quota, and whether the frontend points to the correct backend.",
  },
  {
    id: "unauthorized",
    keywords: ["401", "unauthorized", "not authorized"],
    reply:
      "401 means the endpoint requires authentication or the access token is missing, invalid, or expired. Login again or use a public endpoint.",
  },
  {
    id: "deploy-backend",
    keywords: ["deploy backend", "deployment", "vercel backend"],
    reply:
      "After backend code changes, deploy the backend and set production environment variables. Otherwise the frontend may still call old deployed behavior.",
  },
  {
    id: "local-testing",
    keywords: ["local test", "localhost", "local backend"],
    reply:
      "For local testing, run the backend locally and point frontend NEXT_PUBLIC_API_BASE_URL to something like http://localhost:5000/api/v1.",
  },
  {
    id: "openai-key",
    keywords: ["openai key", "api key", "ai_api_key"],
    reply:
      "AI_API_KEY must be a valid server-side OpenAI key in the backend environment. Do not expose it in frontend code or public chat.",
  },
  {
    id: "ai-model",
    keywords: ["ai_model", "model", "gpt"],
    reply:
      "AI_MODEL controls which OpenAI model the backend calls. If the model is unavailable to your key, the backend fallback assistant will answer instead.",
  },
  {
    id: "quota",
    keywords: ["quota", "billing", "rate limit"],
    reply:
      "If OpenAI quota, billing, or rate limits fail, the backend catches the provider error and returns a fallback EcoSpark answer.",
  },
  {
    id: "security",
    keywords: ["security", "secret", "token"],
    reply:
      "Keep API keys, JWT secrets, database URLs, Stripe secrets, and SMTP credentials only in backend environment variables.",
  },
  {
    id: "cors",
    keywords: ["cors", "origin"],
    reply:
      "CORS must allow the frontend origin and credentials if the frontend sends cookies or authenticated requests to the backend.",
  },
  {
    id: "cookies",
    keywords: ["cookie", "cookies", "session"],
    reply:
      "Auth can use access tokens, refresh tokens, and session cookies. If cookies are missing or blocked, protected API calls may return 401.",
  },
  {
    id: "refresh-token",
    keywords: ["refresh token", "token refresh"],
    reply:
      "The frontend can refresh expired tokens through the auth refresh endpoint. If refresh fails, protected routes should send the user back to login.",
  },
  {
    id: "admin-anomaly",
    keywords: ["admin anomaly", "admin alert"],
    reply:
      "Admin anomaly alerts are protected and only admins or super admins should call that endpoint.",
  },
  {
    id: "public-ai-discover",
    keywords: ["ai discover", "discover page"],
    reply:
      "AI Discover is the frontend page that combines dynamic banner content, search suggestions, recommendations, trending ideas, and dashboard-style AI insights.",
  },
  {
    id: "home-page",
    keywords: ["home page", "landing page"],
    reply:
      "The public home page introduces EcoSpark and should route users toward ideas, campaigns, scientists, AI Discover, login, and registration.",
  },
  {
    id: "scientist-page",
    keywords: ["scientist page", "scientists page"],
    reply:
      "The scientists page helps users discover contributor profiles and understand who is behind sustainability ideas.",
  },
  {
    id: "community-page",
    keywords: ["community", "community page"],
    reply:
      "The community page focuses on public reports, shared experiences, and platform participation beyond individual idea cards.",
  },
  {
    id: "subscription-plan",
    keywords: ["subscription", "plan", "plans"],
    reply:
      "Subscription or plan pages can explain premium platform access, membership options, or commercial features if your product scope includes them.",
  },
  {
    id: "idea-library",
    keywords: ["idea library", "ideas page"],
    reply:
      "The idea library is the main public browsing surface. It includes search, filters, sorting, cards, paid access states, and pagination.",
  },
  {
    id: "idea-detail",
    keywords: ["idea detail", "details page"],
    reply:
      "Idea detail pages show the full idea content, metrics, interactions, comments, purchase access, and related activity.",
  },
  {
    id: "access-denied",
    keywords: ["access denied", "forbidden", "403"],
    reply:
      "403 means the user is authenticated but does not have the required role or permission for that endpoint or page.",
  },
  {
    id: "not-found",
    keywords: ["not found", "404"],
    reply:
      "404 means the requested route or record does not exist. Check the URL, idea id, slug, and backend route registration.",
  },
  {
    id: "server-error",
    keywords: ["500", "server error"],
    reply:
      "A 500 error means the backend failed internally. Check backend logs, environment variables, database connectivity, and provider errors.",
  },
  {
    id: "database",
    keywords: ["database", "prisma", "db"],
    reply:
      "The backend uses Prisma for database operations. If database connection fails, analytics, ideas, auth, and AI context can fail.",
  },
  {
    id: "stripe",
    keywords: ["stripe", "webhook"],
    reply:
      "Stripe handles checkout and webhooks for paid ideas. Webhook configuration must match the deployed backend URL and secret.",
  },
  {
    id: "cloudinary",
    keywords: ["cloudinary", "upload", "image upload"],
    reply:
      "Cloudinary stores uploaded assets such as images or files. Backend env variables must include cloud name, API key, and API secret.",
  },
  {
    id: "email",
    keywords: ["email", "smtp", "verification email"],
    reply:
      "Email features use SMTP settings for verification, password reset, and communication flows. Missing SMTP env can break those features.",
  },
  {
    id: "google-auth",
    keywords: ["google login", "google auth", "oauth"],
    reply:
      "Google OAuth needs client id, client secret, callback URL, and matching allowed origins in the backend and provider console.",
  },
  {
    id: "better-auth",
    keywords: ["better auth", "better-auth"],
    reply:
      "Better Auth is used for auth/session behavior. Make sure BETTER_AUTH_URL and secrets match the backend environment.",
  },
  {
    id: "frontend-backend",
    keywords: ["frontend", "backend"],
    reply:
      "The frontend calls the backend through the configured API base URL. When debugging, confirm the browser is calling the backend version you just changed.",
  },
  {
    id: "project-summary",
    keywords: ["my project", "project summary", "project"],
    reply:
      "Your project is EcoSpark: a Next.js frontend and Express/Prisma backend for sustainability ideas, campaigns, users, commerce, dashboards, and AI-assisted discovery.",
  },
  {
    id: "bangla",
    keywords: ["bangla", "bengali", "বাংলা"],
    reply:
      "আপনি চাইলে বাংলায় প্রশ্ন করতে পারেন। আমি EcoSpark project, idea submission, AI features, dashboard, campaign, payment, login এবং support flow নিয়ে সাহায্য করতে পারি।",
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "ধন্যবাদ"],
    reply:
      "You are welcome. Ask about any EcoSpark workflow, such as ideas, recommendations, campaigns, dashboards, payments, or AI setup.",
  },
  {
    id: "examples",
    keywords: ["example", "sample", "demo"],
    reply:
      "Example questions: 'How do recommendations work?', 'How do I submit an idea?', 'Why is paid access locked?', or 'What does admin anomaly detection show?'",
  },
];

const getFallbackChatReply = (message: string, hasUserContext: boolean) => {
  const normalizedMessage = message.toLowerCase();

  const matchedAnswer = fallbackChatAnswers.find((answer) =>
    hasAnyKeyword(normalizedMessage, answer.keywords),
  );

  if (matchedAnswer) {
    return typeof matchedAnswer.reply === "function"
      ? matchedAnswer.reply({ hasUserContext, message })
      : matchedAnswer.reply;
  }

  const shortMessage = message.trim().slice(0, 90);

  return shortMessage
    ? `I can help with "${shortMessage}". In fallback mode I answer best about EcoSpark search, recommendations, campaigns, idea submission, purchases, and dashboards. Try asking one of those directly.`
    : "I can help with EcoSpark search, recommendations, campaigns, idea submission, purchases, and dashboards. Ask a specific question to get a more useful answer.";
};

const buildFallbackIdeaSuggestions = (
  payload: IIdeaFormSuggestionPayload,
  categories: Array<{ name: string; slug: string }>,
  tags: Array<{ name: string; slug: string }>,
  preference: {
    topCategory: { name: string } | null;
    topTag: { name: string } | null;
  },
) => {
  const title = payload.title?.trim() || "this sustainability idea";
  const problem = payload.problemStatement?.trim();
  const solution = payload.proposedSolution?.trim();
  const audience = payload.targetAudience?.trim() || "the target community";
  const suggestedCategoryName =
    preference.topCategory?.name ?? categories[0]?.name ?? undefined;
  const suggestedTags = [
    ...(preference.topTag ? [preference.topTag.name] : []),
    ...tags.slice(0, 4).map((tag) => tag.name),
  ].filter(Boolean);

  return {
    excerpt: `${title} helps ${audience} solve an environmental problem with a practical, measurable approach.`,
    description: [
      `${title} focuses on a sustainability challenge that affects ${audience}.`,
      problem ? `Problem: ${problem}` : undefined,
      solution ? `Solution: ${solution}` : undefined,
      "The idea should define the implementation context, required partners, expected environmental impact, and how success will be measured.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    proposedSolution:
      solution ??
      "Use a small, testable pilot first, measure environmental and user outcomes, then scale the idea through partners or campaigns.",
    implementationSteps:
      "1. Validate the problem with target users.\n2. Build a low-cost pilot.\n3. Track impact metrics such as CO2, waste, water, or energy savings.\n4. Collect feedback and improve the model.\n5. Publish results and prepare for broader adoption.",
    expectedBenefits:
      "Reduced environmental waste, clearer community impact, stronger awareness, and a reusable model for future sustainability projects.",
    risksAndChallenges:
      "Possible risks include low adoption, limited resources, measurement gaps, supplier delays, or unclear long-term maintenance ownership.",
    requiredResources:
      "A pilot team, local partners, basic materials or tools, data collection support, and a simple reporting process.",
    suggestedCategoryName,
    suggestedTags: Array.from(new Set(suggestedTags)).slice(0, 5),
  };
};

const daysSince = (value?: Date | null) => {
  if (!value) {
    return 365;
  }

  return Math.max(0, (Date.now() - value.getTime()) / (24 * 60 * 60 * 1000));
};

const scoreTrendingIdea = (idea: {
  ecoScore: number | null;
  totalViews: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalComments: number;
  lastActivityAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
}) => {
  const activityDate = idea.lastActivityAt ?? idea.publishedAt ?? idea.createdAt;
  const recencyScore = Math.max(0, 21 - daysSince(activityDate));

  return (
    idea.totalViews * 0.2 +
    idea.totalUpvotes * 4 +
    idea.totalBookmarks * 5 +
    idea.totalComments * 2 +
    (idea.ecoScore ?? 0) * 3 +
    recencyScore
  );
};

const incrementScore = (
  map: Map<string, ScoreItem>,
  item: { id: string; name: string; slug?: string | null },
  weight: number,
) => {
  const existing = map.get(item.id);

  if (existing) {
    existing.score += weight;
    return;
  }

  map.set(item.id, {
    id: item.id,
    name: item.name,
    slug: item.slug,
    score: weight,
  });
};

const toSortedScores = (map: Map<string, ScoreItem>) =>
  [...map.values()].sort((a, b) => b.score - a.score);

const getUserPreferenceProfile = async (userId: string) => {
  const [createdIdeas, bookmarks, votes, purchases] = await Promise.all([
    prisma.idea.findMany({
      where: {
        authorId: userId,
        deletedAt: null,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      select: preferenceIdeaSelect,
    }),
    prisma.ideaBookmark.findMany({
      where: {
        userId,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
    prisma.vote.findMany({
      where: {
        userId,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
    prisma.ideaPurchase.findMany({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
  ]);

  const categoryScores = new Map<string, ScoreItem>();
  const tagScores = new Map<string, ScoreItem>();

  const addIdea = (idea: PreferenceIdea, weight: number) => {
    incrementScore(categoryScores, idea.category, weight);

    idea.tags.forEach((tag) => {
      incrementScore(tagScores, tag, weight);
    });
  };

  createdIdeas.forEach((idea) => addIdea(idea, 2));
  bookmarks.forEach((bookmark) => addIdea(bookmark.idea, 4));
  votes.forEach((vote) => addIdea(vote.idea, 3));
  purchases.forEach((purchase) => addIdea(purchase.idea, 5));

  const categories = toSortedScores(categoryScores);
  const tags = toSortedScores(tagScores);

  return {
    categories,
    tags,
    topCategory: categories[0] ?? null,
    topTag: tags[0] ?? null,
    categoryIds: categories.slice(0, 5).map((item) => item.id),
    tagIds: tags.slice(0, 8).map((item) => item.id),
  };
};

const getSearchSuggestions = async (query: Record<string, unknown>) => {
  const searchTerm = normalizeSearchTerm(
    query.searchTerm ?? query.q ?? query.search,
  );
  const limit = clampLimit(query.limit, 8, 15);

  if (searchTerm.length < 2) {
    return [];
  }

  const [ideas, categories, tags] = await Promise.all([
    prisma.idea.findMany({
      where: {
        AND: [
          publicIdeaWhere,
          {
            OR: [
              {
                title: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
              {
                excerpt: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
      take: limit,
      orderBy: {
        totalViews: "desc",
      },
      select: {
        title: true,
        slug: true,
      },
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      take: Math.ceil(limit / 2),
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.tag.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      take: Math.ceil(limit / 2),
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const suggestions: IAiSuggestion[] = [
    ...ideas.map((idea) => ({
      type: "IDEA" as const,
      label: idea.title,
      value: idea.slug,
      href: `/idea/${idea.slug}`,
    })),
    ...categories.map((category) => ({
      type: "CATEGORY" as const,
      label: category.name,
      value: category.id,
      href: `/idea?categoryId=${category.id}`,
    })),
    ...tags.map((tag) => ({
      type: "TAG" as const,
      label: tag.name,
      value: tag.id,
      href: `/idea?tag=${tag.slug}`,
    })),
  ];

  return suggestions.slice(0, limit);
};

const getTrendingIdeas = async (query: Record<string, unknown>) => {
  const limit = clampLimit(query.limit, 8, 20);

  const ideas = await prisma.idea.findMany({
    where: publicIdeaWhere,
    take: 60,
    orderBy: [
      {
        totalViews: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: ideaCardSelect,
  });

  return ideas
    .map((idea) => ({
      ...idea,
      aiScore: scoreTrendingIdea(idea),
      reason: "Trending from recent views, votes, bookmarks, and eco score",
    }))
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, limit);
};

const getRecommendations = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const limit = clampLimit(query.limit, 8, 20);
  const preference = await getUserPreferenceProfile(userId);
  const preferenceFilters: Prisma.IdeaWhereInput[] = [];

  if (preference.categoryIds.length) {
    preferenceFilters.push({
      categoryId: {
        in: preference.categoryIds,
      },
    });
  }

  if (preference.tagIds.length) {
    preferenceFilters.push({
      tags: {
        some: {
          id: {
            in: preference.tagIds,
          },
        },
      },
    });
  }

  if (!preferenceFilters.length) {
    const trendingIdeas = await getTrendingIdeas({
      limit,
    });

    return {
      source: "TRENDING_FALLBACK",
      basedOn: {
        category: null,
        tag: null,
      },
      data: trendingIdeas,
    };
  }

  const ideas = await prisma.idea.findMany({
    where: {
      AND: [
        publicIdeaWhere,
        {
          authorId: {
            not: userId,
          },
        },
        {
          OR: preferenceFilters,
        },
      ],
    },
    take: 60,
    orderBy: {
      updatedAt: "desc",
    },
    select: ideaCardSelect,
  });

  const categoryScoreMap = new Map(
    preference.categories.map((item) => [item.id, item.score]),
  );
  const tagScoreMap = new Map(preference.tags.map((item) => [item.id, item.score]));

  const rankedIdeas = ideas
    .map((idea) => {
      const categoryBoost = categoryScoreMap.get(idea.category.id) ?? 0;
      const tagBoost = idea.tags.reduce(
        (total, tag) => total + (tagScoreMap.get(tag.id) ?? 0),
        0,
      );
      const aiScore = scoreTrendingIdea(idea) + categoryBoost * 8 + tagBoost * 4;
      const reason = preference.topCategory
        ? `Recommended because you interact with ${preference.topCategory.name} ideas`
        : "Recommended from your recent EcoSpark activity";

      return {
        ...idea,
        aiScore,
        reason,
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, limit);

  return {
    source: "PERSONALIZED",
    basedOn: {
      category: preference.topCategory,
      tag: preference.topTag,
    },
    data: rankedIdeas,
  };
};

const getPersonalizedBanner = async (userId?: string) => {
  if (!userId) {
    return getDefaultBanner();
  }

  const preference = await getUserPreferenceProfile(userId);

  if (preference.topCategory) {
    return {
      title: `${preference.topCategory.name} Ideas Are Waiting`,
      subtitle:
        "Based on your recent votes, bookmarks, purchases, and created ideas.",
      ctaText: "Explore Recommended Ideas",
      ctaLink: `/idea?categoryId=${preference.topCategory.id}`,
      personalization: {
        category: preference.topCategory,
        tag: preference.topTag,
      },
    };
  }

  return getDefaultBanner();
};

const getPublicDashboardInsights = async () => {
  const [publicIdeas, featuredIdeas, activeCategories] = await Promise.all([
    prisma.idea.count({
      where: publicIdeaWhere,
    }),
    prisma.idea.count({
      where: {
        ...publicIdeaWhere,
        isFeatured: true,
      },
    }),
    prisma.category.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  return {
    role: "GUEST",
    insights: [
      {
        type: "INFO" as const,
        title: "Public idea library",
        message: `${publicIdeas} approved or published ideas are available for discovery.`,
      },
      {
        type: "SUCCESS" as const,
        title: "Featured opportunities",
        message: `${featuredIdeas} ideas are currently highlighted by EcoSpark.`,
      },
      {
        type: "INFO" as const,
        title: "Category coverage",
        message: `${activeCategories} active categories are available for browsing.`,
      },
    ],
  };
};

const getAdminDashboardInsights = async () => {
  const [
    totalUsers,
    totalIdeas,
    paidPurchases,
    pendingIdeaReports,
    pendingCommentReports,
    categoryGroups,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        isDeleted: false,
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.PAID,
      },
    }),
    prisma.ideaReport.count({
      where: {
        status: ModerationStatus.PENDING,
      },
    }),
    prisma.commentReport.count({
      where: {
        status: ModerationStatus.PENDING,
      },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const topCategoryGroup = categoryGroups.sort(
    (a, b) => b._count._all - a._count._all,
  )[0];
  const topCategory = topCategoryGroup
    ? await prisma.category.findUnique({
        where: {
          id: topCategoryGroup.categoryId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })
    : null;

  const insights: IAiInsight[] = [
    {
      type: "INFO",
      title: "Platform activity",
      message: `${totalUsers} active users and ${totalIdeas} ideas are currently tracked by EcoSpark.`,
    },
    {
      type: "SUCCESS",
      title: "Commerce signal",
      message: `${paidPurchases} paid idea purchases are confirmed.`,
    },
    {
      type: pendingIdeaReports + pendingCommentReports > 0 ? "WARNING" : "INFO",
      title: "Moderation queue",
      message: `${pendingIdeaReports + pendingCommentReports} reports are waiting for review.`,
    },
  ];

  if (topCategory) {
    insights.push({
      type: "INFO",
      title: "Top content category",
      message: `${topCategory.name} has the most idea activity on the platform.`,
    });
  }

  return {
    role: Role.ADMIN,
    insights,
  };
};

const getUserDashboardInsights = async (userId: string, role: Role) => {
  const [
    ideaStatusGroups,
    bookmarkCount,
    purchaseCount,
    unreadNotifications,
    categoryGroups,
  ] = await Promise.all([
    prisma.idea.groupBy({
      by: ["status"],
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.ideaBookmark.count({
      where: {
        userId,
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const statusCounts = ideaStatusGroups.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    },
    {},
  );
  const topCategoryGroup = categoryGroups.sort(
    (a, b) => b._count._all - a._count._all,
  )[0];
  const topCategory = topCategoryGroup
    ? await prisma.category.findUnique({
        where: {
          id: topCategoryGroup.categoryId,
        },
        select: {
          name: true,
        },
      })
    : null;

  const insights: IAiInsight[] = [
    {
      type: "INFO",
      title: "Idea progress",
      message: `You have ${statusCounts[IdeaStatus.DRAFT] ?? 0} draft ideas and ${
        statusCounts[IdeaStatus.APPROVED] ?? 0
      } approved ideas.`,
    },
    {
      type: "SUCCESS",
      title: "Discovery profile",
      message: `Your activity includes ${bookmarkCount} bookmarks and ${purchaseCount} paid idea purchases.`,
    },
  ];

  if (topCategory) {
    insights.push({
      type: "INFO",
      title: "Top interest",
      message: `${topCategory.name} is your strongest idea category so far.`,
    });
  }

  if (unreadNotifications > 0) {
    insights.push({
      type: "WARNING",
      title: "Unread notifications",
      message: `${unreadNotifications} notifications may need your attention.`,
    });
  }

  return {
    role,
    insights,
  };
};

const getDashboardInsights = async (userId?: string, role?: Role) => {
  if (!userId || !role) {
    return getPublicDashboardInsights();
  }

  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return getAdminDashboardInsights();
  }

  return getUserDashboardInsights(userId, role);
};

const getNextActions = async (userId?: string, role?: Role) => {
  if (!userId || !role) {
    return {
      actions: [
        {
          title: "Explore AI Discover",
          reason: "Browse trending ideas and public AI search suggestions.",
          link: "/ai-discover",
          priority: "LOW" as const,
        },
        {
          title: "Sign in for personalization",
          reason:
            "Personalized recommendations need your votes, bookmarks, purchases, or created ideas.",
          link: "/login",
          priority: "MEDIUM" as const,
        },
      ],
    };
  }

  const [draftIdeas, pendingPurchases, unreadNotifications, bookmarkCount] =
    await Promise.all([
      prisma.idea.count({
        where: {
          authorId: userId,
          status: IdeaStatus.DRAFT,
          deletedAt: null,
        },
      }),
      prisma.ideaPurchase.count({
        where: {
          userId,
          status: PaymentStatus.PENDING,
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.ideaBookmark.count({
        where: {
          userId,
        },
      }),
    ]);

  const actions: IAiAction[] = [];

  if (draftIdeas > 0) {
    actions.push({
      title: "Submit your draft idea",
      reason: `You have ${draftIdeas} draft idea${draftIdeas > 1 ? "s" : ""} that can be sent for review.`,
      link: "/dashboard/my-ideas",
      priority: "HIGH",
    });
  }

  if (role === Role.SCIENTIST) {
    const scientistProfile = await prisma.scientist.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        verifiedAt: true,
      },
    });

    if (!scientistProfile?.verifiedAt) {
      actions.push({
        title: "Complete scientist verification",
        reason:
          "Verified scientist profiles can build more trust around submitted ideas.",
        link: "/dashboard/profile",
        priority: "MEDIUM",
      });
    }
  }

  if (pendingPurchases > 0) {
    actions.push({
      title: "Check pending purchases",
      reason: `${pendingPurchases} checkout session${pendingPurchases > 1 ? "s are" : " is"} still pending.`,
      link: "/dashboard/purchases",
      priority: "MEDIUM",
    });
  }

  if (unreadNotifications > 0) {
    actions.push({
      title: "Review notifications",
      reason: `${unreadNotifications} notification${unreadNotifications > 1 ? "s need" : " needs"} your attention.`,
      link: "/dashboard/notifications",
      priority: "LOW",
    });
  }

  if (bookmarkCount === 0) {
    actions.push({
      title: "Bookmark useful ideas",
      reason:
        "Bookmarks help EcoSpark personalize your AI recommendations over time.",
      link: "/ai-discover",
      priority: "LOW",
    });
  }

  if (!actions.length) {
    actions.push({
      title: "Explore trending ideas",
      reason: "Your account is up to date. Discover what is active now.",
      link: "/ai-discover",
      priority: "LOW",
    });
  }

  return {
    actions,
  };
};

const getDateWindow = () => {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);

  return {
    now,
    currentStart,
    previousStart,
  };
};

const hasSpike = (current: number, previous: number, minimum: number) => {
  if (current < minimum) {
    return false;
  }

  if (previous === 0) {
    return current >= minimum;
  }

  return current >= previous * 1.5;
};

const getAnomalyAlerts = async () => {
  const { now, currentStart, previousStart } = getDateWindow();

  const [
    currentIdeaReports,
    previousIdeaReports,
    currentCommentReports,
    previousCommentReports,
    currentFailedPurchases,
    previousFailedPurchases,
    currentIdeas,
    previousIdeas,
    currentRejectedIdeas,
    previousRejectedIdeas,
    currentUsers,
    previousUsers,
  ] = await Promise.all([
    prisma.ideaReport.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.ideaReport.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.commentReport.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.commentReport.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.FAILED,
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.FAILED,
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.idea.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.idea.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.idea.count({
      where: {
        status: IdeaStatus.REJECTED,
        reviewedAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.idea.count({
      where: {
        status: IdeaStatus.REJECTED,
        reviewedAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
  ]);

  const alerts: IAiAlert[] = [];
  const currentReports = currentIdeaReports + currentCommentReports;
  const previousReports = previousIdeaReports + previousCommentReports;

  if (hasSpike(currentReports, previousReports, 5)) {
    alerts.push({
      type: "WARNING",
      title: "High report activity",
      message: `Reports increased from ${previousReports} to ${currentReports} in the last 7 days.`,
      priority: "HIGH",
    });
  }

  if (hasSpike(currentFailedPurchases, previousFailedPurchases, 3)) {
    alerts.push({
      type: "WARNING",
      title: "Payment failure spike",
      message: `Failed purchases increased from ${previousFailedPurchases} to ${currentFailedPurchases}.`,
      priority: "HIGH",
    });
  }

  if (previousIdeas >= 5 && currentIdeas <= previousIdeas * 0.5) {
    alerts.push({
      type: "WARNING",
      title: "Idea submissions dropped",
      message: `New ideas dropped from ${previousIdeas} to ${currentIdeas} compared with the previous week.`,
      priority: "MEDIUM",
    });
  }

  if (hasSpike(currentRejectedIdeas, previousRejectedIdeas, 4)) {
    alerts.push({
      type: "INFO",
      title: "Rejected ideas increased",
      message: `Rejected ideas increased from ${previousRejectedIdeas} to ${currentRejectedIdeas}.`,
      priority: "MEDIUM",
    });
  }

  if (hasSpike(currentUsers, previousUsers, 10)) {
    alerts.push({
      type: "INFO",
      title: "User signup spike",
      message: `New users increased from ${previousUsers} to ${currentUsers}.`,
      priority: "LOW",
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "INFO",
      title: "No unusual platform activity",
      message: "No major anomaly was detected in the last 7 days.",
      priority: "LOW",
    });
  }

  return {
    comparedRange: {
      currentStart,
      currentEnd: now,
      previousStart,
      previousEnd: currentStart,
    },
    metrics: {
      reports: {
        current: currentReports,
        previous: previousReports,
      },
      failedPurchases: {
        current: currentFailedPurchases,
        previous: previousFailedPurchases,
      },
      ideas: {
        current: currentIdeas,
        previous: previousIdeas,
      },
      rejectedIdeas: {
        current: currentRejectedIdeas,
        previous: previousRejectedIdeas,
      },
      users: {
        current: currentUsers,
        previous: previousUsers,
      },
    },
    alerts,
  };
};

const getAiProviderConfig = (): AiProviderConfig => {
  const provider = (envVars.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const apiKey = envVars.AI_API_KEY?.trim();
  const model = envVars.AI_MODEL?.trim() || "gpt-5-mini";

  if (provider !== "openai") {
    throw new AppError(status.NOT_IMPLEMENTED, "Only OpenAI AI provider is supported");
  }

  if (!apiKey || apiKey === "your_new_openai_api_key_here") {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "AI_API_KEY is not configured on the backend",
    );
  }

  return {
    provider: "openai",
    apiKey,
    model,
  };
};

const extractOpenAiText = (body: OpenAiResponseBody) => {
  if (body.output_text) {
    return body.output_text.trim();
  }

  const outputText = body.output
    ?.flatMap((output) => output.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();

  if (!outputText) {
    throw new AppError(status.BAD_GATEWAY, "AI provider returned an empty response");
  }

  return outputText;
};

const generateAiText = async (instructions: string, input: string) => {
  const config = getAiProviderConfig();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      instructions,
      input,
      store: false,
    }),
  });

  const body = (await response
    .json()
    .catch(() => ({}))) as OpenAiResponseBody;

  if (!response.ok) {
    throw new AppError(
      status.BAD_GATEWAY,
      body.error?.message ?? "AI provider request failed",
    );
  }

  return extractOpenAiText(body);
};

const getChatContext = async (userId: string) => {
  const [user, createdIdeas, bookmarks, purchases, unreadNotifications] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
          role: true,
        },
      }),
      prisma.idea.count({
        where: {
          authorId: userId,
          deletedAt: null,
        },
      }),
      prisma.ideaBookmark.count({
        where: {
          userId,
        },
      }),
      prisma.ideaPurchase.count({
        where: {
          userId,
          status: PaymentStatus.PAID,
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

  return {
    user,
    createdIdeas,
    bookmarks,
    purchases,
    unreadNotifications,
  };
};

const chat = async (userId: string | undefined, payload: IChatPayload) => {
  const hasUserContext = Boolean(userId);
  const context = userId
    ? await getChatContext(userId)
    : {
        user: null,
        createdIdeas: 0,
        bookmarks: 0,
        purchases: 0,
        unreadNotifications: 0,
      };
  const instructions = [
    "You are EcoSpark AI Assistant.",
    "EcoSpark is an eco-innovation platform for sustainability ideas, campaigns, comments, experience reports, and paid idea access.",
    "Help users navigate the product, improve idea submissions, understand campaigns, and explain paid idea access.",
    "Keep answers concise, practical, and friendly. Do not claim to perform actions that the API has not performed.",
    "If the user asks for medical, legal, or financial advice, give general information and suggest a qualified professional.",
  ].join(" ");

  const input = [
    `User context: ${JSON.stringify(context)}`,
    `User message: ${payload.message}`,
  ].join("\n\n");

  try {
    const reply = await generateAiText(instructions, input);

    return {
      reply,
      suggestedActions: getChatSuggestedActions(hasUserContext, payload.message),
    };
  } catch {
    return {
      reply: getFallbackChatReply(payload.message, hasUserContext),
      suggestedActions: getChatSuggestedActions(hasUserContext, payload.message),
    };
  }
};

const parseJsonFromAiText = (value: string) => {
  const trimmed = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new AppError(status.BAD_GATEWAY, "AI provider returned invalid JSON");
  }
};

const getIdeaFormSuggestions = async (
  userId: string,
  payload: IIdeaFormSuggestionPayload,
) => {
  const preference = await getUserPreferenceProfile(userId);
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  const tags = await prisma.tag.findMany({
    orderBy: {
      name: "asc",
    },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const instructions = [
    "You generate JSON suggestions for EcoSpark sustainability idea forms.",
    "Return only valid JSON. No markdown.",
    "Use concise, practical language.",
    "Prefer existing category and tag names when possible.",
    "JSON shape: {\"excerpt\":\"\",\"description\":\"\",\"proposedSolution\":\"\",\"implementationSteps\":\"\",\"expectedBenefits\":\"\",\"risksAndChallenges\":\"\",\"requiredResources\":\"\",\"suggestedCategoryName\":\"\",\"suggestedTags\":[\"\"]}.",
  ].join(" ");

  const input = JSON.stringify({
    draft: payload,
    userPreference: {
      category: preference.topCategory,
      tag: preference.topTag,
    },
    availableCategories: categories,
    availableTags: tags,
  });

  let parsed: Record<string, unknown>;

  try {
    const text = await generateAiText(instructions, input);
    parsed = parseJsonFromAiText(text);
  } catch {
    return {
      suggestions: buildFallbackIdeaSuggestions(payload, categories, tags, preference),
    };
  }

  return {
    suggestions: {
      excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : undefined,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      proposedSolution:
        typeof parsed.proposedSolution === "string"
          ? parsed.proposedSolution
          : undefined,
      implementationSteps:
        typeof parsed.implementationSteps === "string"
          ? parsed.implementationSteps
          : undefined,
      expectedBenefits:
        typeof parsed.expectedBenefits === "string"
          ? parsed.expectedBenefits
          : undefined,
      risksAndChallenges:
        typeof parsed.risksAndChallenges === "string"
          ? parsed.risksAndChallenges
          : undefined,
      requiredResources:
        typeof parsed.requiredResources === "string"
          ? parsed.requiredResources
          : undefined,
      suggestedCategoryName:
        typeof parsed.suggestedCategoryName === "string"
          ? parsed.suggestedCategoryName
          : undefined,
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.filter(
            (tag): tag is string => typeof tag === "string",
          )
        : [],
    },
  };
};

export const AiService = {
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
