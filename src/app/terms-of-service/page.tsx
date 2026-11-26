import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PolicyPage from "@/components/site/PolicyPage";
export const metadata: Metadata = pageMetadata({ title: "Terms of Service | Pelican Migration Consultants", path: "/terms-of-service" });
export default function Page() { return <PolicyPage slug="terms-of-service" />; }
