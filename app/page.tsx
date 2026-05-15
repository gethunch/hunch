import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-5xl font-medium tracking-tight">Hunch</h1>
        <p className="text-zinc-400 text-lg">Got a hunch? Prove it.</p>
        <p className="text-sm text-zinc-500">
          A skill-rated weekly stock-picking contest on NIFTY 50.
        </p>
        <Link
          href="/login"
          className="inline-block bg-white text-black rounded-md px-6 py-3 font-medium mt-2"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
