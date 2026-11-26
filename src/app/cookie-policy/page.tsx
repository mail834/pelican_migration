import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PolicyPage from "@/components/site/PolicyPage";
export const metadata: Metadata = pageMetadata({ title: "Cookie Policy | Pelican Migration Consultants", path: "/cookie-policy" });
export default function Page() { return <PolicyPage slug="cookie-policy" />; }
