import Image from "next/image";
import Link from "next/link";
import { accountRoles } from "../lib/account-roles";
import { signedInAccountRole } from "../lib/auth-navigation";

const guides = [
  {
    id: "driver",
    title: "For drivers",
    eligibility: "Truck drivers and vehicle owners providing goods transport with valid driving and vehicle documents.",
    steps: [
      ["Create your account", "Choose Driver and sign up with your full name, mobile number, and password. Log in with your mobile number and password."],
      ["Add your vehicle", "Complete My profile with your vehicle number, RC, driving licence, and a selfie taken with your camera. Submit these once before requesting a load."],
      ["Find a load and agree on payment", "Review the route, goods, truck requirements, and expected payment range. Send your requested amount within that range. Confirm the shipment details and terms with the company before accepting its offer."],
      ["Pick up and deliver", "Use the full addresses from your confirmed trip. After the company marks it dispatched, you can share your live location. Update delivery status and give proof of delivery to the company when requested."],
    ],
    responsibilities: "Keep your information and documents accurate and valid. Follow the pickup and delivery schedule, handle goods carefully, communicate delays promptly, and confirm delivery honestly.",
  },
  {
    id: "company",
    title: "For companies and loaders",
    eligibility: "Transport companies, manufacturers, distributors, wholesalers, traders, and anyone arranging goods transportation.",
    steps: [
      ["Set up your business account", "Choose Company and register with your business and contact information. Log in with your email and password and keep your company profile current."],
      ["Post your load", "Add pickup and delivery addresses, loading date, goods details, truck type and body length, and your expected payment range. Include cargo weight and the required delivery date in the instructions."],
      ["Confirm a driver and price", "Review requests, vehicle numbers, and requested amounts. Send an offer to a suitable driver and confirm the final price and terms together."],
      ["Pay the advance and dispatch", "Record the 70% advance paid to the driver before dispatch. Mark the trip dispatched when the truck leaves and follow the map when the driver shares their location."],
      ["Close out the trip", "Confirm receipt of the goods and complete the remaining driver payment. Pay the separate booking fee to Transport Connect and record it in the company workspace."],
    ],
    responsibilities: "Provide accurate load details, coordinate pickup and delivery, and pay the driver and the platform as agreed.",
  },
] as const;

const rules = [
  "Use genuine personal or business information and keep your login credentials private.",
  "Communicate professionally and respect pickup, delivery, and payment commitments.",
  "Agree on the transport price and payment terms before confirming a booking.",
  "Follow the commission policy and applicable Indian laws and regulations.",
  "Avoid misleading information and fraudulent bookings. Report suspicious activity or disputes to platform support.",
];

export default async function Home() {
  const role = await signedInAccountRole();

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="grid overflow-hidden rounded-[1.75rem] bg-[#123b33] text-white md:min-h-[20rem] md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col items-start justify-center px-5 py-7 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold text-[#f9dc8a]">Serving Maharashtra</p>
          <h1 className="mt-4 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">Find a load. Find a driver.</h1>
          <p className="mt-5 max-w-md leading-relaxed text-[#d8e8e1]">
            Transport Connect brings truck drivers, companies, and goods owners together to arrange road transport.
          </p>
          <nav aria-label="Platform guides" className="mt-7 flex flex-wrap gap-3">
            <a href="#driver" className="button-outline">Driver guide</a>
            <a href="#company" className="button-outline">Company guide</a>
          </nav>
        </div>
        <div className="relative min-h-36 md:min-h-full">
          <Image src="/sahyadri-truck.webp" alt="Cargo truck on a highway through the Sahyadri hills" fill preload
            sizes="(max-width: 767px) 100vw, 42vw" className="object-cover object-[58%_center]" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {guides.map((guide) => (
          <section key={guide.id} id={guide.id} aria-labelledby={guide.id + "-title"} className="panel scroll-mt-6 p-5 sm:p-7">
            <h2 id={guide.id + "-title"} className="text-2xl font-extrabold tracking-tight sm:text-3xl">{guide.title}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {role === guide.id ? <Link href={accountRoles[role].dashboard} className="button">Open dashboard</Link> : !role && (
                <>
                  <Link href={guide.id === "driver" ? "/driver/signup" : "/company/signup"} className="button">
                    {guide.id === "driver" ? "Register as a driver" : "Register a company"}
                  </Link>
                  <Link href={guide.id === "driver" ? "/driver/login" : "/company/login"} className="text-link py-2 text-sm">
                    {guide.id === "driver" ? "Driver login" : "Company login"}
                  </Link>
                </>
              )}
              <a href="#commission" className="rounded-full bg-[#edf4ef] px-3 py-2 text-sm font-bold text-[#164e43] hover:underline">
                {guide.id === "driver" ? "Driver platform fee: ₹0" : "Fixed company booking fee"}
              </a>
            </div>
            <div className="mt-5 rounded-2xl bg-[#edf4ef] px-4 py-3">
              <h3 className="text-sm font-bold">Who can register?</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#50645c]">{guide.eligibility}</p>
            </div>
            <h3 className="mt-6 text-lg font-bold">How it works</h3>
            <ol className="mt-3 ml-5 list-decimal space-y-3 marker:font-bold marker:text-[#164e43]">
              {guide.steps.map(([title, detail]) => (
                <li key={title} className="pl-1">
                  <h4 className="font-bold">{title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#50645c]">{detail}</p>
                </li>
              ))}
            </ol>
            <h3 className="mt-6 border-t border-[#dbe4dc] pt-4 text-lg font-bold">Your responsibilities</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#50645c]">{guide.responsibilities}</p>
          </section>
        ))}
      </div>

      <section id="commission" aria-labelledby="commission-title" className="panel grid scroll-mt-6 gap-6 p-5 sm:p-7 lg:grid-cols-2">
        <div>
          <h2 id="commission-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Platform commission</h2>
          <p className="mt-3 leading-relaxed text-[#50645c]">
            Companies and loaders pay one fixed platform fee for each new confirmed booking. The company sees the fee before sending an offer. Drivers pay ₹0 in platform fees and receive the full agreed amount directly from the company.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#50645c]">
            The fixed fee stays the same if the company and driver agree to a different transport price.
          </p>
        </div>
        <div className="rounded-2xl bg-[#edf4ef] p-4 sm:p-5">
          <h3 className="text-base font-bold">How payments work</h3>
          <p className="mt-2 text-sm text-[#50645c]">Pay the driver directly. Pay the booking fee separately under Company Payments, then submit the transaction reference for admin verification.</p>
        </div>
      </section>

      <section aria-labelledby="platform-rules" className="panel grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 id="platform-rules" className="text-2xl font-extrabold tracking-tight">Platform rules</h2>
          <ul className="mt-3 ml-5 list-disc space-y-2 text-sm leading-relaxed text-[#50645c]">
            {rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </div>
        <div className="self-start rounded-2xl bg-[#f7f6f0] p-4 sm:p-5">
          <h3 className="text-lg font-bold">Before accepting a booking</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#50645c]">
            Each party is responsible for verifying shipment details, vehicle documents, transport agreements, and payment terms before accepting a booking.
          </p>
        </div>
      </section>
    </div>
  );
}