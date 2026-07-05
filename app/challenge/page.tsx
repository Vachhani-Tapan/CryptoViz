import Navbar from "../../components/layout/Navbar";
import ChallengeMode from "../../components/challenge/ChallengeMode";

export default function ChallengePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8 text-center">Cryptography Challenge</h1>
        <ChallengeMode />
      </main>
    </div>
  );
}
