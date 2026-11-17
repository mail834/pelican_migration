import type { PageData } from "../types";
import { faqBlock, processSteps, reviewsBlock, videoBlock } from "../common";

export const canadaMigration: PageData = {
  slug: "canada-migration",
  metaTitle: "Migrate to Canada | Canada Immigration Consultants in Dubai",
  metaDescription:
    "Middle East's best Canada immigration consultants. CICC licensed guidance on Canada visa pathways, eligibility, benefits and the application process.",
  hero: {
    image: "/images/pages/hero-canada-migration.png",
    breadcrumb: [{ label: "Canada", href: "/canada-migration" }, { label: "Canada Migration" }],
    title: "Migrate to\nCanada",
    tops: { breadcrumb: 210, title: 416, text: 564, badge: 648 },
    badge: true,
    text: "Work with confidence. As a **CICC Licensed** immigration consultancy (RCIC #R507572), we provide expert guidance, strategic pathway recommendations, and professional application support to help strengthen your Canadian PR journey",
    form: { title: "Let Us Help You Migrate to Canada.", destination: "Canada" },
  },
  blocks: [
    {
      type: "intro",
      title: "Middle East's Best Canada Immigration Consultants",
      paragraphs: [
        "A Canada PR Visa is one of the most popular options for individuals looking to build a better future in Canada. It offers several benefits, including the freedom to live, work, and study anywhere in the country, access to publicly funded healthcare (subject to eligibility), opportunities for family sponsorship, and a pathway to Canadian citizenship.\nWith its excellent career opportunities, quality education, multicultural communities, and high standard of living, Canada continues to attract skilled professionals and families from around the world.",
        "Are you wondering how to obtain a Canada Permanent Resident Visa from the UAE? Explore the different Canada PR pathways, eligibility requirements, and application categories to discover how you can make Canada your new home.",
      ],
    },
    {
      type: "cards",
      title: "Canada Visa Pathways",
      cards: [
        {
          title: "Work in Canada",
          text: "The PR card is a crucial document that proves your residency status and enables you to work anywhere in Canada, making it an essential requirement for those looking to migrate to Canada. As leading Canada immigration consultants, we can assist you in obtaining your PR card and provide expert guidance throughout the immigration process",
          link: { label: "Know More", href: "/canada-pr" },
        },
        {
          title: "Study in Canada",
          text: "Study at world-renowned universities in one of the world's top study destinations by migrating to Canada. Our team of experienced Canada immigration consultants can help make your dream of studying in Canada a reality.",
          link: { label: "Know More", href: "/canada-study-visa" },
        },
        {
          title: "Start Business in Canada",
          text: "Canada PR visas are not only your gateway to migrate to Canada but also offer opportunities to set up your business. Let our Canada immigration consultants help you navigate the immigration process and explore the various avenues available for entrepreneurs in Canada.",
          link: { label: "Know More", href: "/canada-pr" },
        },
        {
          title: "Settle with Family",
          text: "With our guidance, you can sponsor your spouse and children and settle down in this amazing country through Canada immigration programs. Our team of Canada immigration consultants can help you reunite with your family and make Canada your new home.",
          link: { label: "Know More", href: "/canada-pr" },
        },
        {
          title: "Enjoy Standard of Living",
          text: "Migrate to Canada and experience a high standard of living and a robust economy. Our Canada immigration consultants can help make your immigration process hassle-free and ensure that you have a smooth transition to your new life in Canada.",
          link: { label: "Know More", href: "/canada-express-entry" },
        },
        {
          title: "Grab Canadian Citizenship",
          text: "Take control of your future and explore the countless job and travel options available in Canada by migrating to this vibrant country. Our team of experienced Canada immigration consultants can help you shape your future in Canada and achieve your goals.",
          link: { label: "Know More", href: "/canada-pr" },
        },
      ],
    },
    {
      type: "checks",
      title: "Canada Immigration Eligibility & Benefits",
      description:
        "Canada is frequently touted as a “paradise for immigrants.” Every year, Canada continues to wow the globe by expanding its yearly immigrant intake. We make it simple for you to migrate to Canada.",
      columns: [
        {
          title: "Eligibility For Canadian Immigration",
          intro:
            "To immigrate to Canada, you must first meet the basic criteria.\nTake time to understand the requirements for your chosen pathway.\n[[Check Your Eligibility]](/check-eligibility) before proceeding with your application.\nTo begin the immigration process, you must meet the following criteria:",
          items: [
            "Have worked in one of the 347 National Occupation Classification System listed occupations for at least one year full-time or an equal length of part-time in the last 10 years.",
            "Pass the language test and demonstrate intermediate language skills in English or French;",
            "Have enough settlement money",
            "Get through the security background and physical screening.",
          ],
        },
        {
          title: "Benefits Of Canadian Immigration",
          intro:
            "Canada’s friendly attitude, expanding economic growth, and uncomplicated immigration processes have made it practical and ideal for people to come and settle permanently in the country. If you migrate to Canada, you can enjoy the following benefits,",
          items: [
            "An environment that is safe and secure",
            "The ability to live and work in Canada",
            "Healthcare for all",
            "Allows you to bring along your family",
            "Possibility of obtaining Canadian citizenship",
            "In the Canadian public school system, children under the age of 18 receive free education.",
          ],
        },
      ],
      cta: { label: "Check Eligibility", href: "#assessment" },
    },
    processSteps("We specialize in assisting individuals, families, businesses, and investors to obtain a Canada PR Visa"),
    videoBlock(),
    faqBlock,
    reviewsBlock("Canada Immigration Made Easy"),
  ],
};
