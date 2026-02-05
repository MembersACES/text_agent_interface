import Base1Client from "./Base1Client";

// Server component: reads env at runtime and passes it to the client component.
export default function Base1Page() {
  const base1Url =
    process.env.NEXT_PUBLIC_BASE1_AGENT_URL ||
    process.env.BASE1_AGENT_URL ||
    "";

  const base1Password =
    process.env.NEXT_PUBLIC_BASE1_AGENT_PASSWORD ||
    process.env.BASE1_AGENT_PASSWORD ||
    "";

  // Server-side logging so we can see what Cloud Run actually has
  console.log("[Base1Page] env.NEXT_PUBLIC_BASE1_AGENT_URL:", process.env.NEXT_PUBLIC_BASE1_AGENT_URL);
  console.log("[Base1Page] env.BASE1_AGENT_URL:", process.env.BASE1_AGENT_URL);

  return (
    <Base1Client base1Url={base1Url} base1Password={base1Password} />
  );
}
