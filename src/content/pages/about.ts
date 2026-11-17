import type { PageData } from "../types";

export const aboutUs: PageData = {
  slug: "about-us",
  metaTitle: "About Us | Pelican Migration Consultants",
  metaDescription:
    "Pelican Migration Consultants are CICC licensed immigration consultants in Dubai helping clients migrate to Canada, Australia, New Zealand and Portugal.",
  hero: {
    image: "/images/pages/hero-about.png",
    breadcrumb: [{ label: "About Us" }],
    title: "Most Trusted Immigration Consultants in Dubai",
    titleWeight: "semibold",
    tops: { breadcrumb: 210, title: 372, badge: 648 },
    badge: true,
  },
  blocks: [
    {
      type: "intro",
      bg: "white",
      title: "About Us",
      paragraphs: [
        "Since 2017, Pelican Migration Consultants has been helping individuals, families, and skilled professionals explore international migration opportunities through trusted immigration guidance and personalised solutions. With an established presence in the UAE and a valid UAE trade licence, we have built our reputation on professionalism, transparency, and a client-focused approach.",
        "As a CICC-licensed immigration consultancy (RCIC #R507572), we take pride in understanding each client's unique circumstances, career aspirations, and long-term goals. We believe every migration journey is different, so we provide tailored immigration advice and application support to help clients identify suitable pathways and make informed decisions.",
        "Our commitment goes beyond visa applications. We work closely with our clients throughout their immigration journey, offering different levels of assistance based on their individual needs, from initial eligibility assessments and pathway selection to documentation, application preparation, and submission support.",
        "Since our establishment, we have remained committed to simplifying immigration complexities and reducing the confusion and uncertainty often associated with visa applications. In an industry where misinformation and unrealistic promises can create unnecessary challenges, we believe in providing honest guidance, clear communication, and responsible immigration services.",
        "**Our Immigration Destinations**\nPelican Migration Consultants provides immigration advisory and application support for individuals and families exploring opportunities in:",
        "**Canada:** Skilled migration, Express Entry, Provincial Nominee Programs (PNP), and other permanent residency pathways.\n**Australia:** Skilled migration, state nomination, employer-sponsored pathways, and other eligible visa options.\n**New Zealand:** Skilled residence pathways, work visas, and other suitable immigration options.\n**Portugal:** Residency and immigration pathways, including eligible investment and business-related options.",
        "Whether you are a skilled professional seeking better career opportunities, a family planning a new beginning, or an individual exploring international residency options, our team is here to help you navigate the process with confidence.",
        "At Pelican Migration Consultants, we believe migration is more than a process—it's a life decision. Since 2017, our commitment has been to deliver clear guidance, compliant solutions, and confident outcomes.",
      ],
      image: { src: "/images/pages/about-intro.png", alt: "Pelican Migration Consultants team in the Dubai office" },
    },
    {
      type: "steps",
      bg: "white",
      large: true,
      steps: [
        {
          title: "Our Mission",
          text: [
            "We center our business around clients. Our mission is to solve immigration complexities through innovative and personalized solutions tailored to every client, always recognizing that every client’s circumstances are different.",
            "We are known for our speed, trust, and expertise. Here are the steps we follow to do our best for your successful migration.",
          ],
        },
        {
          title: "Our Specialities",
          text: [
            "Detailed assessment and document review",
            "Coming up with an action plan for the visa application process",
            "Procuring the required documents and information",
            "Preparing the visa application and submission in a timely manner",
            "Awaiting response from the immigration office and keeping the client updated",
            "Informing the client about any further evidence or information requested by the immigration office",
          ],
        },
      ],
    },
    {
      type: "imageCards",
      title: "Why Choose Pelican Migration Consultants",
      description: "Leveraging our wealth of knowledge and years of experience, we ensure our clients secure their visa residency approvals.",
      cards: [
        {
          title: "Professional Immigration Consultants in ",
          text: "Our CICC consultants are highly trained and dedicated to helping you get a positive response to your visa application. We work with the aim to provide you with precise immigration advice and excellent services to assist you in achieving your migration goals. All our migration consultants possess extensive knowledge in the field, which enables them to provide country-specific immigration advice.",
          image: "/images/pages/about-why-1.png",
        },
        {
          title: "Cost-Effective Immigration Services",
          text: "Our migration services are tailored to suit your needs as well as your budget. Our ambition is to offer the best-personalized migration advice and information that will help you steer clear of unnecessary expenses until you are confident that your visa application has the best possible chance of success.",
          image: "/images/pages/about-why-2.png",
        },
        {
          title: "Hassle-Free Immigration Process",
          text: "The current immigration system is quite complex, contradictory, and misleading. We are proud of the fact that we make the immigration process as hassle-free as possible. We have dedicated our past to ensure we can always give our clients the most stress-free experience migrating to the country of their choice.",
          image: "/images/pages/about-why-3.png",
        },
      ],
    },
    { type: "banner" },
  ],
};
