import PaddingOracleSimulator from "@/components/attacks/PaddingOracleSimulator";

export const metadata = {
  title: "Padding Oracle Attack Simulator — CryptoViz",
  description:
    "Watch a CBC padding-oracle attack recover plaintext byte-by-byte against a sandboxed oracle, then see the constant-time fix defeat it.",
};

export default function PaddingOracleAttackPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Padding Oracle Attack Simulator</h1>
      <p className="mb-6 max-w-2xl text-slate-600">
        CBC decryption that reports <em>why</em> padding failed — rather than just that it
        failed — leaks enough information to recover an entire ciphertext one byte at a
        time, with no key required. This is the same class of vulnerability behind{" "}
        <strong>POODLE</strong> and several historical TLS/SSL exploits. Paste a
        ciphertext produced by the AES/CBC visualizer, run the attack against the
        vulnerable oracle below, then flip to the fixed, constant-time oracle to see the
        same attack fail.
      </p>
      <PaddingOracleSimulator />
    </main>
  );
}