import type { Metadata } from "next";
import { BRAND_NAME } from "@/utils/branding";
import { PageHeading, TypographyP } from "@/components/Typography";
import { CardBasic } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${BRAND_NAME}`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="flex flex-col justify-center px-6 py-20 text-gray-900">
      <CardBasic className="mx-auto flex max-w-3xl flex-col justify-center space-y-6 p-10">
        <div className="flex flex-col">
          <PageHeading>Terms of Service</PageHeading>
          <TypographyP className="mt-2 text-sm text-gray-500">
            Last Updated: May 9, 2026
          </TypographyP>

          <div className="mt-8 space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Service Description</h2>
              <p>
                This is a self-hosted instance of Inbox Zero, an email management and 
                automation tool. By using this service, you agree to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Acceptance of Terms</h2>
              <p>
                By accessing or using this service, you acknowledge that you have read, 
                understood, and agree to be bound by these Terms of Service. If you do 
                not agree to these terms, you must not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <p className="mb-2">Access is restricted to authorized users only. You are responsible for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying the administrator of any unauthorized use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
              <p className="mb-2">You agree not to use the service for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Any illegal purpose or activity</li>
                <li>Accessing data you do not have authorization to view</li>
                <li>Interfering with the operation of the service</li>
                <li>Attempting to bypass security measures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data & Privacy</h2>
              <p>
                Your use of the service is also governed by our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                . By using the service, you consent to the collection and use of 
                information as detailed in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Google Services Integration</h2>
              <p>
                This service integrates with Google APIs (Gmail, Calendar, Drive). Your 
                use of Google services through this application is subject to:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <a
                    href="https://policies.google.com/terms"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="https://developers.google.com/terms"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google API Terms of Service
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Disclaimer</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE 
                UNINTERRUPTED OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of 
                the service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

             <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
              <p>For questions about these terms, please open an issue on the GitHub repository.</p>
            </section>
          </div>
        </div>
      </CardBasic>
    </div>
  );
}
