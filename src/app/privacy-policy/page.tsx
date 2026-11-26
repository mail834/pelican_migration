import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PolicyPage from "@/components/site/PolicyPage";
export const metadata: Metadata = pageMetadata({ title: "Privacy Policy | Pelican Migration Consultants", path: "/privacy-policy" });
export default function Page() { return <PolicyPage slug="privacy-policy" />; }
