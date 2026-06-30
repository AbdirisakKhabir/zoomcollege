import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Sign Up"),
  description: `Sign up for ${BRAND.name}`,
};

export default function SignUp() {
  return <SignUpForm />;
}
