import Link from "next/link";

export const metadata = {
  title: "Rules",
  description:
    "How the Hunch contest works — picks, scoring, rating math, fair play.",
};

export default function RulesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight">Rules</h1>
        <p className="text-sm text-zinc-500">
          How a Hunch contest works, what counts as fair play, and how your
          rating moves.
        </p>
      </header>

      <Section title="The contest">
        <p>
          Each contest is a fixed window where you submit a shortlist of
          stocks, then wait for the market to score it. The current format is{" "}
          <Code>weekly_pick_5</Code>.
        </p>
        <Bullets>
          <li>Pick 5 stocks from the NIFTY 50.</li>
          <li>
            Entries open the moment the previous contest resolves (Friday
            15:30 IST) and stay open until Monday 09:15 IST.
          </li>
          <li>
            At Monday 09:15 IST your entry prices are captured — the opening
            prices for each of your 5 stocks.
          </li>
          <li>
            At Friday 15:30 IST the contest resolves on the closing prices for
            those same 5 stocks.
          </li>
        </Bullets>
      </Section>

      <Section title="How you're scored">
        <p>Your contest return is the equal-weight average of your 5 stocks:</p>
        <pre className="text-xs tabular-nums text-zinc-300 bg-zinc-950 border border-zinc-900 rounded-md p-4 overflow-x-auto">
          {`return = mean over (close − open) / open`}
        </pre>
        <p>
          Your rank in the contest is your return position against everyone
          else who entered.
        </p>
      </Section>

      <Section title="How your rating moves">
        <p>
          Every player starts at <Code>1500</Code>. After each contest you
          earn a rating delta based on where you finished, on a piecewise
          percentile curve:
        </p>
        <table className="text-sm tabular-nums border border-zinc-900 rounded-md w-full max-w-sm overflow-hidden">
          <tbody className="divide-y divide-zinc-900">
            <TableRow label="Top 1%" value="+50" tone="positive" />
            <TableRow label="Top 5%" value="+35" tone="positive" />
            <TableRow label="Top 10%" value="+25" tone="positive" />
            <TableRow label="Top 25%" value="+12" tone="positive" />
            <TableRow label="Median (50%)" value="0" />
            <TableRow label="Bottom 25%" value="−12" tone="negative" />
            <TableRow label="Bottom 10%" value="−25" tone="negative" />
            <TableRow label="Bottom 5%" value="−35" tone="negative" />
            <TableRow label="Bottom 1%" value="−50" tone="negative" />
          </tbody>
        </table>
        <p>Two adjustments apply on top of the curve:</p>
        <Bullets>
          <li>
            Contests with fewer than 20 entries multiply the delta by{" "}
            <Code>0.5</Code> — low confidence in the signal.
          </li>
          <li>
            Higher-rated players gain less for the same finish; lower-rated
            players lose less. The ladder gets steeper at the top.
          </li>
        </Bullets>
        <p>
          Rating change is capped at <Code>±50</Code> per contest. No hard
          floor, no ceiling, no decay over time.
        </p>
      </Section>

      <Section title="Fair play">
        <Bullets>
          <li>One entry per user per contest.</li>
          <li>
            You can edit your picks freely until the contest locks. After
            lock, picks are immutable.
          </li>
          <li>
            Phone numbers, emails, and usernames are unique. No alt accounts.
          </li>
          <li>
            Usernames are immutable once set. Names, emails, and avatars are
            editable from your profile.
          </li>
        </Bullets>
      </Section>

      <Section title="What's not allowed">
        <Bullets>
          <li>
            <strong>Shorting.</strong> Picks are long-only.
          </li>
          <li>
            <strong>Allocations.</strong> Every pick carries equal weight
            (1/5 of the portfolio).
          </li>
          <li>
            <strong>Stocks outside the NIFTY 50</strong> for this format.
          </li>
        </Bullets>
      </Section>

      <Section title="Coming formats">
        <p>
          The schema and rating engine are designed to support multiple
          formats — daily contests, fixed-allocation portfolios, variable-N
          shortlists. The rating travels across formats; you carry one number,
          and it gets sharper as you play more.
        </p>
        <p className="text-zinc-500">
          See <Link href="/" className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700">the home page</Link> for what&apos;s next on the roadmap.
        </p>
      </Section>

      <Section title="The reward">
        <p>
          No real money. No prizes. No payouts. The rating is the reward — a
          portable, honest measure of your skill at picking stocks.
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-1.5 list-disc pl-5 marker:text-zinc-700">
      {children}
    </ul>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs tabular-nums bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200">
      {children}
    </code>
  );
}

function TableRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const valueTone =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-zinc-300";
  return (
    <tr>
      <td className="px-3 py-2 text-zinc-400">{label}</td>
      <td className={`px-3 py-2 text-right ${valueTone}`}>{value}</td>
    </tr>
  );
}
