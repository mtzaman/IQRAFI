import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>IQRAFI is designed to collect only what is needed to organise shared Qur&apos;an reading.</p>
      <h2>What we store</h2>
      <ul>
        <li>Your email address and, optionally, a name, avatar link and country.</li>
        <li>Your language, timezone, and reading and notification preferences.</li>
        <li>The groups you join, your Juz assignments, reading position and bookmarks.</li>
        <li>Dedications you choose to add — private by default.</li>
      </ul>
      <h2>What we never do</h2>
      <ul>
        <li>Publish anything on your behalf, or make a dedication public without your explicit confirmation.</li>
        <li>Rank, compare or publicly highlight anyone&apos;s reading.</li>
        <li>Sell personal data.</li>
      </ul>
      <h2>Analytics</h2>
      <p>Anonymous product events are recorded only if you opt in, never include your identity, and are used solely to improve IQRAFI.</p>
      <h2>Your rights</h2>
      <p>You can edit your profile, download all of your data, and permanently delete your account at any time from Profile → Privacy &amp; data.</p>
    </>
  );
}
