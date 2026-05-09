import type { Metadata } from "next";
import { BRAND_NAME } from "@/utils/branding";
import { PageHeading, TypographyP } from "@/components/Typography";
import { CardBasic } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${BRAND_NAME}`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col justify-center px-6 py-20 text-gray-900">
      <CardBasic className="mx-auto flex max-w-3xl flex-col justify-center space-y-6 p-10">
        <div className="flex flex-col">
          <PageHeading>Privacy Policy</PageHeading>
          <TypographyP className="mt-2 text-sm text-gray-500">
            Last Updated: May 9, 2026
          </TypographyP>

          <div className="mt-8 space-y-6 text-gray-700">
             <section>
              <h2 className="text-xl font-semibold mb-3">1. Data Controller</h2>
              <p>
                <strong>Controller:</strong> Private Individual<br />
                <strong>Instance:</strong> Self-hosted at inbox-zero.up-to-the.cloud<br />
                <strong>Contact:</strong> For privacy inquiries, contact via GitHub Issues
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Data We Access</h2>
              <p className="mb-2">Through Google OAuth integration, this application accesses:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Email Data:</strong> Subject lines, sender/recipient addresses, email content, attachments, labels</li>
                <li><strong>Calendar Data:</strong> Event titles, times, descriptions, attendee information</li>
                <li><strong>Google Drive:</strong> File metadata and content for email attachments</li>
                <li><strong>Profile:</strong> Name and email address for account identification</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
              <p className="mb-2">We only use your data for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email organization and automated labeling</li>
                <li>AI-powered email analysis and draft generation</li>
                <li>Meeting brief preparation from calendar data</li>
                <li>Follow-up reminder tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Self-Hosted:</strong> All data stored on private VPS (PostgreSQL, Redis)</li>
                <li><strong>Encryption:</strong> HTTPS/TLS for all connections, OAuth tokens encrypted at rest</li>
                <li><strong>No Third-Party Sharing:</strong> Data is not sold or shared with external parties</li>
                <li><strong>Access Control:</strong> Only authorized email addresses can access the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Revoke Access:</strong> Instantly revoke via Google Account Settings</li>
                <li><strong>Data Deletion:</strong> Request complete deletion of all stored data</li>
                <li><strong>Export:</strong> Export your data from the PostgreSQL database</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Google API Compliance</h2>
              <p>
                This application adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>{" "}
                including Limited Use requirements. We do not transfer Google user data 
                to third parties, use it for advertising, or allow human reading except with consent.
              </p>
            </section>

             <section>
              <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
              <p>For privacy inquiries, please open an issue on the GitHub repository.</p>
              <p className="mt-2 text-sm text-gray-500">
                This self-hosted instance operates independently from Inbox Zero Inc.
                For the official service, visit{" "}
                <a
                  href="https://www.getinboxzero.com"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  getinboxzero.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </CardBasic>
    </div>
  );
}
