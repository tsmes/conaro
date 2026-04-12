export interface EmailAdapter {
  sendEmail(
    to: string,
    subject: string,
    body: string,
    link: string
  ): Promise<void>;
}
