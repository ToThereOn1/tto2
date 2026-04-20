
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Privacy Policy | ToThereOn',
    description: 'Privacy Policy for ToThereOn AI Pet Memorial Service.',
}

export default function PrivacyPage() {
    return (
        <>
            <h1>Privacy Policy</h1>
            <p className="lead">Last Updated: March 3, 2026</p>

            <p>
                This Privacy Policy explains how ToThereOn (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, and shares your personal information when you use our Service. By using the Service, you agree to the practices described in this Policy.
            </p>

            {/* ─── 1. DATA WE COLLECT ─── */}
            <h3>1. Information We Collect</h3>

            <h4>1.1 Information You Provide Directly</h4>
            <ul>
                <li><strong>Account information:</strong> Email address and name, collected via third-party authentication providers (Google, Facebook).</li>
                <li><strong>Pet profile data:</strong> Your pet&apos;s name, species, breed, age, personality traits, habits, and memories you describe.</li>
                <li><strong>Photographs:</strong> Images of your pet that you upload for the purpose of building their persona.</li>
                <li><strong>Letters and written content:</strong> Letters you write to your pet and any written descriptions of memories.</li>
                <li><strong>Payment information:</strong> Managed entirely by Paddle. We do not collect or store payment card details.</li>
            </ul>

            <h4>1.2 Information Collected Automatically</h4>
            <ul>
                <li><strong>Usage data:</strong> Pages visited, features used, session duration, and interaction logs within the Service.</li>
                <li><strong>Device information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
                <li><strong>Cookies and similar technologies:</strong> Used for authentication, session management, and service functionality. See Section 8 for details.</li>
            </ul>

            {/* ─── 2. HOW WE USE YOUR DATA ─── */}
            <h3>2. How We Use Your Information</h3>
            <p>We use your information for the following purposes:</p>
            <ul>
                <li><strong>Service delivery:</strong> To generate and maintain your pet&apos;s AI persona, status feeds, and letter responses.</li>
                <li><strong>AI processing:</strong> Your pet descriptions, letters, and photographs are transmitted to third-party AI providers (see Section 4) solely to generate Service content for you.</li>
                <li><strong>Account management:</strong> To authenticate your identity, manage subscriptions, and communicate with you about your account.</li>
                <li><strong>Service improvement:</strong> Aggregated, anonymized usage data may be used to improve Service performance and features. Individual letters and photos are never used for this purpose.</li>
                <li><strong>Legal compliance:</strong> To comply with applicable laws, regulations, or valid legal requests.</li>
            </ul>
            <p>
                <strong>We do not use your personal data, photographs, or letters to train public AI models, sell to advertisers, or share with third parties for marketing purposes.</strong>
            </p>

            {/* ─── 3. LAWFUL BASIS (GDPR) ─── */}
            <h3>3. Lawful Basis for Processing (EU/EEA Users)</h3>
            <p>If you are located in the European Union or European Economic Area, we process your personal data under the following lawful bases:</p>
            <ul>
                <li><strong>Contract performance:</strong> Processing necessary to deliver the Service you have subscribed to.</li>
                <li><strong>Consent:</strong> For processing photographs and sensitive personal information (such as memorial content related to bereavement). You may withdraw consent at any time by deleting your account.</li>
                <li><strong>Legitimate interests:</strong> For fraud prevention, security, and improving Service reliability, where these interests are not overridden by your privacy rights.</li>
                <li><strong>Legal obligation:</strong> Where required by applicable law.</li>
            </ul>

            {/* ─── 4. THIRD-PARTY PROCESSORS ─── */}
            <h3>4. Third-Party Service Providers</h3>
            <p>
                To operate the Service, we share necessary data with trusted third-party processors under contractual data protection agreements. These providers are:
            </p>
            <ul>
                <li><strong>Anthropic, PBC (Claude):</strong> Receives text prompts (your letters and pet descriptions) to generate AI responses. Anthropic&apos;s API terms prohibit using API inputs to train their general models.</li>
                <li><strong>Supabase, Inc.:</strong> Provides our secure database, storage, and authentication infrastructure. Data is stored in encrypted form.</li>
                <li><strong>Paddle:</strong> Processes all subscription payments as our Merchant of Record. Subject to Paddle&apos;s own privacy policy and PCI-DSS compliance.</li>
            </ul>
            <p>
                We do not share your data with any providers beyond those listed above for purposes related to your use of the Service. If we add new providers, this Policy will be updated accordingly.
            </p>

            {/* ─── 5. INTERNATIONAL TRANSFERS ─── */}
            <h3>5. International Data Transfers</h3>
            <p>
                Our service providers are primarily located in the United States. If you are located outside the United States, your data will be transferred to and processed in the US. For EU/EEA users, such transfers are conducted under Standard Contractual Clauses (SCCs) as approved by the European Commission, or equivalent data transfer mechanisms.
            </p>

            {/* ─── 6. DATA RETENTION ─── */}
            <h3>6. Data Retention</h3>
            <ul>
                <li><strong>Active accounts:</strong> Data is retained for the duration of your account.</li>
                <li><strong>Cancelled subscriptions:</strong> Data is retained for 12 months after cancellation to allow for reactivation, then deleted.</li>
                <li><strong>Deleted accounts:</strong> Upon account deletion request, all personal data is permanently deleted within 30 days, except where retention is required by law.</li>
                <li><strong>Anonymized usage data:</strong> May be retained indefinitely for aggregate analytics purposes.</li>
            </ul>

            {/* ─── 7. YOUR RIGHTS ─── */}
            <h3>7. Your Privacy Rights</h3>

            <h4>7.1 Rights for All Users</h4>
            <ul>
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request permanent deletion of your account and all associated data.</li>
                <li><strong>Data portability:</strong> Request an export of your generated content (letters, feed entries) in a portable format.</li>
            </ul>

            <h4>7.2 Additional Rights for EU/EEA Users (GDPR)</h4>
            <ul>
                <li><strong>Right to restrict processing:</strong> Request that we limit how we process your data in certain circumstances.</li>
                <li><strong>Right to object:</strong> Object to processing based on legitimate interests.</li>
                <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw at any time without affecting the lawfulness of prior processing.</li>
                <li>You have the right to lodge a complaint with your local data protection supervisory authority.</li>
            </ul>

            <h4>7.3 Additional Rights for California Residents (CCPA/CPRA)</h4>
            <ul>
                <li><strong>Right to know:</strong> Request details about the categories and specific pieces of personal information we collect and how they are used.</li>
                <li><strong>Right to delete:</strong> Request deletion of personal information we have collected.</li>
                <li><strong>Right to opt-out of sale or sharing:</strong> We do not sell or share your personal information for cross-context behavioral advertising. No opt-out is necessary, but you may contact us to confirm.</li>
                <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</li>
            </ul>
            <p>To exercise any of these rights, contact us at: <strong>privacy@tothereon.com</strong></p>

            {/* ─── 8. COOKIES ─── */}
            <h3>8. Cookies and Tracking Technologies</h3>
            <p>We use the following types of cookies:</p>
            <ul>
                <li><strong>Strictly necessary cookies:</strong> Required for authentication and session management. Cannot be disabled without breaking the Service.</li>
                <li><strong>Functional cookies:</strong> Remember your preferences (language, display settings).</li>
                <li><strong>Analytics cookies:</strong> Collect aggregated data on how the Service is used. No personally identifiable information is shared with analytics providers.</li>
            </ul>
            <p>
                You can manage cookie preferences through your browser settings. Disabling strictly necessary cookies will prevent you from accessing authenticated features of the Service.
            </p>

            {/* ─── 9. CHILDREN'S PRIVACY ─── */}
            <h3>9. Children&apos;s Privacy</h3>
            <p>
                The Service is intended for users aged <strong>18 and older</strong>. We do not knowingly collect personal information from anyone under the age of 18. If we become aware that a user under 18 has provided personal information, we will delete it promptly. If you believe a minor has provided data to us, please contact us at privacy@tothereon.com.
            </p>

            {/* ─── 10. SECURITY ─── */}
            <h3>10. Data Security</h3>
            <p>
                We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and access controls to protect your personal data. However, no method of data transmission or storage is completely secure. We cannot guarantee absolute security.
            </p>
            <p>
                In the event of a data breach that affects your rights and freedoms, we will notify affected users and relevant authorities as required by applicable law, within 72 hours of becoming aware of the breach.
            </p>

            {/* ─── 11. CHANGES ─── */}
            <h3>11. Changes to This Policy</h3>
            <p>
                We may update this Privacy Policy periodically. If we make material changes, we will notify you via email and/or a prominent notice within the Service at least 14 days before the changes take effect. The &quot;Last Updated&quot; date at the top of this page will always reflect the most recent version.
            </p>

            {/* ─── 12. GOVERNING LAW ─── */}
            <h3>12. Governing Law</h3>
            <p>
                This Privacy Policy and any disputes arising from it are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any legal action or proceeding relating to this Policy not subject to arbitration (as described in our Terms of Service) shall be brought exclusively in the state or federal courts located in Delaware.
            </p>

            {/* ─── 13. CONTACT ─── */}
            <h3>13. Contact Us</h3>
            <p>
                For any questions, requests, or concerns regarding this Privacy Policy or our data practices, please contact:
            </p>
            <p>
                <strong>Privacy Inquiries:</strong> privacy@tothereon.com<br />
                <strong>General Support:</strong> support@tothereon.com
            </p>
        </>
    )
}
