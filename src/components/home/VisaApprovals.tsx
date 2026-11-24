import ApprovalGallery from "@/components/ui/ApprovalGallery";
import SectionHeading from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";

const defaultApprovals = [
  { image: "/images/approval-canada.png", alt: "Canada permanent residency visa approval" },
  { image: "/images/approval-australia.png", alt: "Australia visa approval" },
  { image: "/images/approval-canada.png", alt: "Canada permanent residency visa approval" },
  { image: "/images/approval-australia.png", alt: "Australia visa approval" },
  { image: "/images/approval-canada.png", alt: "Canada permanent residency visa approval" },
];

export default function VisaApprovals({ approvals = defaultApprovals }: { approvals?: import("@/lib/cms/types").Approval[] }) {
  if (!approvals.length) return null;
  return (
    <section className="bg-navy-50">
      <div className="container-page flex flex-col items-center gap-10 py-[3.75rem]">
        <SectionHeading title="Our Visa Approvals" />
        <div className="flex w-full flex-col items-center gap-7">
          <ApprovalGallery
            items={approvals.map((a) => ({ image: a.image, alt: a.alt, contain: !!a.id }))}
            sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
            className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-[3.1875rem]"
          />
          <ButtonLink href="/visa-gallery" variant="secondary">
            Explore  Visa Gallery
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
