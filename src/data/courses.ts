import type { Course } from "../types/course";

const sampleVideo =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const baseLessons = [
  { title: "Welcome + setup", duration: "07:12", type: "video", videoUrl: sampleVideo },
  { title: "Core concepts", duration: "18:40", type: "video", videoUrl: sampleVideo },
  { title: "Hands-on lab", duration: "22:05", type: "lab" },
  { title: "Best practices", duration: "15:30", type: "video", videoUrl: sampleVideo },
  { title: "Quiz: checkpoints", duration: "08:50", type: "quiz" },
];

const baseCodeSamples = [
  {
    title: "Terraform VPC example",
    language: "hcl",
    content:
      'resource "aws_vpc" "main" {\n  cidr_block = "10.0.0.0/16"\n  enable_dns_support = true\n  enable_dns_hostnames = true\n}\n',
  },
  {
    title: "Python S3 upload",
    language: "python",
    content:
      'import boto3\n\ns3 = boto3.client("s3")\ns3.upload_file("report.csv", "my-bucket", "reports/report.csv")\n',
  },
];

export const coursesSeed: Course[] = [
  {
    id: "cloud-aws-arch",
    title: "AWS Certified Solutions Architect",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    category: "Cloud",
    duration: "3 Month",
    price: "$80",
    oldPrice: "$100",
    instructor: "Lina",
    summary:
      "Build scalable, secure cloud architectures with hands-on labs and real-world case studies.",
    topics: [
      "Cloud fundamentals",
      "Networking & VPCs",
      "Security & IAM",
      "High availability",
      "Cost optimization",
    ],
    level: "Intermediate",
    rating: 4.8,
    students: "12k",
    language: "English",
    lessons: baseLessons,
    codeSamples: baseCodeSamples,
  },
  {
    id: "design-uiux",
    title: "UI/UX Design Essentials",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
    category: "Design",
    duration: "2 Month",
    price: "$60",
    oldPrice: "$90",
    instructor: "Ava",
    summary:
      "Learn user research, wireframing, and UI systems to design products users love.",
    topics: [
      "User research",
      "Wireframes",
      "Design systems",
      "Prototyping",
      "Usability testing",
    ],
    level: "Beginner",
    rating: 4.7,
    students: "9.1k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "Figma auto-layout tips",
        language: "note",
        content:
          "Use auto-layout to create responsive components and maintain spacing consistency.",
      },
    ],
  },
  {
    id: "dev-react-full",
    title: "Fullstack React Developer",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    category: "Development",
    duration: "4 Month",
    price: "$120",
    oldPrice: "$150",
    instructor: "Noah",
    summary:
      "Build production-ready apps with React, APIs, authentication, and deployment.",
    topics: [
      "React fundamentals",
      "State management",
      "API integration",
      "Auth & security",
      "Deployments",
    ],
    level: "Intermediate",
    rating: 4.9,
    students: "15.3k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "React fetch hook",
        language: "tsx",
        content:
          "const { data, loading } = useFetch('/api/courses');\nif (loading) return <Spinner />;\n",
      },
    ],
  },
  {
    id: "biz-marketing",
    title: "Digital Marketing Strategy",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    category: "Business",
    duration: "2 Month",
    price: "$55",
    oldPrice: "$70",
    instructor: "Mia",
    summary:
      "Plan growth campaigns, optimize funnels, and measure performance across channels.",
    topics: [
      "Marketing funnels",
      "SEO basics",
      "Paid ads",
      "Content strategy",
      "Analytics",
    ],
    level: "Beginner",
    rating: 4.6,
    students: "7.8k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "UTM tagging example",
        language: "note",
        content:
          "Use utm_source, utm_medium, utm_campaign to track campaigns consistently.",
      },
    ],
  },
  {
    id: "biz-analytics",
    title: "Data Analytics for Business",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    category: "Business",
    duration: "3 Month",
    price: "$75",
    oldPrice: "$95",
    instructor: "Ethan",
    summary:
      "Turn data into decisions with dashboards, KPIs, and storytelling.",
    topics: [
      "KPIs & metrics",
      "Dashboard design",
      "SQL basics",
      "Data storytelling",
      "Decision making",
    ],
    level: "Intermediate",
    rating: 4.7,
    students: "6.4k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "SQL KPI query",
        language: "sql",
        content:
          "SELECT date_trunc('month', created_at) AS month, COUNT(*)\nFROM orders\nGROUP BY 1;",
      },
    ],
  },
  {
    id: "dev-ios",
    title: "iOS App Development",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    category: "Development",
    duration: "4 Month",
    price: "$110",
    oldPrice: "$140",
    instructor: "Olivia",
    summary:
      "Build native iOS apps with Swift, UIKit, and real device workflows.",
    topics: [
      "Swift basics",
      "UIKit layout",
      "Networking",
      "Persistence",
      "App store",
    ],
    level: "Intermediate",
    rating: 4.8,
    students: "4.9k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "Swift async call",
        language: "swift",
        content:
          "URLSession.shared.dataTask(with: url) { data, _, _ in\n  // handle data\n}.resume()",
      },
    ],
  },
  {
    id: "sec-cyber",
    title: "Cybersecurity Fundamentals",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    category: "Security",
    duration: "3 Month",
    price: "$85",
    oldPrice: "$110",
    instructor: "James",
    summary:
      "Learn security basics, threat models, and safe practices for teams.",
    topics: [
      "Threat modeling",
      "OWASP basics",
      "Network security",
      "Incident response",
      "Hardening",
    ],
    level: "Beginner",
    rating: 4.6,
    students: "5.7k",
    language: "English",
    lessons: baseLessons,
    codeSamples: baseCodeSamples,
  },
  {
    id: "biz-product",
    title: "Product Management Foundations",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
    category: "Business",
    duration: "2 Month",
    price: "$70",
    oldPrice: "$90",
    instructor: "Sophia",
    summary:
      "Define product vision, plan roadmaps, and deliver with cross-functional teams.",
    topics: [
      "Product discovery",
      "Roadmapping",
      "Prioritization",
      "User feedback",
      "Metrics",
    ],
    level: "Beginner",
    rating: 4.5,
    students: "8.1k",
    language: "English",
    lessons: baseLessons,
    codeSamples: [
      {
        title: "PRD outline",
        language: "note",
        content:
          "Problem, goals, success metrics, scope, user stories, and risks.",
      },
    ],
  },
];
