import {
  buildSurveyCampaignEmailText,
  renderSurveyCampaignEmailHtml,
  type SurveyCampaignLinks,
} from '@misneach/public-flows';

export async function sendSurveyCampaignLinksEmail(input: {
  email: string;
  businessName: string;
  links: SurveyCampaignLinks;
  logger?: Pick<Console, 'log' | 'error'>;
}) {
  const deliveryMode = process.env.EMAIL_DELIVERY || 'log';
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const logger = input.logger || console;

  if (deliveryMode === 'log' || !resendKey) {
    logger.log('---- SURVEY LINKS EMAIL ----');
    logger.log(`To: ${input.email}`);
    logger.log(`Business: ${input.businessName}`);
    logger.log(`Staff: ${input.links.staffSurveyUrl}`);
    logger.log(`Customer: ${input.links.customersSurveyUrl}`);
    logger.log(`Manage: ${input.links.manageUrl}`);
    logger.log('----------------------------');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.email,
      subject: `Your Misneach appetite survey links for ${input.businessName}`,
      html: renderSurveyCampaignEmailHtml(input.businessName, input.links),
      text: buildSurveyCampaignEmailText(input.businessName, input.links),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    logger.error(`Failed to send survey links email (${response.status}): ${text}`);
    throw new Error('Failed to send survey links email');
  }
}
