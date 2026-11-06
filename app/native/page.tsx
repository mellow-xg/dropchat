import AuthGate from "@/components/AuthGate";
import NativeMessenger from "@/components/NativeMessenger";

export default function NativePage() {
  return (
    <AuthGate>
      <NativeMessenger />
    </AuthGate>
  );
}
