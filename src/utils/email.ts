import status from "http-status";
import nodemailer from "nodemailer";
import ejs from "ejs";
import AppError from "../errors/AppError";
import { envVars } from "../config";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER.SMTP_HOST,
  port: Number(envVars.EMAIL_SENDER.SMTP_PORT),
  secure: Number(envVars.EMAIL_SENDER.SMTP_PORT) === 465, // important
  auth: {
    user: envVars.EMAIL_SENDER.SMTP_USER,
    pass: envVars.EMAIL_SENDER.SMTP_PASS,
  },
});

const resolveTemplatePath = (templateName: string) => {
  const templateFile = `${templateName}.ejs`;
  const candidates = [
    path.join(process.cwd(), "src", "shared", "templates", templateFile),
    path.join(process.cwd(), "src", "templates", templateFile),
    path.join(process.cwd(), "shared", "templates", templateFile),
    path.join(process.cwd(), "templates", templateFile),
    path.join(process.cwd(), "dist", "shared", "templates", templateFile),
    path.join(process.cwd(), "dist", "templates", templateFile),
    path.join(process.cwd(), ".dist", "shared", "templates", templateFile),
    path.join(process.cwd(), ".dist", "templates", templateFile),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Email template not found. Checked: ${candidates.join(", ")}`,
  );
};

export const sendEmail = async ({
  subject,
  templateData,
  templateName,
  to,
  attachments,
}: {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}) => {
  try {
    const templatePath = resolveTemplatePath(templateName);
    const html = await ejs.renderFile(templatePath, templateData);

    const info = await transporter.sendMail({
      from: envVars.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`Email sent to ${to} : ${info.messageId}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Email Sending Error:", error.message);
    } else {
      console.error("Email Sending Error:", error);
    }

    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to send email");
  }
};
