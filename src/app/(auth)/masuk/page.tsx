import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthCard title="Masuk" description="Gunakan email dan kata sandi yang diberikan Admin.">
      <LoginForm />
    </AuthCard>
  );
}
