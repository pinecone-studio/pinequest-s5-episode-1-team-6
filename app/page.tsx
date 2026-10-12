import { AuthGate } from "@/components/AuthGate";
import { RhymnastApp } from "@/components/RhymnastApp";

export default function Home() {
  return (
    <AuthGate>
      <RhymnastApp />
    </AuthGate>
  );
}
