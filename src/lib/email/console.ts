import type { EmailAdapter } from "./types";

export class ConsoleEmailAdapter implements EmailAdapter {
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    link: string
  ): Promise<void> {
    console.log(
      `[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body} | Link: ${link}`
    );
  }
}
